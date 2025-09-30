const { SlashCommandBuilder } = require('discord.js');

const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('echo')
            .setDescription('Replies with your input!')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The message to echo back')
                    .setRequired(true)
            ),
        async execute(interaction) {
            const message = interaction.options.getString('message');
            await interaction.reply(`You said: ${message}`);
        }
    },
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
                allowedMentions: { parse: [] } // Prevent mentions for security
            });
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('tltr')
            .setDescription('Too Long; Too Read - Summarize or conversation with AI')
            .addStringOption(option =>
                option.setName('limit')
                    .setDescription('Number of messages to consider (default 25, max 100)')
                    .setRequired(false)
            ),
        async execute(interaction) { await require('./commands/tltr').tltr(interaction); }
    }
];

module.exports = { commands };