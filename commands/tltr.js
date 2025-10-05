const { sendLLMRequest, GroqMessage } = require("../API/groq");
const { sendDiscordErrorMessage, sendDiscordMessage } = require("../utils/messageHandler");
const errorHandler = require("../utils/errorHandler");

async function tltr(interaction) {
    try {
        await interaction.deferReply(); // Indicates that the response may take some time

        // Get limit option or default to 25
        const defaultLimit = 25;
        let rawLimit = interaction.options.getString('limit') || defaultLimit.toString();
        let limit = parseInt(rawLimit, 10);
        if (isNaN(limit)) limit = defaultLimit;
        limit = Math.max(1, Math.min(limit, 100)); // Clamp between 1 and 100

        // Get tone option or default to 'normal'
        const tone = interaction.options.getString('tone') || 'normal';
        const toneInstructions = {
            normal: "",
            sarcastic: "Use a very sarcastic and ironic tone in the summary.",
            formal: "Write the summary in a very formal tone.",
            friendly: "Make the summary sound very friendly and approachable.",
            concise: "Keep the summary really short and to the point."
        }[tone];

        // Add system message for context
        const systemMessage = GroqMessage.system("You are an assistant that summarizes conversations. Make SHORT and CONCISE summaries (maximum 300 words). Use a natural tone in the language of the conversation. Focus on key points and the general atmosphere. " + toneInstructions);

        // Get last messages in the channel
        const channel = interaction.channel;
        const fetchedMessages = await channel.messages.fetch({ limit: limit });
        if (!fetchedMessages || fetchedMessages.size === 0) {
            await sendDiscordErrorMessage(interaction, 'Sorry, I couldn\'t find any messages in this channel.');
            return;
        }

        // Prepare messages for the AI
        const messages = [systemMessage, ...Array.from(fetchedMessages.values()).reverse().map(msg => GroqMessage.fromDiscordMessage(msg))];

        // Send the request to the AI
        const response = await sendLLMRequest(messages, 600);

        // Send the response
        await sendDiscordMessage(interaction, response, { prefix: '🤖 **TLTR:** ' });

    } catch (error) {
        console.error('Error in tltr:', error);
        await sendDiscordErrorMessage(interaction, 'An error occurred while processing your request.');
    }
}

module.exports = { tltr };