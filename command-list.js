const { SlashCommandBuilder } = require('discord.js');

const commands = [
    // ========== Ping command to check bot responsiveness ==========
    {
        data: new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Replies with Pong!'),
        async execute(interaction) {
            const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            await interaction.editReply(`🏓 Pong! Latency is ${latency}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
        }
    },
    // ========== Say command to make the bot repeat a message ==========
    {
        data: new SlashCommandBuilder()
            .setName('say')
            .setDescription('Make the bot say something')
            .addStringOption(option =>
                option.setName('text')
                    .setDescription('What should the bot say?')
                    .setRequired(true)
            ),
        async execute(interaction) {
            const text = interaction.options.getString('text');
            await interaction.reply({
                content: text,
                allowedMentions: { parse: [] }
            });
        }
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
            ),
        async execute(interaction) { await require('./commands/tltr').tltr(interaction); }
    },
    // ========== Vocal Copilot command to assist in voice channels ==========
    {
        data: new SlashCommandBuilder()
            .setName('copilot')
            .setDescription('Join the voice channel to assist you. Start with "Copilot..." to discuss.'),
        async execute(interaction) { await require('./commands/vocal-copilot').startCopilot(interaction); }
    }
];

module.exports = { commands };