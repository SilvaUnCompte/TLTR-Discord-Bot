const { EmbedBuilder, resolveColor } = require("discord.js");
const errorHandler = require("../utils/errorHandler");
const configManager = require("../utils/configManager");
const fs = require("fs");
const path = require("path");

const STAR_EMOJI = "⭐";

// JSON storage: configs/starboards/<guildId>.json
const STARBOARD_DIR = path.join(__dirname, "..", "configs", "starboards");

// In-memory mirror of the JSON files. The bot keeps working (within the
// process lifetime) even if the disk is not writable.
const memoryCache = new Map();

// Source messages we already tried to recover by scanning the starboard
// channel, so we don't rescan on every reaction.
const scanned = new Set();

let storageWritable = true;

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

function ensureStarboardDir() {
    try {
        if (!fs.existsSync(STARBOARD_DIR)) {
            fs.mkdirSync(STARBOARD_DIR, { recursive: true });
        }
        return true;
    } catch (error) {
        console.error(`❌ [starboard] Cannot create ${STARBOARD_DIR}:`, error.message);
        return false;
    }
}

function getGuildFilePath(guildId) {
    return path.join(STARBOARD_DIR, `${guildId}.json`);
}

/**
 * Startup self-check: without this, a non-writable configs/ folder silently
 * broke the whole starboard (every reaction posted a new message because the
 * mapping could never be persisted).
 */
function checkStorage() {
    if (!ensureStarboardDir()) {
        storageWritable = false;
        return;
    }
    const probe = path.join(STARBOARD_DIR, ".write-test");
    try {
        fs.writeFileSync(probe, "ok", "utf8");
        try { fs.unlinkSync(probe); } catch (_) { /* cleanup only */ }
        console.log(`✅ [starboard] Storage OK: ${STARBOARD_DIR}`);
    } catch (error) {
        storageWritable = false;
        console.error(`❌ [starboard] Storage NOT writable (${STARBOARD_DIR}): ${error.code} ${error.message}`);
        console.error(`   → the starboard mapping cannot be saved: fix the folder rights, e.g.`);
        console.error(`     chown -R $USER "${path.join(STARBOARD_DIR, "..")}" && chmod -R u+rwX "${path.join(STARBOARD_DIR, "..")}"`);
    }
}
checkStorage();

function loadGuildMap(guildId) {
    if (memoryCache.has(guildId)) return memoryCache.get(guildId);

    ensureStarboardDir();
    const file = getGuildFilePath(guildId);
    let data = {};
    try {
        if (fs.existsSync(file)) {
            const raw = fs.readFileSync(file, "utf8");
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === "object") data = parsed;
        }
    } catch (error) {
        console.error(`❌ [starboard] Cannot read ${file}:`, error.message);
    }
    memoryCache.set(guildId, data);
    return data;
}

function saveGuildMap(guildId, obj) {
    memoryCache.set(guildId, obj);          // always keep memory in sync
    if (!ensureStarboardDir()) return;

    const file = getGuildFilePath(guildId);
    const tmp = `${file}.tmp`;
    try {
        fs.writeFileSync(tmp, JSON.stringify(obj, null, 2), "utf8");
        fs.renameSync(tmp, file);           // atomic replace
        storageWritable = true;
    } catch (error) {
        if (storageWritable) {
            console.error(`❌ [starboard] Cannot write ${file}: ${error.code} ${error.message}`);
            storageWritable = false;
        }
        try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) { }
    }
}

function getMapEntry(guildId, sourceMessageId) {
    const map = loadGuildMap(guildId);
    const entry = map[sourceMessageId];
    if (!entry) return null;
    if (typeof entry === "string") {
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

/* -------------------------------------------------------------------------- */
/* Channel resolution                                                          */
/* -------------------------------------------------------------------------- */

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
    } catch (e) { }
    return reaction;
}

/* -------------------------------------------------------------------------- */
/* Rendering                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Build the starboard message content line (lightweight, easy to edit).
 * It always contains the source message URL: that is what lets us recover a
 * lost mapping by scanning the starboard channel.
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
 * Resolve what to display: a forwarded message is an empty wrapper, its real
 * content lives in `messageSnapshots`.
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

/* -------------------------------------------------------------------------- */
/* Starboard post lookup                                                       */
/* -------------------------------------------------------------------------- */

