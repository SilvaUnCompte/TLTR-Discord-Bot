/**
 * Registers the slash commands with Discord.
 *
 * With GUILD_ID set the commands are registered for that guild only, which is
 * instant and meant for development. Without it they are registered globally,
 * which can take up to an hour to propagate.
 */
const path = require('path');
const { REST, Routes } = require('discord.js');
const { loadCommands } = require('./lib/loader');
const { requireAll, str } = require('./lib/env');
const logger = require('./lib/logger');

async function deployCommands() {
    requireAll(['DISCORD_TOKEN', 'CLIENT_ID']);

    const commands = loadCommands(path.join(__dirname, 'commands'));
    const body = commands.map((command) => command.data.toJSON());
    const rest = new REST().setToken(process.env.DISCORD_TOKEN);

    logger.info(`🚀 Deploying ${body.length} application command(s)...`);

    const guildId = str('GUILD_ID');
    if (guildId) {
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId),
            {
                body,
            }
        );
        logger.info(`✅ Reloaded ${data.length} guild command(s) for ${guildId} (dev mode).`);
        return;
    }

    const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body });
    logger.info(`✅ Reloaded ${data.length} global command(s).`);
    logger.info('ℹ️ Global commands may take up to an hour to appear everywhere.');
}

deployCommands().catch((error) => {
    logger.fatal(`❌ Error deploying commands: ${error.message}`);
    process.exit(1);
});
