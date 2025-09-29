const { REST, Routes } = require('discord.js');
const dotenv = require('dotenv');
const { commands: commandsWithExecute } = require('./command-list');
dotenv.config();

const commandsJSON = commandsWithExecute.map(command => command.data.toJSON());

// Deploy commands
async function deployCommands() {
    try {
        console.log('🚀 Started refreshing application (/) commands.');

        if (!process.env.DISCORD_TOKEN) throw new Error('DISCORD_TOKEN is required in environment variables');

        if (!process.env.CLIENT_ID) throw new Error('CLIENT_ID is required in environment variables');

        // For guild-specific commands (faster deployment, good for development)
        if (process.env.GUILD_ID) {
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), { body: commandsJSON },
            );

            console.log(`✅ Successfully reloaded ${data.length} guild (/) commands (Dev mode).`);

        } else {
            // For global commands (slower deployment, good for production)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsJSON },
            );

            console.log(`✅ Successfully reloaded ${data.length} global (/) commands.`);
            console.log('ℹ️ Global commands may take up to 1 hour to appear in all servers.');
        }
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
        process.exit(1);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

deployCommands();