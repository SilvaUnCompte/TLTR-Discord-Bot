/**
 * Bot entry point: builds the client, loads commands and events, logs in.
 * Everything else lives in commands/, events/, features/ and lib/.
 */
const path = require('path');
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { loadCommands, registerEvents } = require('./lib/loader');
const errorHandler = require('./utils/errorHandler');
const logger = require('./lib/logger');
const { requireAll } = require('./lib/env');

process.on('unhandledRejection', (reason) => errorHandler.handleUnhandledRejection(reason));
process.on('uncaughtException', (error) => errorHandler.handleUncaughtException(error));

errorHandler.cleanupOldLogs();

try {
    requireAll(['DISCORD_TOKEN']);
} catch (error) {
    logger.fatal(`❌ ${error.message}`);
    logger.fatal('Create a .env file from .env.example before starting the bot.');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions,
    ],
    // Required to receive reaction events on messages that are not cached,
    // for example after a restart. Without them the events never fire.
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

client.commands = new Collection();
for (const command of loadCommands(path.join(__dirname, 'commands'))) {
    client.commands.set(command.data.name, command);
}
logger.info(`📦 Loaded ${client.commands.size} command(s)`);

const listeners = registerEvents(client, path.join(__dirname, 'events'));
logger.info(`📡 Registered ${listeners} event listener(s)`);

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.once(signal, () => {
        logger.info(`👋 Received ${signal}, shutting down`);
        client.destroy().finally(() => process.exit(0));
    });
}

client.login(process.env.DISCORD_TOKEN);
