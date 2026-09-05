/**
 * Records one utterance from one speaker and returns its transcript.
 */
const prism = require('prism-media');
const { EndBehaviorType } = require('@discordjs/voice');
const {
    removeLeadingSilence,
    validateAudioQuality,
    getAudioConfig,
    analyzeAudioChunks,
    SAMPLE_RATE,
    CAPTURE_CHANNELS,
} = require('../../utils/audioAnalyzer');
const { sendSTTRequest } = require('../../API/STT');
const logger = require('../../lib/logger');

const MIN_TRANSCRIPT_LENGTH = 3;

/**
 * Subscribes to a speaker until they stop talking, then transcribes.
 *
 * The promise settles exactly once: a stream error, a decoder error, the hard
 * recording cap or a normal end all funnel through the same guard, so a broken
 * stream can never leave the caller waiting forever.
 *
 * @param {import('@discordjs/voice').VoiceReceiver} receiver
 * @param {string} userId
 * @returns {Promise<string|null>} the transcript, or null when there is nothing usable.
 */
function recordUtterance(receiver, userId) {
    const config = getAudioConfig();

    return new Promise((resolve) => {
        let settled = false;
        const chunks = [];
        const startedAt = Date.now();

        const audioStream = receiver.subscribe(userId, {
            end: { behavior: EndBehaviorType.AfterSilence, duration: config.silenceDuration },
        });

        const decoder = new prism.opus.Decoder({
            frameSize: 960,
            channels: CAPTURE_CHANNELS,
            rate: SAMPLE_RATE,
        });

        const hardStop = setTimeout(() => {
            logger.debug(`⏱️ Recording cap reached for ${userId}`);
            audioStream.destroy();
        }, config.maxRecordingDuration);

        const finish = (value) => {
            if (settled) return;
            settled = true;
            clearTimeout(hardStop);
            audioStream.destroy();
            decoder.destroy();
            resolve(value);
        };

        const fail = (source) => (error) => {
            logger.error(`❌ ${source} error for ${userId}: ${error.message}`);
            finish(null);
        };

        audioStream.on('error', fail('Audio stream'));
        decoder.on('error', fail('Opus decoder'));
        decoder.on('data', (chunk) => chunks.push(chunk));
        decoder.on('end', () => {
            transcribe(chunks, Date.now() - startedAt).then(finish, (error) => {
                logger.error(`❌ Transcription failed for ${userId}: ${error.message}`);
                finish(null);
            });
        });

        audioStream.pipe(decoder);
    });
}

/**
 * @param {Buffer[]} chunks Raw decoded PCM chunks.
 * @param {number} elapsedMs Wall-clock recording time, for the log line only.
 * @returns {Promise<string|null>}
 */
async function transcribe(chunks, elapsedMs) {
    if (chunks.length === 0) return null;

    const cleaned = removeLeadingSilence(chunks);
    const audioBuffer = Buffer.concat(cleaned);

    const analysis = analyzeAudioChunks(cleaned);
    logger.debug(
        `📊 Audio: ${analysis.totalChunks} chunks, ${analysis.totalBytes} bytes, ` +
            `${analysis.estimatedDuration.toFixed(0)}ms of speech in ${elapsedMs}ms`
    );

    const validation = validateAudioQuality(audioBuffer);
    if (!validation.success) {
        logger.debug(`🔇 ${validation.reason}`);
        return null;
    }

    const transcript = await sendSTTRequest(audioBuffer);
    if (!transcript || transcript.trim().length < MIN_TRANSCRIPT_LENGTH) {
        logger.debug(`🔇 Transcript too short or empty: "${transcript ?? ''}"`);
        return null;
    }
    return transcript.trim();
}

module.exports = { recordUtterance };
