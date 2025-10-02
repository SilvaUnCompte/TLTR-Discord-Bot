const { getAuthClient } = require("../utils/googleAuth");
const { SAMPLE_RATE } = require("../utils/audioAnalyzer");
const fetch = require('node-fetch');
require('dotenv').config();

const STT_API_URL = "https://speech.googleapis.com/v1/speech:recognize";

async function sendSTTRequest(audioBuffer) {
    try {
        // Convert buffer to base64 for Google API
        const base64Audio = audioBuffer.toString('base64');

        // Get OAuth2 access token
        const client = getAuthClient();
        const accessToken = await client.getAccessToken();

        const requestPayload = {
            config: {
                encoding: "LINEAR16",
                sampleRateHertz: SAMPLE_RATE,
                languageCode: "fr-FR",
                alternativeLanguageCodes: ["en-US", "en-GB"],
                audioChannelCount: 2
            },
            audio: { content: base64Audio }
        };

        console.log('Sending STT request with audio size:', audioBuffer.length, 'bytes');

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
            console.log("Transcript:", transcript);
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