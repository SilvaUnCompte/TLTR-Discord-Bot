/**
 * Turns a starred message into the content and embed posted on the starboard.
 */
const { EmbedBuilder, resolveColor } = require('discord.js');
const { STAR_EMOJI } = require('../../lib/constants');

const IMAGE_EXTENSION = /\.(png|jpe?g|gif|webp)$/i;
const EMBED_DESCRIPTION_LIMIT = 4096;

/**
 * The message line always carries the source URL: that is what makes a lost
 * mapping recoverable by scanning the starboard channel.
 * @returns {string}
 */
function buildStarContent(message, count) {
    return `${STAR_EMOJI} x${count} | ${message.url}`;
}

function isImage(attachment) {
    return (
        attachment.contentType?.startsWith('image/') || IMAGE_EXTENSION.test(attachment.name || '')
    );
}

/** @returns {string|null} the first usable image URL of a message or snapshot. */
function pickImageUrl(source) {
    const attachment = source?.attachments?.find?.(isImage);
    if (attachment) return attachment.url;

    for (const embed of source?.embeds || []) {
        if (embed?.image?.url) return embed.image.url;
        if (embed?.thumbnail?.url) return embed.thumbnail.url;
    }
    return null;
}

/** @returns {string[]} markdown links for the non-image attachments. */
function listOtherAttachments(source) {
    if (!source?.attachments?.filter) return [];

    return [...source.attachments.filter((attachment) => !isImage(attachment)).values()].map(
        (attachment) => `[${attachment.name || 'file'}](${attachment.url})`
    );
}

/**
 * A forwarded message is an empty wrapper: the real content lives in its
 * snapshot, so both are inspected before deciding what to display.
 */
function resolveDisplaySource(message) {
    const snapshot = message.messageSnapshots?.first?.() || null;

    let text = message.content?.trim() || '';
    let imageUrl = pickImageUrl(message);
    let files = listOtherAttachments(message);

    if (snapshot) {
        if (!text) text = snapshot.content?.trim() || '';
        if (!imageUrl) imageUrl = pickImageUrl(snapshot);
        if (files.length === 0) files = listOtherAttachments(snapshot);
    }

    return { text, imageUrl, files, forwarded: Boolean(snapshot) };
}

function buildStarEmbed(message) {
    const { text, imageUrl, files, forwarded } = resolveDisplaySource(message);

    const parts = [];
    if (text) parts.push(text);
    if (files.length > 0) parts.push(files.join('\n'));

    let description = parts.join('\n\n');
    if (!description && !imageUrl) description = '(no text)';

    const embed = new EmbedBuilder().setColor(resolveColor('Gold')).setAuthor({
        name: message.author?.tag || 'Unknown',
        iconURL: message.author?.displayAvatarURL?.({ size: 64 }) || undefined,
    });

    if (description) embed.setDescription(description.slice(0, EMBED_DESCRIPTION_LIMIT));
    if (imageUrl) embed.setImage(imageUrl);
    if (forwarded) embed.setFooter({ text: 'Forwarded message' });

    return embed;
}

module.exports = { buildStarContent, buildStarEmbed, resolveDisplaySource };
