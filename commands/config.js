const { PermissionFlagsBits } = require('discord.js');
const configManager = require('../utils/configManager');

/**
 * View or modify guild configuration
 */
async function config(interaction) {
    const action = interaction.options.getString('action');
    
    // Check if user has admin permissions
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return await interaction.reply({
            content: '❌ You need Administrator permissions to manage bot configuration.',
            ephemeral: true
        });
    }

    const guildId = interaction.guild.id;

    try {
        switch (action) {
            case 'view':
                await viewConfig(interaction, guildId);
                break;
            case 'set':
                await setConfig(interaction, guildId);
                break;
            case 'reset':
                await resetConfig(interaction, guildId);
                break;
            case 'list':
                await listSettings(interaction);
                break;
            default:
                await interaction.reply({
                    content: '❌ Invalid action.',
                    ephemeral: true
                });
        }
    } catch (error) {
        console.error('Error in config command:', error);
        await interaction.reply({
            content: '❌ An error occurred while managing configuration.',
            ephemeral: true
        });
    }
}

/**
 * View current configuration
 */
async function viewConfig(interaction, guildId) {
    const config = configManager.getGuildConfig(guildId);
    console.log('Guild config:', config.starboard);
    
    const embed = {
        color: 0x5865F2,
        title: '⚙️ Guild Configuration',
        fields: [
            {
                name: ':star: Starboard channel',
                value: `${config.starboard.channel ? `${config.starboard.channel}` : 'Not set'}`,
                inline: false
            }
        ],
        footer: {
            text: 'Use `/config set` to modify settings'
        }
    };

    await interaction.reply({ embeds: [embed], ephemeral: false });
}

/**
 * Set a configuration value
 */
async function setConfig(interaction, guildId) {
    const setting = interaction.options.getString('setting');
    const value = interaction.options.getString('value');

    // Parse value (cast int/bool if possible)
    let parsedValue = value;
    if (!isNaN(value)) {
        parsedValue = Number(value);
    } else if (value === 'true') {
        parsedValue = true;
    } else if (value === 'false') {
        parsedValue = false;
    }

    const success = configManager.set(guildId, setting, parsedValue);

    if (success) {
        await interaction.reply({
            content: `✅ Successfully set \`${setting}\` to \`${parsedValue}\``,
            ephemeral: false
        });
    } else {
        await interaction.reply({
            content: `❌ Failed to set \`${setting}\`. Make sure the setting path is valid.`,
            ephemeral: false
        });
    }
}

/**
 * Reset configuration to defaults
 */
async function resetConfig(interaction, guildId) {
    const success = configManager.reset(guildId);

    if (success) {
        await interaction.reply({
            content: '✅ Successfully reset all settings to defaults.',
            ephemeral: false
        });
    } else {
        await interaction.reply({
            content: '❌ Failed to reset configuration.',
            ephemeral: false
        });
    }
}

/**
 * List all available settings
 */
async function listSettings(interaction) {
    const settings = configManager.getAvailableSettings();
    
    const settingsList = settings.map(s => `• \`${s}\``).join('\n');
    
    const embed = {
        color: 0x5865F2,
        title: '📋 Available Settings',
        description: settingsList,
        footer: {
            text: 'Use `/config set <setting> <value>` to modify'
        }
    };

    await interaction.reply({ embeds: [embed], ephemeral: false });
}

module.exports = { config };
