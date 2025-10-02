require('dotenv').config();

const SAMPLE_RATE = 48000; // Discord audio sample rate

/**
 * Calculate RMS (Root Mean Square) value of audio buffer
 * Higher RMS indicates louder audio
 * @param {Buffer} buffer - Audio buffer
 * @returns {number} RMS value
 */
function calculateRMS(buffer) {
    let sum = 0;
    const samples = buffer.length / 2; // 16-bit samples
    
    for (let i = 0; i < buffer.length; i += 2) {
        const sample = buffer.readInt16LE(i);
        sum += sample * sample;
    }
    
    return Math.sqrt(sum / samples);
}

/**
 * Check if audio buffer contains significant speech content
 * @param {Buffer} buffer - Audio buffer to analyze
 * @param {number} minVolume - Minimum RMS threshold
 * @param {number} minDuration - Minimum duration in milliseconds
 * @returns {boolean} True if audio has significant content
 */
function hasSignificantAudio(buffer, minVolume, minDuration) {
    const rms = calculateRMS(buffer);
    const durationMs = (buffer.length / 2) / (SAMPLE_RATE / 1000);
    
    console.log(`🔊 Audio analysis: RMS=${rms.toFixed(0)}, Duration=${durationMs.toFixed(0)}ms`);
    
    return rms > minVolume && durationMs > minDuration;
}

/**
 * Remove leading silence from audio chunks
 * Keeps some context before speech starts
 * @param {Buffer[]} chunks - Array of audio chunks
 * @returns {Buffer[]} Cleaned audio chunks without leading silence
 */
function removeLeadingSilence(chunks) {
    const minVolumeThreshold = parseFloat(process.env.MIN_VOLUME_THRESHOLD) || 500;
    let startIndex = 0;
    
    // Find first chunk with significant audio
    for (let i = 0; i < chunks.length; i++) {
        const rms = calculateRMS(chunks[i]);
        if (rms > minVolumeThreshold) {
            startIndex = i;
            break;
        }
    }
    
    // Keep some context before speech starts (2 chunks)
    const contextChunks = Math.max(0, startIndex - 2);
    return chunks.slice(contextChunks);
}

/**
 * Validate audio buffer with multiple security checks
 * @param {Buffer} audioBuffer - Combined audio buffer
 * @param {number} recordingDuration - Duration of recording in milliseconds
 * @param {string} userId - User ID for logging
 * @returns {Object} Validation result with success status and reason
 */
function validateAudioQuality(audioBuffer, recordingDuration) {
    // Get security thresholds from environment
    const minDuration = parseInt(process.env.MIN_SPEECH_DURATION) || 800; // ms
    const minVolume = parseFloat(process.env.MIN_VOLUME_THRESHOLD) || 500; // RMS value
    const bufferThreshold = parseInt(process.env.BUFFER_THRESHOLD) || 5000; // bytes

    // Security Check 1: Buffer size
    if (audioBuffer.length < bufferThreshold) {
        return {
            success: false,
            reason: `Audio buffer too small: ${audioBuffer.length} < ${bufferThreshold} bytes`
        };
    }

    // Security Check 2: Recording duration
    if (recordingDuration < minDuration) {
        return {
            success: false,
            reason: `Recording too short: ${recordingDuration}ms < ${minDuration}ms`
        };
    }

    // Security Check 3: Audio volume analysis
    if (!hasSignificantAudio(audioBuffer, minVolume, minDuration)) {
        return {
            success: false,
            reason: 'Audio quality insufficient (volume/duration check failed)'
        };
    }

    return {
        success: true,
        reason: 'Audio passed all security checks'
    };
}

/**
 * Get audio configuration from environment variables
 * @returns {Object} Audio configuration object
 */
function getAudioConfig() {
    return {
        sampleRate: SAMPLE_RATE,
        minDuration: parseInt(process.env.MIN_SPEECH_DURATION) || 800,
        minVolume: parseFloat(process.env.MIN_VOLUME_THRESHOLD) || 500,
        bufferThreshold: parseInt(process.env.BUFFER_THRESHOLD) || 5000,
        silenceDuration: parseInt(process.env.SILENCE_DURATION) || 1500
    };
}

/**
 * Analyze audio chunks and provide detailed statistics
 * @param {Buffer[]} chunks - Array of audio chunks
 * @returns {Object} Audio analysis statistics
 */
function analyzeAudioChunks(chunks) {
    if (chunks.length === 0) {
        return {
            totalChunks: 0,
            totalBytes: 0,
            averageRMS: 0,
            peakRMS: 0,
            estimatedDuration: 0
        };
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
        estimatedDuration: (totalBytes / 2) / (SAMPLE_RATE / 1000) // ms
    };
}

module.exports = {
    calculateRMS,
    hasSignificantAudio,
    removeLeadingSilence,
    validateAudioQuality,
    getAudioConfig,
    analyzeAudioChunks,
    SAMPLE_RATE
};