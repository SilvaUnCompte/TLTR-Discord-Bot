/**
 * Per-scope command cooldowns.
 *
 * The AI commands call a paid/quota-limited API, so they are rate limited by
 * channel or by user depending on how expensive and how shared the command is.
 */

class Cooldown {
    /**
     * @param {string} name Command name, used in the log line.
     * @param {number} seconds Cooldown duration.
     * @param {'user'|'channel'|'guild'} scope What the cooldown applies to.
     */
    constructor(name, seconds, scope = 'user') {
        this.name = name;
        this.durationMs = seconds * 1000;
        this.scope = scope;
        this.hits = new Map();
    }

    keyFor(interaction) {
        if (this.scope === 'channel') return interaction.channelId;
        if (this.scope === 'guild') return interaction.guildId ?? interaction.channelId;
        return interaction.user.id;
    }

    /**
     * @returns {{ allowed: boolean, retryAfterMs: number, retryTimestamp: number }}
     */
    check(interaction) {
        const key = this.keyFor(interaction);
        const now = Date.now();
        const expiresAt = this.hits.get(key);

        if (expiresAt !== undefined && expiresAt > now) {
            return {
                allowed: false,
                retryAfterMs: expiresAt - now,
                retryTimestamp: Math.ceil(expiresAt / 1000),
            };
        }
        return { allowed: true, retryAfterMs: 0, retryTimestamp: 0 };
    }

    /** Starts the cooldown. Called only once the command actually did its work. */
    start(interaction) {
        this.hits.set(this.keyFor(interaction), Date.now() + this.durationMs);
        this.prune();
    }

    /** Releases the cooldown, for a command that failed before doing anything. */
    clear(interaction) {
        this.hits.delete(this.keyFor(interaction));
    }

    /** Drops expired entries so the map cannot grow without bound. */
    prune() {
        const now = Date.now();
        for (const [key, expiresAt] of this.hits) {
            if (expiresAt <= now) this.hits.delete(key);
        }
    }

    /** Human readable description used in the rejection message. */
    describe() {
        const target = { user: 'user', channel: 'channel', guild: 'server' }[this.scope];
        return `one use every ${this.durationMs / 1000}s per ${target}`;
    }
}

module.exports = { Cooldown };
