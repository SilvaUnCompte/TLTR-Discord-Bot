const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    InteractionContextType,
    ChannelType,
} = require('discord.js');
const configManager = require('../utils/configManager');
const { EMBED_COLOR } = require('../lib/constants');
const { extractId } = require('../lib/snowflake');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('View or modify the bot configuration')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .setContexts(InteractionContextType.Guild)
        .addSubcommand((sub) => sub.setName('view').setDescription('Show the current settings'))
        .addSubcommand((sub) => sub.setName('list').setDescription('List the available settings'))
        .addSubcommand((sub) =>
            sub.setName('reset').setDescription('Reset every setting to its default')
        )
        .addSubcommand((sub) =>
            sub
                .setName('starboard-channel')
                .setDescription('Set the channel starred messages are mirrored to')
                .addChannelOption((option) =>
                    option
                        .setName('channel')
                        .setDescription('Target channel (leave empty to disable)')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
                        .setRequired(false)
                )
        )
        .addSubcommand((sub) =>
            sub
                .setName('starboard-threshold')
                .setDescription('Set how many stars a message needs')
                .addIntegerOption((option) =>
                    option
                        .setName('stars')
                        .setDescription('Number of stars (1 or more)')
                        .setMinValue(1)
                        .setMaxValue(50)
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        // setDefaultMemberPermissions can be overridden per guild, so the check
        // is repeated here rather than trusted.
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({
                content: '❌ You need the Administrator permission to manage the configuration.',
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const guildId = interaction.guildId;

        switch (interaction.options.getSubcommand()) {
            case 'view':
                return viewConfig(interaction, guildId);
            case 'list':
                return listSettings(interaction);
            case 'reset':
                return applyChange(
                    interaction,
                    configManager.reset(guildId),
                    'Settings reset to defaults.'
                );
            case 'starboard-channel': {
                const channel = interaction.options.getChannel('channel');
                const result = configManager.set(guildId, 'starboard.channel', channel?.id ?? '');
                return applyChange(
                    interaction,
                    result,
                    channel
                        ? `Starboard channel set to ${channel}.`
                        : 'Starboard disabled (no channel set).'
                );
            }
            case 'starboard-threshold': {
                const stars = interaction.options.getInteger('stars');
                const result = configManager.set(guildId, 'starboard.threshold', stars);
                return applyChange(
                    interaction,
                    result,
                    `Starboard threshold set to ${stars} star(s).`
                );
            }
            default:
                await interaction.reply({
                    content: '❌ Unknown subcommand.',
                    flags: MessageFlags.Ephemeral,
                });
        }
    },
};

async function applyChange(interaction, result, successMessage) {
    await interaction.reply({
        content: result.success ? `✅ ${successMessage}` : `❌ ${result.reason}.`,
        flags: result.success ? undefined : MessageFlags.Ephemeral,
    });
}

async function viewConfig(interaction, guildId) {
    const config = configManager.getGuildConfig(guildId);
    // Older configurations stored a mention rather than a bare ID.
    const channelId = extractId(config.starboard.channel);

    await interaction.reply({
        embeds: [
            {
                color: EMBED_COLOR,
                title: '⚙️ Guild configuration',
                fields: [
                    {
                        name: 'Starboard channel',
                        value: channelId ? `<#${channelId}>` : 'Not set',
                        inline: true,
                    },
                    {
                        name: 'Starboard threshold',
                        value: `${config.starboard.threshold} star(s)`,
                        inline: true,
                    },
                ],
                footer: { text: 'Use /config starboard-channel or /config starboard-threshold' },
            },
        ],
    });
}

async function listSettings(interaction) {
    await interaction.reply({
        embeds: [
            {
                color: EMBED_COLOR,
                title: '📋 Available settings',
                description: configManager
                    .getAvailableSettings()
                    .map((setting) => `- \`${setting}\``)
                    .join('\n'),
            },
        ],
    });
}
