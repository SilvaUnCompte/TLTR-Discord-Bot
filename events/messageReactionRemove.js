const { Events } = require('discord.js');
const { routeReaction } = require('../features/reactionRouter');

module.exports = {
    name: Events.MessageReactionRemove,
    execute: (reaction, user) => routeReaction(reaction, user, 'remove'),
};
