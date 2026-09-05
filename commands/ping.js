const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),

    async execute(interaction) {
        const sent = await interaction.reply({ content: 'Pinging...', withResponse: true });
        const latency = sent.resource.message.createdTimestamp - interaction.createdTimestamp;

        await interaction.editReply(
            `🏓 Pong! Latency is **${latency}**ms. API latency is **${Math.round(interaction.client.ws.ping)}**ms`
        );
    },
};
