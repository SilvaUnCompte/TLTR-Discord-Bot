/**
 * Values shared by more than one module. Anything duplicated across files ends
 * up here so there is a single source of truth.
 */

/** The reaction the starboard feature listens for. */
const STAR_EMOJI = '⭐';

/** Discord blurple, used for informational embeds. */
const EMBED_COLOR = 0x5865f2;

/** Discord hard limit for a message; we stay under it on purpose. */
const DISCORD_MESSAGE_LIMIT = 2000;

module.exports = { STAR_EMOJI, EMBED_COLOR, DISCORD_MESSAGE_LIMIT };
