const { sendLLMRequest, GroqMessage } = require("../API/groq");
const { sendDiscordErrorMessage, sendDiscordMessage } = require("../utils/messageHandler");

async function ask(interaction) {
    try {
        await interaction.deferReply(); // Indicates that the response may take some time

        const userQuestion = interaction.options.getString('question');
        if (!userQuestion || userQuestion.trim().length === 0) {
            await sendDiscordErrorMessage(interaction, 'Please provide a valid question.');
            return;
        }

        // Gather context from the channel (last 20 messages)
        const channel = interaction.channel;
        const fetchedMessages = await channel.messages.fetch({ limit: 20 });
        const contextMessages = Array.from(fetchedMessages.values())
            .reverse() // Oldest first
            .map(msg => GroqMessage.fromDiscordMessage(msg));

        // Gathered information about the user and the server
        const { userInfo, serverInfo } = await gatherDiscordInfo(interaction);

        const systemMessage = GroqMessage.system(`You are a helpful assistant on a discord server. Answer the user's question clearly and concisely. ${userInfo}. ${serverInfo}.`);

        // Prepare messages for the AI
        const messages = [...contextMessages, systemMessage, GroqMessage.user(userQuestion)];

        // Send the request to the AI
        const response = await sendLLMRequest(messages, 800);

        // Send the response
        await sendDiscordMessage(interaction, `<@${interaction.user.id}> said: ${userQuestion}`);
        await sendDiscordMessage(interaction, `${response}`, { useEditReply: false });

    } catch (error) {
        console.error('Error deferring reply in ask:', error);
        await sendDiscordErrorMessage(interaction, 'An error occurred while processing your request.');
        return;
    }
}

function gatherDiscordInfo(interaction) {
    const user = interaction.user;
    const member = interaction.member;
    const guild = interaction.guild;

    // User Info
    const userInfo = `User Info: Username: ${user.username}, Discriminator: ${user.discriminator}, ID: ${user.id}, Joined Server: ${member?.joinedAt ? member.joinedAt.toISOString() : 'N/A'}, Roles: ${member?.roles.cache.map(role => role.name).join(', ') || 'None'}`;

    // Server Info
    let serverInfo = "";
    if (guild) {
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence && m.presence.status !== 'offline').size;
        const moderators = guild.members.cache
            .filter(m => m.permissions.has('ManageMessages') || m.permissions.has('Administrator'))
            .map(m => m.user.tag)
            .join(', ') || 'None';
        const serverOwner = guild.ownerId ? `<@${guild.ownerId}>` : 'N/A';
        const createdAt = guild.createdAt.toISOString();
        const channels = guild.channels.cache
            .filter(ch => ch.type === 0 || ch.type === 5 || ch.type === 2 || ch.type === 15) // 0: text, 5: announcement, 2: voice, 15: forum
            .map(ch => `${ch.name}${ch.topic ? ` (${ch.topic})` : ''}`)
            .join('; ') || 'None';
        serverInfo = `Server Info: Name: ${guild.name}, ID: ${guild.id}, Owner: ${serverOwner}, Created At: ${createdAt}, Total Members: ${totalMembers}, Online Members: ${onlineMembers}, Moderators: ${moderators}, Channels: ${channels}`;
    }

    return { userInfo, serverInfo };
}

module.exports = { ask };