/**
 * Optimize audio buffer for faster processing
 */
function optimizeAudioBuffer(audioBuffer) {
    // Convert to mono if stereo (reduces size by ~50%)
    const monoBuffer = convertToMono(audioBuffer);
    
    // Apply noise gate to reduce background noise
    const cleanedBuffer = applyNoiseGate(monoBuffer);
    
    return cleanedBuffer;
}

/**
 * Convert stereo audio to mono
 */
function convertToMono(buffer) {
    if (buffer.length < 4) return buffer;
    
    const monoBuffer = Buffer.alloc(buffer.length / 2);
    
    for (let i = 0; i < buffer.length; i += 4) {
        // Average left and right channels (16-bit samples)
        const left = buffer.readInt16LE(i);
        const right = buffer.readInt16LE(i + 2);
        const mono = Math.round((left + right) / 2);
        monoBuffer.writeInt16LE(mono, i / 2);
    }
    
    return monoBuffer;
}

/**
 * Apply simple noise gate
 */
function applyNoiseGate(buffer) {
    const threshold = parseInt(process.env.STT_NOISE_GATE_THRESHOLD) || 500;
    const cleanedBuffer = Buffer.from(buffer);
    
    for (let i = 0; i < buffer.length; i += 2) {
        const sample = buffer.readInt16LE(i);
        if (Math.abs(sample) < threshold) {
            cleanedBuffer.writeInt16LE(0, i); // Silence low-amplitude noise
        }
    }
    
    return cleanedBuffer;
}

module.exports = { optimizeAudioBuffer };