const { Client, GatewayIntentBits, Collection } = require('discord.js');
const commands = require('./command-list').commands;
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
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
});

// Listen for slash command interactions
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
        console.log(`> ${interaction.user.tag} executed /${interaction.commandName}`);
    } catch (error) {
        console.error('Error executing command:', error);

        const errorMessage = 'There was an error while executing this command!';

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// Error handling
client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is required in environment variables');
    console.log('Please create a .env file with your bot token');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN);