/**
 * Google Speech-to-Text, called over REST.
 *
 * The official client library is not used on purpose: the request is a single
 * synchronous recognize call, and the REST payload is easier to tune. Node's
 * global fetch is used, so no HTTP dependency is needed.
 */
const { getAccessToken } = require('../utils/googleAuth');
const { optimizeAudioBuffer } = require('../utils/audioOptimizer');
const { SAMPLE_RATE } = require('../utils/audioAnalyzer');
const logger = require('../lib/logger');
const { int, str } = require('../lib/env');

const STT_API_URL = 'https://speech.googleapis.com/v1/speech:recognize';

/**
 * @param {Buffer} audioBuffer Interleaved stereo 16-bit PCM as captured.
 * @returns {Promise<string|null>} the transcript, or null when nothing usable came back.
 */
async function sendSTTRequest(audioBuffer) {
    try {
        const optimized = optimizeAudioBuffer(audioBuffer);

        const payload = {
            config: {
                encoding: 'LINEAR16',
                sampleRateHertz: SAMPLE_RATE,
                languageCode: str('STT_LANGUAGE', 'fr-FR'),
                alternativeLanguageCodes: ['en-US', 'en-GB'],
                audioChannelCount: 1,
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: false,
                model: 'latest_short',
                useEnhanced: true,
                profanityFilter: false,
            },
            audio: { content: optimized.toString('base64') },
        };

        logger.debug(
            `🚀 STT request: ${optimized.length} bytes (from ${audioBuffer.length} bytes)`
        );

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), int('STT_TIMEOUT', 15000));

        let response;
        try {
            response = await fetch(STT_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${await getAccessToken()}`,
                },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timeout);
        }

        const body = await response.json().catch(() => null);

        if (!response.ok || body?.error) {
            logger.error(
                `❌ Google STT API error (${response.status}): ${body?.error?.message ?? 'unknown'}`
            );
            return null;
        }

        const alternative = body?.results?.[0]?.alternatives?.[0];
        if (!alternative?.transcript) {
            logger.debug('🔇 No transcription in the STT response');
            return null;
        }

        const confidence = ((alternative.confidence ?? 0) * 100).toFixed(1);
        logger.info(`📝 Transcript (confidence ${confidence}%): ${alternative.transcript}`);
        return alternative.transcript;
    } catch (error) {
        if (error.name === 'AbortError') {
            logger.error('❌ STT request timed out');
        } else {
            logger.error(`❌ Error in sendSTTRequest: ${error.message}`);
        }
        return null;
    }
}

module.exports = { sendSTTRequest };
