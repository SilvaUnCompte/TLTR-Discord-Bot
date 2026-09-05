const { Events } = require('discord.js');
const { routeReaction } = require('../features/reactionRouter');

module.exports = {
    name: Events.MessageReactionAdd,
    execute: (reaction, user) => routeReaction(reaction, user, 'add'),
};
