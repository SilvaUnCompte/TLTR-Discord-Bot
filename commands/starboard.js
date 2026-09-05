const { EmbedBuilder, resolveColor } = require("discord.js");
const errorHandler = require("../utils/errorHandler");
const configManager = require("../utils/configManager");
const fs = require("fs");
const path = require("path");

const STAR_EMOJI = "⭐";

// JSON storage: configs/starboards/<guildId>.json
const STARBOARD_DIR = path.join(__dirname, "..", "configs", "starboards");

function ensureStarboardDir() {
    try {
        if (!fs.existsSync(STARBOARD_DIR)) {
            fs.mkdirSync(STARBOARD_DIR, { recursive: true });
        }
    } catch (_) { }
}

function getGuildFilePath(guildId) {
    return path.join(STARBOARD_DIR, `${guildId}.json`);
}

function loadGuildMap(guildId) {
    ensureStarboardDir();
    const file = getGuildFilePath(guildId);
    try {
        if (fs.existsSync(file)) {
            const raw = fs.readFileSync(file, "utf8");
            const data = JSON.parse(raw);
            return typeof data === "object" && data ? data : {};
        }
    } catch (_) { }
    return {};
}

function saveGuildMap(guildId, obj) {
    ensureStarboardDir();
    const file = getGuildFilePath(guildId);
    try {
        fs.writeFileSync(file, JSON.stringify(obj, null, 2), "utf8");
    } catch (_) { }
}

function getMapEntry(guildId, sourceMessageId) {
    const map = loadGuildMap(guildId);
    const entry = map[sourceMessageId];
    if (!entry) return null;
    if (typeof entry === 'string') {
        const upgraded = { starboardMessageId: entry, count: null };
        map[sourceMessageId] = upgraded;
        saveGuildMap(guildId, map);
        return upgraded;
    }
    return entry;
}

function setMapEntry(guildId, sourceMessageId, starboardMessageId, count) {
    const map = loadGuildMap(guildId);
    map[sourceMessageId] = { starboardMessageId, count };
    saveGuildMap(guildId, map);
}

function deleteMapEntry(guildId, sourceMessageId) {
    const map = loadGuildMap(guildId);
    if (map[sourceMessageId]) {
        delete map[sourceMessageId];
        saveGuildMap(guildId, map);
    }
}

/**
 * Extract a channel ID from either a raw ID or a mention like <#123>.
 */
function extractChannelId(raw) {
    if (!raw || typeof raw !== "string") return null;
    const match = raw.match(/\d{16,}/);
    return match ? match[0] : null;
}

/**
 * Resolve and validate the starboard channel for a guild.
 */
async function getStarboardChannelFromGuild(guild) {
    const rawChannel = configManager.get(guild.id, "starboard.channel");
    const channelId = extractChannelId(rawChannel);
    if (!channelId) return null;
    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased?.()) return null;
    return channel;
}

/**
 * Ensure we have fully-fetched objects for reaction and message.
 */
async function ensurePartials(reaction) {
    try {
        if (reaction.partial) {
            reaction = await reaction.fetch();
        }
        if (reaction.message?.partial) {
            await reaction.message.fetch();
        }
        if (reaction.message?.author?.partial) {
            await reaction.message.author.fetch();
        }
    } catch (e) {}
    return reaction;
}

/**
 * Build the starboard message content line (lightweight, easy to edit).
 */
function buildStarContent(message, count) {
    return `⭐ x${count} | ${message.url}`;
}

/**
 * Pick the first usable image URL from a message-like source
 * (message, or a forwarded-message snapshot).
 */
function pickImageUrl(source) {
    if (!source) return null;
    const attachment = source.attachments?.find?.(a =>
        a.contentType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name || "")
    );
    if (attachment) return attachment.url;

    for (const embed of source.embeds || []) {
        if (embed?.image?.url) return embed.image.url;
        if (embed?.thumbnail?.url) return embed.thumbnail.url;
    }
    return null;
}

/**
 * List non-image attachments as markdown links.
 */
function listOtherAttachments(source) {
    if (!source?.attachments?.filter) return [];
    return [...source.attachments.filter(a =>
        !(a.contentType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(a.name || ""))
    ).values()].map(a => `[${a.name || "fichier"}](${a.url})`);
}

/**
 * Resolve the content to display: a forwarded message carries its own
 * content/attachments in `messageSnapshots`, the wrapper message is empty.
 */
