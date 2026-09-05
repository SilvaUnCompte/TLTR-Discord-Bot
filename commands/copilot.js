const {
    SlashCommandBuilder,
    InteractionContextType,
    PermissionFlagsBits,
    MessageFlags,
} = require('discord.js');
const { startSession, stopSession, getSession } = require('../features/voice/copilotSession');
const { sendDiscordErrorMessage } = require('../utils/messageHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('copilot')
        .setDescription('Join your voice channel and answer what you say. Run again to leave.')
        .setContexts(InteractionContextType.Guild),

    async execute(interaction) {
        const voiceChannel = interaction.member?.voice?.channel;
        const running = getSession(interaction.guildId);

        // Second call: the command doubles as the way to make the bot leave.
        if (running) {
            stopSession(interaction.guildId, `stopped by ${interaction.user.tag}`);
            await interaction.reply('👋 Left the voice channel.');
            return;
        }

        if (!voiceChannel) {
            await interaction.reply({
                content: '❌ You need to be in a voice channel to use this command.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const permissions = voiceChannel.permissionsFor(interaction.guild.members.me);
        if (!permissions?.has(PermissionFlagsBits.Connect)) {
            await interaction.reply({
                content: '❌ I am not allowed to join that voice channel.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply();

        try {
            await startSession(voiceChannel, interaction.channel);
        } catch {
            await sendDiscordErrorMessage(
                interaction,
                'Failed to join the voice channel. Please try again.'
            );
            return;
        }

        await interaction.editReply(
            [
                `🎤 Listening in **${voiceChannel.name}**.`,
                '',
                '⚠️ Everything said in that channel is transcribed and posted here.',
                'Run `/copilot` again to stop, or leave the channel and I will follow.',
            ].join('\n')
        );
    },
};
