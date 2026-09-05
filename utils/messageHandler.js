/**
 * Discord message sending helpers.
 *
 * Discord caps a message at 2000 characters. Everything below exists to split a
 * longer answer on a sensible boundary (sentence, then punctuation, then space)
 * while keeping fenced code blocks valid across the split.
 */
const { MessageFlags } = require('discord.js');
const logger = require('../lib/logger');

const DEFAULT_MAX_LENGTH = 1990;
const CONTINUATION = '...';

/**
 * Splits `content` into chunks that Discord accepts, cutting on the nicest
 * boundary available and repairing code fences that the cut would break.
 * @param {string} content
 * @param {number} maxLength Budget for one chunk, continuation marker excluded.
 * @returns {string[]}
 */
function splitMessage(content, maxLength = DEFAULT_MAX_LENGTH) {
    const chunks = [];
    let remaining = content;

    while (remaining.length > maxLength) {
        const budget = maxLength - CONTINUATION.length;
        const cut = findCutPoint(remaining, budget);

        let chunk = remaining.slice(0, cut.index);
        let rest = remaining.slice(cut.index);

        if (cut.reopenFence) {
            chunk += '\n```';
            rest = '```' + cut.fenceLanguage + '\n' + rest;
        }

        chunks.push(chunk + CONTINUATION);
        remaining = rest;
    }

    if (remaining.length > 0) chunks.push(remaining);
    return chunks;
}

/**
 * @param {string} text
 * @param {number} maxLength
 * @returns {{ index: number, reopenFence: boolean, fenceLanguage: string }}
 */
function findCutPoint(text, maxLength) {
    if (text.length <= maxLength) {
        return { index: text.length, reopenFence: false, fenceLanguage: '' };
    }

    const fence = openFenceAt(text, maxLength);
    if (fence) return cutAroundFence(text, maxLength, fence);

    // Preference order: end of sentence, punctuation, line break, space.
    const boundaries = [['. ', '! ', '? '], [', ', '; ', ': '], ['\n'], [' ']];
    const floor = Math.floor(maxLength * 0.7);

    for (const group of boundaries) {
        for (let index = maxLength; index >= floor; index -= 1) {
            for (const boundary of group) {
                if (text.startsWith(boundary, index)) {
                    return {
                        index: index + boundary.length,
                        reopenFence: false,
                        fenceLanguage: '',
                    };
                }
            }
        }
    }

    return { index: maxLength, reopenFence: false, fenceLanguage: '' };
}

/**
 * @returns {{ start: number, language: string }|null} the fence that is still
 * open at `position`, if any.
 */
function openFenceAt(text, position) {
    const fenceRegex = /```(\w*)/g;
    let open = null;
    let match;

    while ((match = fenceRegex.exec(text)) !== null) {
        if (match.index >= position) break;
        open = open ? null : { start: match.index, language: match[1] || '' };
    }
    return open;
}

function cutAroundFence(text, maxLength, fence) {
    // Prefer cutting just before the fence, when that leaves a usable chunk.
    if (fence.start > maxLength * 0.5) {
        return { index: fence.start, reopenFence: false, fenceLanguage: '' };
    }

    // Otherwise cut inside it, closing and reopening the fence around the split.
    return {
        index: Math.max(1, maxLength - 4),
        reopenFence: true,
        fenceLanguage: fence.language,
    };
}

/**
 * Sends `content` to the interaction, splitting it when needed.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} content
 * @param {object} [options]
 * @param {string} [options.prefix] Prepended to the first chunk.
 * @param {boolean} [options.useEditReply] Edit the deferred reply instead of following up.
 * @param {boolean} [options.ephemeral] Only meaningful for follow-ups.
 */
async function sendDiscordMessage(interaction, content, options = {}) {
    const {
        prefix = '',
        maxLength = DEFAULT_MAX_LENGTH,
        useEditReply = true,
        ephemeral = false,
    } = options;

    const chunks = splitMessage(prefix + (content ?? ''), maxLength);
    if (chunks.length === 0) return;

    const flags = ephemeral ? MessageFlags.Ephemeral : undefined;

    try {
        for (const [index, chunk] of chunks.entries()) {
            if (index === 0 && useEditReply) {
                await interaction.editReply(chunk);
            } else {
                await interaction.followUp({ content: chunk, flags });
            }
        }
    } catch (error) {
        logger.error(`❌ Error sending a message: ${error.message}`);
        await sendDiscordErrorMessage(interaction, 'Error sending the complete response.');
    }
}

/**
 * Replies with a formatted error, whatever state the interaction is in.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {string} errorMessage
 */
async function sendDiscordErrorMessage(interaction, errorMessage = 'An error occurred.') {
    const content = `❌ ${errorMessage}`;

    try {
        if (interaction.deferred && !interaction.replied) {
            await interaction.editReply(content);
        } else if (interaction.replied) {
            await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
        } else {
            await interaction.reply({ content, flags: MessageFlags.Ephemeral });
        }
    } catch (error) {
        logger.error(`❌ Error sending an error message: ${error.message}`);
    }
}

module.exports = {
    sendDiscordMessage,
    sendDiscordErrorMessage,
    splitMessage,
    findCutPoint,
};
