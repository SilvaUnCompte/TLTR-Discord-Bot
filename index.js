const { Client, GatewayIntentBits, Collection, SlashCommandBuilder, REST, Routes } = require('discord.js');
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

// Define slash commands
const commands = [
    {
        data: new SlashCommandBuilder()
            .setName('echo')
            .setDescription('Replies with your input!')
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('The message to echo back')
                    .setRequired(true)
            ),
        async execute(interaction) {
            const message = interaction.options.getString('message');
            await interaction.reply(`You said: ${message}`);
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Replies with Pong!'),
        async execute(interaction) {
            const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
            const latency = sent.createdTimestamp - interaction.createdTimestamp;
            await interaction.editReply(`🏓 Pong! Latency is ${latency}ms. API Latency is ${Math.round(client.ws.ping)}ms`);
        }
    },
    {
        data: new SlashCommandBuilder()
            .setName('say')
            .setDescription('Make the bot say something')
            .addStringOption(option =>
                option.setName('text')
                    .setDescription('What should the bot say?')
                    .setRequired(true)
            ),
        async execute(interaction) {
            const text = interaction.options.getString('text');
            await interaction.reply({
                content: text,
                allowedMentions: { parse: [] } // Prevent mentions for security
            });
        }
    }
];

// Store commands in the collection
commands.forEach(command => {
    client.commands.set(command.data.name, command);
});

// When the client is ready, run this code (only once)
client.once('ready', () => {
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
        console.log(`✅ ${interaction.user.tag} executed /${interaction.commandName}`);
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