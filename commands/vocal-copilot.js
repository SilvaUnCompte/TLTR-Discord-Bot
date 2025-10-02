const { sendDiscordErrorMessage, sendDiscordMessage } = require("../utils/messageHandler");
const { joinVoiceChannel, EndBehaviorType, entersState, VoiceConnectionStatus } = require("@discordjs/voice");
const { sendLLMRequest, GroqMessage } = require("../API/groq");
const { sendSTTRequest } = require("../API/STT");
const { removeLeadingSilence, validateAudioQuality, getAudioConfig, analyzeAudioChunks, SAMPLE_RATE } = require("../utils/audioAnalyzer");
const prism = require("prism-media");

// Track active recordings to prevent duplicates
const activeRecordings = new Set();

async function startCopilot(interaction) {
    try {
        if (!interaction.member.voice.channel) {
            await sendDiscordErrorMessage(interaction, "You need to be in a voice channel to use this command.");
            return;
        }

        await interaction.deferReply();

        const connection = joinVoiceChannel({
            channelId: interaction.member.voice.channel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false
        });

        try {
            await entersState(connection, VoiceConnectionStatus.Ready, 10000);
            await sendDiscordMessage(interaction, "🎤 Successfully joined voice channel! I'm now listening...");
        } catch (error) {
            console.error("Failed to join voice channel:", error);
            await sendDiscordErrorMessage(interaction, "Failed to join voice channel. Please try again.");
            return;
        }

        const receiver = connection.receiver;

        // Remove any existing listeners to prevent accumulation
        receiver.speaking.removeAllListeners("start");

        // Record when a user starts speaking
        receiver.speaking.on("start", async (userId) => {
            // Prevent duplicate recordings for the same user
            if (activeRecordings.has(userId)) {
                console.log(`🔒 User ${userId} already being recorded, skipping...`);
                return;
            }

            activeRecordings.add(userId);
            console.log(`🎤 Starting recording for user ${userId}`);

            try {
                // Wait for transcript from listenToUser
                const transcript = await listenToUser(receiver, userId);

                if (transcript) {
                    console.log(`🗣️ User ${userId} said: "${transcript}"`);

                    // Send transcript to channel
                    await interaction.followUp({
                        content: `🎤 **Transcript:** ${transcript}`,
                        ephemeral: false
                    });

                    // Process with AI (separate method)
                    await processWithAI(transcript, interaction);
                } else {
                    console.log(`🔇 No speech detected for user ${userId}`);
                }
            } catch (error) {
                console.error('Error processing speech:', error);
                await interaction.followUp({
                    content: `❌ Error processing speech: ${error.message}`,
                    ephemeral: true
                });
            } finally {
                // Always remove user from active recordings when done
                activeRecordings.delete(userId);
                console.log(`✅ Finished processing for user ${userId}`);
            }
        });

    } catch (error) {
        console.error("Error in voice copilot:", error);
        await sendDiscordErrorMessage(interaction, "An error occurred while setting up voice recording.");
    }
}

// ====== Listen to user and return transcript (Promise-based) ======
function listenToUser(receiver, userId) {
    return new Promise((resolve, reject) => {
        console.log(`🎤 ${userId} is speaking...`);

        const audioConfig = getAudioConfig();

        const audioStream = receiver.subscribe(userId, {
            end: {
                behavior: EndBehaviorType.AfterSilence,
                duration: audioConfig.silenceDuration,
            },
        });

        const decoder = new prism.opus.Decoder({
            frameSize: 960,
            channels: 2,
            rate: SAMPLE_RATE,
        });

        const audioChunks = [];
        let recordingStartTime = Date.now();

        audioStream.pipe(decoder);

        decoder.on('data', (chunk) => {
            audioChunks.push(chunk);
        });

        decoder.on('end', async () => {
            if (audioChunks.length === 0) return;

            const recordingDuration = Date.now() - recordingStartTime;
            console.log(`✅ Audio recording finished after ${recordingDuration}ms, analyzing audio...`);

            try {

                // Remove leading silence for better analysis
                const cleanedChunks = removeLeadingSilence(audioChunks);
                const audioBuffer = Buffer.concat(cleanedChunks);

                // Get detailed audio analysis
                const analysis = analyzeAudioChunks(audioChunks);
                console.log(`📊 Audio analysis: ${analysis.totalChunks} chunks, ${analysis.totalBytes} bytes, ${recordingDuration}ms`);

                // Use the centralized validation function
                const validation = validateAudioQuality(audioBuffer, recordingDuration);

                if (!validation.success) {
                    console.log(`🔇 ${validation.reason}`);
                    resolve(null);
                    return;
                }

                // Send to STT and resolve with transcript
                const transcript = await sendSTTRequest(audioBuffer);

                // Transcript validation
                if (transcript && transcript.trim().length > 2) {
                    resolve(transcript);
                } else {
                    console.log(`🔇 Transcript too short or empty: "${transcript}"`);
                    resolve(null);
                }

            } catch (error) {
                console.error('STT processing error:', error);
                reject(error);
            }
        });

        decoder.on('error', (error) => {
            console.error('Audio decoder error:', error);
            reject(error);
        });
    });
}

// ====== Separate AI processing method ======
async function processWithAI(transcript, interaction) {
    try {
        console.log("🤖 Processing transcript with AI...");

        const channel = interaction.channel;
        const messages = await channel.messages.fetch({ limit: 25 });
        const botMessages = messages
            .filter(msg => msg.author.id === interaction.client.user.id)
            .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
            .map(msg => GroqMessage.assistant(msg.content));
        const transcriptMessage = GroqMessage.user(transcript);
        const contextMessage = GroqMessage.system("You are a developer assistant. Provide very concise responses.");    

        const response = await sendLLMRequest([...botMessages, contextMessage, transcriptMessage]);

        if (response) {
            await sendDiscordMessage(interaction, response, { prefix: '🤖 **Copilot:** ', useEditReply: false });
        } else {
            console.log("🤖 AI returned no response");
        }
    } catch (error) {
        console.error('AI processing error:', error);
        await sendDiscordErrorMessage(interaction, 'An error occurred while processing the transcript with AI.');
    }
}

module.exports = { startCopilot };