/**
 * Routes reaction events to the feature that handles the emoji.
 *
 * A single map keeps the emoji-to-feature association in one place; adding a
 * reaction-driven feature means adding one entry.
 */
const { STAR_EMOJI } = require('../lib/constants');
const { handleStarChange } = require('./starboard');
const logger = require('../lib/logger');

/** @type {Map<string, (reaction: object, user: object) => Promise<void>>} */
const HANDLERS = new Map([[STAR_EMOJI, handleStarChange]]);

/**
 * @param {import('discord.js').MessageReaction} reaction
 * @param {import('discord.js').User} user
 * @param {'add'|'remove'} action
 */
async function routeReaction(reaction, user, action) {
    try {
        if (user.bot) return;

        const handler = HANDLERS.get(reaction.emoji?.name);
        if (!handler) return;

        logger.debug(
            `🔔 ${user.tag} ${action === 'add' ? 'added' : 'removed'} ` +
                `${reaction.emoji.name} on message ${reaction.message?.id}`
        );

        await handler(reaction, user);
    } catch (error) {
        logger.error(`❌ Error handling a reaction (${action}): ${error.message}`);
    }
}

module.exports = { routeReaction };
