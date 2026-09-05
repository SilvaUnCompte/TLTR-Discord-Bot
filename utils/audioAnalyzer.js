/**
 * Audio analysis helpers for the voice copilot.
 *
 * Every function works on raw signed 16-bit little-endian PCM. The number of
 * interleaved channels matters for the duration maths, so it is always passed
 * explicitly instead of being assumed to be mono.
 */
const { int, float } = require('../lib/env');
const logger = require('../lib/logger');

/** Discord delivers Opus that decodes to 48 kHz. */
const SAMPLE_RATE = 48000;

/** The receiver decodes to stereo; the STT payload is downmixed later. */
const CAPTURE_CHANNELS = 2;

const BYTES_PER_SAMPLE = 2;

/**
 * @param {Buffer} buffer 16-bit PCM.
 * @returns {number} RMS amplitude; higher means louder.
 */
function calculateRMS(buffer) {
    const sampleCount = Math.floor(buffer.length / BYTES_PER_SAMPLE);
    if (sampleCount === 0) return 0;

    let sum = 0;
    for (let offset = 0; offset + 1 < buffer.length; offset += BYTES_PER_SAMPLE) {
        const sample = buffer.readInt16LE(offset);
        sum += sample * sample;
    }
    return Math.sqrt(sum / sampleCount);
}

/**
 * @param {number} byteLength
 * @param {number} channels Number of interleaved channels in the buffer.
 * @returns {number} duration in milliseconds.
 */
function durationMs(byteLength, channels = CAPTURE_CHANNELS) {
    const frames = byteLength / (BYTES_PER_SAMPLE * channels);
    return (frames / SAMPLE_RATE) * 1000;
}

/** @returns {object} the audio thresholds, read from the environment. */
function getAudioConfig() {
    return {
        sampleRate: SAMPLE_RATE,
        channels: CAPTURE_CHANNELS,
        minDuration: int('MIN_SPEECH_DURATION', 800),
        minVolume: float('MIN_VOLUME_THRESHOLD', 500),
        bufferThreshold: int('BUFFER_THRESHOLD', 5000),
        silenceDuration: int('SILENCE_DURATION', 1500),
        maxRecordingDuration: int('MAX_RECORDING_DURATION', 30000),
    };
}

/**
 * Drops the silence before the first audible chunk, keeping a little context.
 * When nothing crosses the threshold the input is returned untouched: deciding
 * that it is silence is the caller's job, through validateAudioQuality.
 * @param {Buffer[]} chunks
 * @returns {Buffer[]}
 */
function removeLeadingSilence(chunks) {
    const { minVolume } = getAudioConfig();
    const firstAudible = chunks.findIndex((chunk) => calculateRMS(chunk) > minVolume);
    if (firstAudible <= 0) return chunks;

    const CONTEXT_CHUNKS = 2;
    return chunks.slice(Math.max(0, firstAudible - CONTEXT_CHUNKS));
}

/**
 * Rejects buffers that are too small, too short or too quiet to be speech.
 * @param {Buffer} audioBuffer Interleaved PCM as captured.
 * @param {number} channels Number of channels in `audioBuffer`.
 * @returns {{ success: boolean, reason: string }}
 */
function validateAudioQuality(audioBuffer, channels = CAPTURE_CHANNELS) {
    const { minDuration, minVolume, bufferThreshold } = getAudioConfig();

    if (audioBuffer.length < bufferThreshold) {
        return {
            success: false,
            reason: `Audio buffer too small: ${audioBuffer.length} < ${bufferThreshold} bytes`,
        };
    }

    const duration = durationMs(audioBuffer.length, channels);
    if (duration < minDuration) {
        return {
            success: false,
            reason: `Speech too short: ${duration.toFixed(0)}ms < ${minDuration}ms`,
        };
    }

    const rms = calculateRMS(audioBuffer);
    logger.debug(`🔊 Audio analysis: RMS=${rms.toFixed(0)}, duration=${duration.toFixed(0)}ms`);

    if (rms <= minVolume) {
        return { success: false, reason: `Audio too quiet: RMS ${rms.toFixed(0)} <= ${minVolume}` };
    }

    return { success: true, reason: 'Audio passed all checks' };
}

/**
 * @param {Buffer[]} chunks
 * @param {number} channels
 * @returns {object} statistics used for the debug log line.
 */
function analyzeAudioChunks(chunks, channels = CAPTURE_CHANNELS) {
    if (chunks.length === 0) {
        return { totalChunks: 0, totalBytes: 0, averageRMS: 0, peakRMS: 0, estimatedDuration: 0 };
    }

    let totalBytes = 0;
    let totalRMS = 0;
    let peakRMS = 0;

    for (const chunk of chunks) {
        totalBytes += chunk.length;
        const rms = calculateRMS(chunk);
        totalRMS += rms;
        peakRMS = Math.max(peakRMS, rms);
    }

    return {
        totalChunks: chunks.length,
        totalBytes,
        averageRMS: totalRMS / chunks.length,
        peakRMS,
        estimatedDuration: durationMs(totalBytes, channels),
    };
}

module.exports = {
    calculateRMS,
    durationMs,
    removeLeadingSilence,
    validateAudioQuality,
    getAudioConfig,
    analyzeAudioChunks,
    SAMPLE_RATE,
    CAPTURE_CHANNELS,
};
