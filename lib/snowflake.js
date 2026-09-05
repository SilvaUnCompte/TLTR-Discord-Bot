/**
 * Discord ID helpers.
 */

/**
 * Reads an ID out of a raw value.
 *
 * Accepts a plain ID as well as the mention forms (`<#123>`, `<@123>`), because
 * configurations written by older versions stored the mention.
 * @param {*} raw
 * @returns {string|null}
 */
function extractId(raw) {
    if (typeof raw !== 'string') return null;
    const match = raw.match(/\d{16,}/);
    return match ? match[0] : null;
}

module.exports = { extractId };
