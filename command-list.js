const { SlashCommandBuilder } = require('discord.js');

const commands = [
    // ========== Ping command to check bot responsiveness ==========
    {
        data: new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Replies with Pong!'),
        async execute(interaction) {
            const sent = await interaction.reply({ content: 'Pinging...', withResponse: true });
            const latency = sent.resource.message.createdTimestamp - interaction.createdTimestamp;
            await interaction.editReply(`🏓 Pong! Latency is **${latency}**ms. API Latency is **${Math.round(interaction.client.ws.ping)}**ms`);
        }
    },
    // ========== Ask command to make the bot answer a message ==========
    {
        data: new SlashCommandBuilder()
            .setName('ask')
            .setDescription('Make the bot answer a question')
            .addStringOption(option =>
                option.setName('question')
                    .setDescription('What question do you want to ask?')
                    .setRequired(true)
            ),
        async execute(interaction) { await require('./commands/ask').ask(interaction);}
    },
    // ========== TLTR command to summarize recent messages ==========
    {
        data: new SlashCommandBuilder()
            .setName('tltr')
            .setDescription('Too Long; Too Read - Summarize a conversation with AI')
            .addStringOption(option =>
                option.setName('limit')
                    .setDescription('Number of messages to consider (default 25, max 100)')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option.setName('tone')
                    .setDescription('Choose the tone of the summary (default: Normal)')
                    .setRequired(false)
                    .addChoices(
                        { name: 'Normal', value: 'normal' },
                        { name: 'Sarcastic', value: 'sarcastic' },
                        { name: 'Formal', value: 'formal' },
                        { name: 'Friendly', value: 'friendly' },
                        { name: 'Concise', value: 'concise' }
                    )
            ),
        async execute(interaction) { await require('./commands/tltr').tltr(interaction); }
    },
    // ========== Vocal Copilot command to assist in voice channels ==========
    {
        data: new SlashCommandBuilder()
            .setName('copilot')
            .setDescription('Join the voice channel to assist you. Start talking to discuss.'),
        async execute(interaction) { await require('./commands/vocal-copilot').startCopilot(interaction); }
    },
    // ========== Debug Info command to show error statistics ==========
    {
        data: new SlashCommandBuilder()
            .setName('debuginfo')
            .setDescription('Show bot error statistics and debug information'),
        async execute(interaction) { await require('./commands/debuginfo').debuginfo(interaction); }
    }
];

module.exports = { commands };