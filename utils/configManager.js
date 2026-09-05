/**
 * Per-guild configuration.
 *
 * Stored configs are always merged with DEFAULT_CONFIG on read, so adding a new
 * default key never breaks a guild whose file predates it. Setting paths are
 * validated against DEFAULT_CONFIG, so `/config set` cannot create arbitrary keys.
 */
const path = require('path');
const { JsonStore } = require('../lib/jsonStore');
const logger = require('../lib/logger');

const CONFIG_DIR = path.join(__dirname, '..', 'configs');
const STORE_NAME = 'guilds';

const DEFAULT_CONFIG = {
    starboard: {
        /** Channel ID the starred messages are mirrored to. Empty disables the feature. */
        channel: '',
        /** Number of stars required before a message is mirrored. */
        threshold: 1,
    },
};

/** Deep clone that is enough for a plain JSON config tree. */
function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

/** Returns `defaults` with every key `stored` provides, recursively. */
function mergeWithDefaults(defaults, stored) {
    const result = clone(defaults);
    if (!stored || typeof stored !== 'object') return result;

    for (const [key, value] of Object.entries(stored)) {
        if (!(key in result)) continue; // Drop unknown keys instead of propagating them.
        const isPlainObject =
            value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            typeof result[key] === 'object';
        result[key] = isPlainObject ? mergeWithDefaults(result[key], value) : value;
    }
    return result;
}

/** Collects every leaf path of DEFAULT_CONFIG, e.g. "starboard.channel". */
function collectPaths(node, prefix = '') {
    const paths = [];
    for (const [key, value] of Object.entries(node)) {
        const current = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            paths.push(...collectPaths(value, current));
        } else {
            paths.push(current);
        }
    }
    return paths;
}

const VALID_PATHS = new Set(collectPaths(DEFAULT_CONFIG));

class ConfigManager {
    constructor() {
        this.store = new JsonStore(CONFIG_DIR, 'config');
        this.configs = new Map();
        this.load();
    }

    load() {
        this.store.checkWritable();
        const stored = this.store.read(STORE_NAME);

        for (const [guildId, guildConfig] of Object.entries(stored)) {
            this.configs.set(guildId, mergeWithDefaults(DEFAULT_CONFIG, guildConfig));
        }
        logger.info(`✅ Loaded configs for ${this.configs.size} guild(s)`);
    }

    save() {
        return this.store.write(STORE_NAME, Object.fromEntries(this.configs));
    }

    /**
     * @param {string} guildId
     * @returns {object} the guild config, created from the defaults if needed.
     */
    getGuildConfig(guildId) {
        if (!this.configs.has(guildId)) {
            this.configs.set(guildId, clone(DEFAULT_CONFIG));
            this.save();
            logger.info(`📝 Created default config for guild ${guildId}`);
        }
        return this.configs.get(guildId);
    }

    /**
     * @param {string} guildId
     * @param {string} settingPath Dotted path, e.g. "starboard.channel".
     * @returns {*} the value, or undefined when the path does not exist.
     */
    get(guildId, settingPath) {
        let value = this.getGuildConfig(guildId);
        for (const key of settingPath.split('.')) {
            if (!value || typeof value !== 'object' || !(key in value)) return undefined;
            value = value[key];
        }
        return value;
    }

    /**
     * @param {string} guildId
     * @param {string} settingPath Must be a known path of DEFAULT_CONFIG.
     * @param {*} value
     * @returns {{ success: boolean, reason?: string }}
     */
    set(guildId, settingPath, value) {
        if (typeof settingPath !== 'string' || !VALID_PATHS.has(settingPath)) {
            return { success: false, reason: `Unknown setting \`${settingPath}\`` };
        }

        const config = this.getGuildConfig(guildId);
        const keys = settingPath.split('.');
        const lastKey = keys.pop();

        let target = config;
        for (const key of keys) target = target[key];
        target[lastKey] = value;

        if (!this.save()) {
            return { success: false, reason: 'The configuration could not be written to disk' };
        }
        logger.info(`✅ Updated ${settingPath} for guild ${guildId}`);
        return { success: true };
    }

    /** @returns {{ success: boolean, reason?: string }} */
    reset(guildId) {
        this.configs.set(guildId, clone(DEFAULT_CONFIG));
        if (!this.save()) {
            return { success: false, reason: 'The configuration could not be written to disk' };
        }
        logger.info(`🔄 Reset config for guild ${guildId}`);
        return { success: true };
    }

    /** @returns {string[]} every settable path. */
    getAvailableSettings() {
        return [...VALID_PATHS];
    }
}

module.exports = new ConfigManager();
