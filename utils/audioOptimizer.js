/**
 * Prepares the captured PCM for the speech-to-text request: stereo to mono
 * (halves the payload) and a noise gate on the quietest samples.
 */
const { int } = require('../lib/env');

const BYTES_PER_SAMPLE = 2;

/**
 * @param {Buffer} audioBuffer Interleaved stereo 16-bit PCM.
 * @returns {Buffer} mono 16-bit PCM.
 */
function optimizeAudioBuffer(audioBuffer) {
    return applyNoiseGate(convertToMono(audioBuffer));
}

/**
 * Averages the two channels of an interleaved stereo buffer.
 * @param {Buffer} buffer
 * @returns {Buffer}
 */
function convertToMono(buffer) {
    const frameSize = BYTES_PER_SAMPLE * 2;
    const frames = Math.floor(buffer.length / frameSize);
    if (frames === 0) return buffer;

    const mono = Buffer.alloc(frames * BYTES_PER_SAMPLE);
    for (let frame = 0; frame < frames; frame += 1) {
        const offset = frame * frameSize;
        const left = buffer.readInt16LE(offset);
        const right = buffer.readInt16LE(offset + BYTES_PER_SAMPLE);
        mono.writeInt16LE(Math.round((left + right) / 2), frame * BYTES_PER_SAMPLE);
    }
    return mono;
}

/**
 * Zeroes samples below the configured amplitude, which removes most of the
 * constant background hiss before the audio is sent for transcription.
 * @param {Buffer} buffer
 * @returns {Buffer}
 */
function applyNoiseGate(buffer) {
    const threshold = int('STT_NOISE_GATE_THRESHOLD', 500);
    const gated = Buffer.from(buffer);

    for (let offset = 0; offset + 1 < buffer.length; offset += BYTES_PER_SAMPLE) {
        if (Math.abs(buffer.readInt16LE(offset)) < threshold) {
            gated.writeInt16LE(0, offset);
        }
    }
    return gated;
}

module.exports = { optimizeAudioBuffer, convertToMono, applyNoiseGate };
