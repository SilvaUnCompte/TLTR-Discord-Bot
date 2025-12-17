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
        async execute(interaction) { await require('./commands/ask').ask(interaction); }
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
    },
    // ========== Config command to manage guild settings ==========
    {
        data: new SlashCommandBuilder()
            .setName('config')
            .setDescription('View or modify bot configuration (Admin only)')
            .addStringOption(option =>
                option.setName('action')
                    .setDescription('Action to perform')
                    .setRequired(true)
                    .addChoices(
                        { name: 'View current settings', value: 'view' },
                        { name: 'Set a setting', value: 'set' },
                        { name: 'Reset to defaults', value: 'reset' },
                        { name: 'List available settings', value: 'list' }
                    )
            )
            .addStringOption(option =>
                option.setName('setting')
                    .setDescription('Setting name to modify')
                    .setRequired(false)
                    .addChoices(
                        { name: 'starboard.channel', value: 'starboard.channel' }
                    )
            )
            .addStringOption(option =>
                option.setName('value')
                    .setDescription('New value for the setting')
                    .setRequired(false)
            ),
        async execute(interaction) { await require('./commands/config').config(interaction); }
    }
];

module.exports = { commands };