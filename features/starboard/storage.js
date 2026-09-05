/**
 * Mapping between a source message and the starboard post that mirrors it.
 * One JSON file per guild under configs/starboards/.
 */
const path = require('path');
const { JsonStore } = require('../../lib/jsonStore');

const STARBOARD_DIR = path.join(__dirname, '..', '..', 'configs', 'starboards');

const store = new JsonStore(STARBOARD_DIR, 'starboard');
store.checkWritable();

/**
 * In-memory mirror of the files, so the feature keeps working for the lifetime
 * of the process even when the disk is not writable.
 * @type {Map<string, object>}
 */
const cache = new Map();

function loadGuildMap(guildId) {
    if (!cache.has(guildId)) cache.set(guildId, store.read(guildId));
    return cache.get(guildId);
}

function saveGuildMap(guildId, map) {
    cache.set(guildId, map);
    store.write(guildId, map);
}

/**
 * @returns {{ starboardMessageId: string, count: number|null }|null}
 */
function getEntry(guildId, sourceMessageId) {
    const map = loadGuildMap(guildId);
    const entry = map[sourceMessageId];
    if (!entry) return null;

    // Entries used to be a bare message id string.
    if (typeof entry === 'string') {
        const upgraded = { starboardMessageId: entry, count: null };
        map[sourceMessageId] = upgraded;
        saveGuildMap(guildId, map);
        return upgraded;
    }
    return entry;
}

function setEntry(guildId, sourceMessageId, starboardMessageId, count) {
    const map = loadGuildMap(guildId);
    map[sourceMessageId] = { starboardMessageId, count };
    saveGuildMap(guildId, map);
}

function deleteEntry(guildId, sourceMessageId) {
    const map = loadGuildMap(guildId);
    if (map[sourceMessageId]) {
        delete map[sourceMessageId];
        saveGuildMap(guildId, map);
    }
}

module.exports = { getEntry, setEntry, deleteEntry, STARBOARD_DIR };
