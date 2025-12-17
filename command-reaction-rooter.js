const starboardManager = require("./commands/starboard");

async function reactionRooter(reaction_orig, user) {
    console.log(`🔔 ${user.tag} reacted with ${reaction_orig.emoji.name} on \`${reaction_orig.message}\``);

    try {
        // Ignore bot reactions & messages
        if (user.bot || reaction_orig.message.author?.bot) return;

        if (reaction_orig.emoji.name === '⭐') {
            await starboardManager.handleStarChange(reaction_orig, user);
        }
    } catch (error) {
        console.error('❌ Error handling reaction:', error);
    }
}

async function reactionRemoveRooter(reaction_orig, user) {
    console.log(`🔕 ${user.tag} removed ${reaction_orig.emoji.name} on \`${reaction_orig.message}\``);

    try {
        if (user.bot) return;

        if (reaction_orig.emoji.name === '⭐') {
            await starboardManager.handleStarChange(reaction_orig, user);
        }
    } catch (error) {
        console.error('❌ Error handling reaction removal:', error);
    }
}

module.exports = { reactionRooter, reactionRemoveRooter };