const SCAN_PAGES = 3; // up to 300 recent starboard messages

/**
 * Recover a starboard post without the JSON mapping, by looking for the source
 * message id inside our own posts (buildStarContent embeds the message URL).
 */
async function scanStarboardForSource(starboardChannel, sourceMessageId) {
    const selfId = starboardChannel.client?.user?.id;
    let before;
    try {
        for (let page = 0; page < SCAN_PAGES; page++) {
            const batch = await starboardChannel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
            if (!batch || batch.size === 0) return null;

            const hit = batch.find(m =>
                (!selfId || m.author?.id === selfId) && m.content?.includes(sourceMessageId)
            );
            if (hit) return hit;

            before = batch.lastKey();
            if (batch.size < 100) return null;
        }
    } catch (error) {
        console.error("❌ [starboard] Scan failed:", error.message);
    }
    return null;
}

async function findExistingStarboardMessage(starboardChannel, sourceMessageId) {
    const guildId = starboardChannel.guild?.id;

    // 1. Quick path: JSON mapping
    const mappedId = guildId ? getMapEntry(guildId, sourceMessageId)?.starboardMessageId : null;
    if (mappedId) {
        const msg = await starboardChannel.messages.fetch(mappedId).catch(() => null);
        if (msg) return msg;
        // Dead reference (post deleted by hand): drop it so we can repost.
        if (guildId) deleteMapEntry(guildId, sourceMessageId);
    }

    // 2. Recovery: the mapping can be missing (wiped configs, unwritable disk,
    //    bot moved to another machine). Scan once per source message.
    const scanKey = `${guildId}:${sourceMessageId}`;
    if (!scanned.has(scanKey)) {
        scanned.add(scanKey);
        const recovered = await scanStarboardForSource(starboardChannel, sourceMessageId);
        if (recovered) {
            console.log(`🔎 [starboard] Recovered post ${recovered.id} for source ${sourceMessageId}`);
            if (guildId) setMapEntry(guildId, sourceMessageId, recovered.id, null);
            return recovered;
        }
    }

    return null;
}

/* -------------------------------------------------------------------------- */
/* Actions                                                                     */
/* -------------------------------------------------------------------------- */

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
    const guildId = starboardChannel.guild?.id;
    const sbMessage = await findExistingStarboardMessage(starboardChannel, message.id);
    if (!sbMessage) {
        if (guildId) deleteMapEntry(guildId, message.id);
        return;
    }
    try {
        await sbMessage.delete();
        if (guildId) deleteMapEntry(guildId, message.id);
    } catch (error) {
        // Keep the mapping: without it we would post a duplicate next time.
        console.error(`❌ [starboard] Cannot delete post ${sbMessage.id}: ${error.message}`);
    }
}

async function upsertStarboardEntry(starboardChannel, message, count) {
    const sbMessage = await findExistingStarboardMessage(starboardChannel, message.id);
    if (!sbMessage) {
        await createStarboardEntry(starboardChannel, message, count);
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

        // Refetch the source message: cached reaction counts can be stale
        // (partial reaction, message not cached after a restart...), which made
        // the "last star removed" case keep the starboard post alive.
        let sourceDeleted = false;
        try {
            message = await message.fetch(true);
        } catch (e) {
            if (e?.code === 10008) sourceDeleted = true; // Unknown Message
        }

        // With partials the rooter can't always tell a bot message apart.
        if (!sourceDeleted && message.author?.bot) return;

        const count = sourceDeleted ? 0 : getStarCount(message);
        console.log(`⭐ [starboard] ${message.id} → ${count} star(s)`);

        if (count <= 0) {
            await deleteStarboardEntry(starboardChannel, message);
            return;
        }
        await upsertStarboardEntry(starboardChannel, message, count);
    } catch (error) {
        console.error("❌ Error in handleStarChange:", error);
        await errorHandler.logError(error, {
            user: `${user?.tag || "unknown"} (${user?.id || "?"})`,
            messageId: reaction?.message?.id,
            emoji: reaction?.emoji?.name
        }, 'STAR_REACTION_ERROR');
    }
}

module.exports = { handleStarChange };
