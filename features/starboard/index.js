/**
 * Starboard: mirrors messages that reach a star threshold into a dedicated
 * channel, and keeps the mirror in sync when stars are added or removed.
 */
const configManager = require('../../utils/configManager');
const errorHandler = require('../../utils/errorHandler');
const logger = require('../../lib/logger');
const { STAR_EMOJI } = require('../../lib/constants');
const { extractId } = require('../../lib/snowflake');
const { getEntry, setEntry, deleteEntry } = require('./storage');
const { buildStarContent, buildStarEmbed } = require('./render');

/** Up to 300 recent starboard messages are scanned when recovering a mapping. */
const SCAN_PAGES = 3;

/** Bounded cache of source messages already scanned for, oldest evicted first. */
const SCANNED_LIMIT = 1000;
const scanned = new Set();

/**
 * One in-flight operation per source message. Two stars landing at the same
 * millisecond used to both miss the mapping and post two mirrors.
 * @type {Map<string, Promise<void>>}
 */
const inFlight = new Map();

function rememberScan(key) {
    if (scanned.size >= SCANNED_LIMIT) {
        scanned.delete(scanned.values().next().value);
    }
    scanned.add(key);
}

/** @returns {Promise<import('discord.js').TextChannel|null>} */
async function resolveStarboardChannel(guild) {
    const channelId = extractId(configManager.get(guild.id, 'starboard.channel'));
    if (!channelId) return null;

    const channel =
        guild.channels.cache.get(channelId) ||
        (await guild.channels.fetch(channelId).catch(() => null));

    return channel?.isTextBased?.() ? channel : null;
}

/** Fetches whatever the gateway sent as a partial. */
async function resolvePartials(reaction) {
    try {
        if (reaction.partial) reaction = await reaction.fetch();
        if (reaction.message?.partial) await reaction.message.fetch();
    } catch (error) {
        logger.debug(`⚠️ Could not resolve reaction partials: ${error.message}`);
    }
    return reaction;
}

/**
 * Counts the stars that make a message eligible, excluding the author's own.
 * @returns {Promise<number>}
 */
async function countStars(message) {
    const reaction =
        message.reactions?.resolve?.(STAR_EMOJI) || message.reactions?.cache?.get?.(STAR_EMOJI);
    if (!reaction) return 0;

    const authorId = message.author?.id;
    if (!authorId) return reaction.count ?? 0;

    // The users cache is only complete after a fetch; without it a self-star
    // would silently count towards the threshold.
    const users = await reaction.users.fetch().catch(() => null);
    if (!users) return reaction.count ?? 0;

    return users.filter((user) => user.id !== authorId && !user.bot).size;
}

/**
 * Recovers a starboard post when the mapping is gone (wiped configs, read-only
 * disk, bot moved) by looking for the source id inside our own posts.
 */
async function scanForExistingPost(starboardChannel, sourceMessageId) {
    const selfId = starboardChannel.client?.user?.id;
    let before;

    try {
        for (let page = 0; page < SCAN_PAGES; page += 1) {
            const batch = await starboardChannel.messages.fetch({
                limit: 100,
                ...(before ? { before } : {}),
            });
            if (!batch || batch.size === 0) return null;

            const hit = batch.find(
                (message) =>
                    (!selfId || message.author?.id === selfId) &&
                    message.content?.includes(sourceMessageId)
            );
            if (hit) return hit;

            if (batch.size < 100) return null;
            before = batch.lastKey();
        }
    } catch (error) {
        logger.error(`❌ [starboard] Scan failed: ${error.message}`);
    }
    return null;
}

