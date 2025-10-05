const { Client, GatewayIntentBits, Collection } = require('discord.js');
const commands = require('./command-list').commands;
const dotenv = require('dotenv');
const errorHandler = require('./utils/errorHandler');

// Load environment variables
dotenv.config();

// Setup global error handlers
process.on('unhandledRejection', (reason, promise) => {
    errorHandler.handleUnhandledRejection(reason, promise);
});

process.on('uncaughtException', (error) => {
    errorHandler.handleUncaughtException(error);
});

// Clean up old logs on startup
errorHandler.cleanupOldLogs();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
    ]
});

// Create a collection to store commands
client.commands = new Collection();

// Store commands in the collection
commands.forEach(command => {
    client.commands.set(command.data.name, command);
});

// When the client is ready, run this code (only once)
client.once('clientReady', () => {
    console.log(`✅ Ready! Logged in as ${client.user.tag}`);
    console.log(`🤖 Bot is in ${client.guilds.cache.size} servers`);
    console.log('📝 Guilds:');
    client.guilds.cache.forEach(guild => {
        console.log(`- ${guild.name} (ID: ${guild.id})`);
    });

    // Display error statistics
    const stats = errorHandler.getErrorStats();
    if (stats) {
        console.log(`📊 Error log files: ${stats.totalFiles} total, ${stats.todayFiles} today`);
    }
});

// Listen for slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        const error = new Error(`Command not found: ${interaction.commandName}`);
        errorHandler.logError(error, { 
            command: interaction.commandName,
            user: `${interaction.user.tag} (${interaction.user.id})`
        }, 'COMMAND_NOT_FOUND');
        return;
    }

    try {
        await command.execute(interaction);
        console.log(`✅ ${interaction.user.tag} executed /${interaction.commandName}`);
    } catch (error) {
        await errorHandler.handleInteractionError(interaction, error);
    }
});

// Enhanced Discord client error handling
client.on('error', error => {
    errorHandler.handleClientError(error, { source: 'Discord Client' });
});

client.on('warn', warning => {
    console.warn('⚠️ Discord Client Warning:', warning);
    errorHandler.logError(new Error(warning), { source: 'Discord Client Warning' }, 'WARNING');
});

client.on('debug', info => {
    // Only log important debug info to avoid spam
    if (info.includes('heartbeat') || info.includes('error') || info.includes('disconnect')) {
        console.debug('🔍 Discord Debug:', info);
    }
});

client.on('disconnect', event => {
    errorHandler.logError(new Error('Discord client disconnected'), { 
        source: 'Discord Client',
        event: event
    }, 'CONNECTION_ERROR');
});

client.on('reconnecting', () => {
    console.log('🔄 Reconnecting to Discord...');
});

client.on('resume', (replayed) => {
    console.log(`🔄 Resumed connection to Discord. Replayed ${replayed} events.`);
});

// Login to Discord with your client's token
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is required in environment variables');
    console.log('Please create a .env file with your bot token');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);