const { Events, MessageFlags } = require('discord.js');
const errorHandler = require('../utils/errorHandler');
const logger = require('../lib/logger');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) {
            errorHandler.logError(
                new Error(`Command not found: ${interaction.commandName}`),
                {
                    command: interaction.commandName,
                    user: `${interaction.user.tag} (${interaction.user.id})`,
                },
                'COMMAND_NOT_FOUND'
            );
            return;
        }

        if (command.cooldown) {
            const { allowed, retryTimestamp } = command.cooldown.check(interaction);
            if (!allowed) {
                await interaction.reply({
                    content:
                        `⏳ \`/${interaction.commandName}\` is on cooldown ` +
                        `(${command.cooldown.describe()}). Try again <t:${retryTimestamp}:R>.`,
                    flags: MessageFlags.Ephemeral,
                });
                return;
            }
            // Reserve the slot before the work starts, so a slow command cannot
            // be fired twice in parallel.
            command.cooldown.start(interaction);
        }

        try {
            await command.execute(interaction);
            logger.info(`✅ ${interaction.user.tag} ran /${interaction.commandName}`);
        } catch (error) {
            command.cooldown?.clear(interaction);
            await errorHandler.handleInteractionError(interaction, error);
        }
    },
};