async function findExistingPost(starboardChannel, sourceMessageId) {
    const guildId = starboardChannel.guild.id;

    const mappedId = getEntry(guildId, sourceMessageId)?.starboardMessageId;
    if (mappedId) {
        const post = await starboardChannel.messages.fetch(mappedId).catch(() => null);
        if (post) return post;
        // Dead reference: the post was deleted by hand, allow a repost.
        deleteEntry(guildId, sourceMessageId);
    }

    const scanKey = `${guildId}:${sourceMessageId}`;
    if (!scanned.has(scanKey)) {
        rememberScan(scanKey);
        const recovered = await scanForExistingPost(starboardChannel, sourceMessageId);
        if (recovered) {
            logger.info(`🔎 [starboard] Recovered post ${recovered.id} for ${sourceMessageId}`);
            setEntry(guildId, sourceMessageId, recovered.id, null);
            return recovered;
        }
    }
    return null;
}

async function upsertPost(starboardChannel, message, count) {
    const guildId = starboardChannel.guild.id;
    const content = buildStarContent(message, count);
    const embed = buildStarEmbed(message);

    const existing = await findExistingPost(starboardChannel, message.id);
    if (existing) {
        await existing.edit({ content, embeds: [embed] });
        setEntry(guildId, message.id, existing.id, count);
        return;
    }

    const created = await starboardChannel.send({ content, embeds: [embed] });
    setEntry(guildId, message.id, created.id, count);
}

async function removePost(starboardChannel, messageId) {
    const guildId = starboardChannel.guild.id;
    const existing = await findExistingPost(starboardChannel, messageId);

    if (!existing) {
        deleteEntry(guildId, messageId);
        return;
    }

    try {
        await existing.delete();
        deleteEntry(guildId, messageId);
    } catch (error) {
        // Keep the mapping: dropping it would post a duplicate next time.
        logger.error(`❌ [starboard] Cannot delete post ${existing.id}: ${error.message}`);
    }
}

/**
 * Entry point for both messageReactionAdd and messageReactionRemove.
 * @param {import('discord.js').MessageReaction} reaction
 * @param {import('discord.js').User} user
 */
async function handleStarChange(reaction, user) {
    const resolved = await resolvePartials(reaction);
    const messageId = resolved.message?.id;
    if (!messageId) return;

    // Serialise every change for a given message.
    const previous = inFlight.get(messageId) ?? Promise.resolve();
    const current = previous
        .catch(() => {})
        .then(() => applyStarChange(resolved, user))
        .finally(() => {
            if (inFlight.get(messageId) === current) inFlight.delete(messageId);
        });

    inFlight.set(messageId, current);
    return current;
}

async function applyStarChange(reaction, user) {
    try {
        let message = reaction.message;

        let guild = message.guild;
        if (!guild && message.guildId) {
            guild = await message.client.guilds.fetch(message.guildId).catch(() => null);
        }
        if (!guild) return;

        const starboardChannel = await resolveStarboardChannel(guild);
        if (!starboardChannel) return;

        // Never mirror the starboard into itself.
        if (message.channelId === starboardChannel.id) return;

        // Cached reaction counts go stale after a restart, so refetch.
        let sourceDeleted = false;
        try {
            message = await message.fetch(true);
        } catch (error) {
            if (error?.code === 10008) sourceDeleted = true;
        }

        if (!sourceDeleted && message.author?.bot) return;

        const threshold = Math.max(1, configManager.get(guild.id, 'starboard.threshold') ?? 1);
        const count = sourceDeleted ? 0 : await countStars(message);
        logger.debug(`⭐ [starboard] ${message.id} -> ${count} star(s), threshold ${threshold}`);

        if (count < threshold) {
            await removePost(starboardChannel, message.id);
            return;
        }
        await upsertPost(starboardChannel, message, count);
    } catch (error) {
        logger.error(`❌ Error in handleStarChange: ${error.message}`);
        errorHandler.logError(
            error,
            {
                user: `${user?.tag || 'unknown'} (${user?.id || '?'})`,
                messageId: reaction?.message?.id,
                emoji: reaction?.emoji?.name,
            },
            'STAR_REACTION_ERROR'
        );
    }
}

module.exports = { handleStarChange };
