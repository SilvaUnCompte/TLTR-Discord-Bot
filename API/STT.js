const { getAuthClient } = require("../utils/googleAuth");
const { optimizeAudioBuffer } = require("../utils/audioOptimizer");
const { SAMPLE_RATE } = require("../utils/audioAnalyzer");
const fetch = require('node-fetch');
require('dotenv').config();

const STT_API_URL = "https://speech.googleapis.com/v1/speech:recognize";

async function sendSTTRequest(audioBuffer) {
    try {
        // Optimize audio buffer (reduce size if needed)
        const optimizedBuffer = optimizeAudioBuffer(audioBuffer);
        
        // Convert buffer to base64 for Google API
        const base64Audio = optimizedBuffer.toString('base64');

        // Get OAuth2 access token
        const client = getAuthClient();
        const accessToken = await client.getAccessToken();

        const requestPayload = {
            config: {
                encoding: "LINEAR16",
                sampleRateHertz: SAMPLE_RATE,
                languageCode: "fr-FR",
                alternativeLanguageCodes: ["en-US", "en-GB"],
                audioChannelCount: 1, // Mono for better performance
                // Performance optimizations
                enableAutomaticPunctuation: true,
                enableWordTimeOffsets: false, // Reduces response size
                model: "latest_short", // Optimized for short audio
                useEnhanced: true, // Better accuracy
                // Profanity filtering
                profanityFilter: false
            },
            audio: { content: base64Audio }
        };

        console.log('🚀 Sending optimized STT request with audio size:', optimizedBuffer.length, 'bytes (original:', audioBuffer.length, 'bytes)');

        const response = await fetch(STT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken.token}`
            },
            body: JSON.stringify(requestPayload)
        });

        const responseText = await response.text();
        let sttResponse;

        try {
            sttResponse = JSON.parse(responseText);
        } catch (e) {
            console.warn("JSON parsing error:", e);
            console.warn("Response text:", responseText);
            return null;
        }

        if (sttResponse.error) {
            console.error("Google STT API error:", sttResponse.error);
            return null;
        }

        if (sttResponse.results && sttResponse.results.length > 0 &&
            sttResponse.results[0].alternatives && sttResponse.results[0].alternatives.length > 0) {
            const transcript = sttResponse.results[0].alternatives[0].transcript;
            const confidence = sttResponse.results[0].alternatives[0].confidence || 0;
            
            console.log(`📝 Transcript (confidence: ${(confidence * 100).toFixed(1)}%):`, transcript);
                        
            return transcript;
        } else {
            console.warn("No transcription found in the STT response");
            console.log("Full response:", JSON.stringify(sttResponse, null, 2));
            return null;
        }

    } catch (error) {
        console.error('Error in sendSTTRequest:', error);
        return null;
    }
}

module.exports = { sendSTTRequest };