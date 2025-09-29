const { REST, Routes, SlashCommandBuilder } = require('discord.js');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Define the same commands as in index.js
const commands = [
    new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Replies with your input!')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to echo back')
                .setRequired(true)
        ),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong!'),
    new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say something')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('What should the bot say?')
                .setRequired(true)
        )
].map(command => command.toJSON());

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands
async function deployCommands() {
    try {
        console.log('🚀 Started refreshing application (/) commands.');

        if (!process.env.DISCORD_TOKEN) {
            throw new Error('DISCORD_TOKEN is required in environment variables');
        }

        if (!process.env.CLIENT_ID) {
            throw new Error('CLIENT_ID is required in environment variables');
        }

        // For guild-specific commands (faster deployment, good for development)
        if (process.env.GUILD_ID) {
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} guild (/) commands.`);
        } else {
            // For global commands (slower deployment, good for production)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} global (/) commands.`);
            console.log('ℹ️  Global commands may take up to 1 hour to appear in all servers.');
        }
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        process.exit(1);
    }
}

deployCommands();