function resolveDisplaySource(message) {
    const snapshot = message.messageSnapshots?.first?.() || null;

    let text = message.content?.trim() || "";
    let imageUrl = pickImageUrl(message);
    let files = listOtherAttachments(message);

    if (snapshot) {
        if (!text) text = snapshot.content?.trim() || "";
        if (!imageUrl) imageUrl = pickImageUrl(snapshot);
        if (!files.length) files = listOtherAttachments(snapshot);
    }

    return { text, imageUrl, files, forwarded: Boolean(snapshot) };
}

/**
 * Build the embed for the starboard post (kept stable; we only edit content).
 */
function buildStarEmbed(message, count) {
    const { text, imageUrl, files, forwarded } = resolveDisplaySource(message);

    const parts = [];
    if (text) parts.push(text);
    if (files.length) parts.push(files.join("\n"));

    let description = parts.join("\n\n");
    if (!description && !imageUrl) description = "(no text)";

    const embed = new EmbedBuilder()
        .setColor(resolveColor("Gold"))
        .setAuthor({
            name: `${message.author?.tag || "Unknown"}`,
            iconURL: message.author?.displayAvatarURL?.({ size: 64 }) || undefined
        });

    if (description) embed.setDescription(description.slice(0, 4096));
    if (imageUrl) embed.setImage(imageUrl);
    if (forwarded) embed.setFooter({ text: "Message transféré" });

    return embed;
}

async function findExistingStarboardMessage(starboardChannel, sourceMessageId) {
    // Quick path using JSON mapping
    const guildId = starboardChannel.guild?.id;
    const mappedId = guildId ? (getMapEntry(guildId, sourceMessageId)?.starboardMessageId) : null;
    if (mappedId) {
        try {
            const msg = await starboardChannel.messages.fetch(mappedId);
            if (msg) return msg;
        } catch (_) { }
    }

    return null;
}

function getStarCount(message) {
    const starReaction = message.reactions?.resolve?.(STAR_EMOJI) || message.reactions?.cache?.get?.(STAR_EMOJI);
    return starReaction?.count ?? 0;
}

async function createStarboardEntry(starboardChannel, message, count) {
    const content = buildStarContent(message, count);
    const embed = buildStarEmbed(message, count);
    const sbMessage = await starboardChannel.send({ content, embeds: [embed] });
    setMapEntry(starboardChannel.guild.id, message.id, sbMessage.id, count);
    return sbMessage;
}

async function updateStarboardEntry(sbMessage, message, count) {
    const content = buildStarContent(message, count);
    const embed = buildStarEmbed(message, count);
    await sbMessage.edit({ content, embeds: [embed] });
    setMapEntry(sbMessage.guild.id, message.id, sbMessage.id, count);
}

async function deleteStarboardEntry(starboardChannel, message) {
    const sbMessage = await findExistingStarboardMessage(starboardChannel, message.id);
    if (!sbMessage) return;
    await sbMessage.delete().catch(() => { });
    deleteMapEntry(starboardChannel.guild.id, message.id);
}

async function upsertStarboardEntry(starboardChannel, message, count) {
    let sbMessage = await findExistingStarboardMessage(starboardChannel, message.id);
    if (!sbMessage) {
        sbMessage = await createStarboardEntry(starboardChannel, message, count);
    } else {
        await updateStarboardEntry(sbMessage, message, count);
    }
}

async function handleStarChange(reaction, user) {
    try {
        reaction = await ensurePartials(reaction);
        let message = reaction.message;
        let guild = message.guild;
        if (!guild && message.guildId) {
            guild = await message.client.guilds.fetch(message.guildId).catch(() => null);
        }
        if (!guild) return;

        const starboardChannel = await getStarboardChannelFromGuild(guild);
        if (!starboardChannel) return;

        // Refetch the source message from the API: cached reaction counts can be
        // stale (partial reaction, message not in cache after a restart...), which
        // made the "last star removed" case silently keep the starboard post.
        let sourceDeleted = false;
        try {
            message = await message.fetch(true);
        } catch (e) {
            if (e?.code === 10008) sourceDeleted = true; // Unknown Message
        }

        // With partials, the rooter can't always tell a bot message apart before fetching.
        if (!sourceDeleted && message.author?.bot) return;

        const count = sourceDeleted ? 0 : getStarCount(message);
        if (count <= 0) {
            await deleteStarboardEntry(starboardChannel, message);
            return;
        }
        await upsertStarboardEntry(starboardChannel, message, count);
    } catch (error) {
        console.error('❌ Error in handleStarChange:', error);
        await errorHandler.logError(error, {
            user: `${user?.tag || "unknown"} (${user?.id || "?"})`,
            messageId: reaction?.message?.id,
            emoji: reaction?.emoji?.name
        }, 'STAR_REACTION_ERROR');
    }
}

module.exports = { handleStarChange };