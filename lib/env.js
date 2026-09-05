/**
 * Environment access with defaults in one place, so a missing or malformed
 * variable fails loudly here instead of silently producing NaN downstream.
 */
require('dotenv').config();

function int(name, fallback) {
    const parsed = Number.parseInt(process.env[name], 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function float(name, fallback) {
    const parsed = Number.parseFloat(process.env[name]);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function bool(name, fallback) {
    const raw = process.env[name];
    if (raw === undefined || raw === '') return fallback;
    return /^(1|true|yes|on)$/i.test(raw.trim());
}

function str(name, fallback = undefined) {
    const raw = process.env[name];
    return raw === undefined || raw === '' ? fallback : raw;
}

/** Throws if a required variable is missing, listing every missing one at once. */
function requireAll(names) {
    const missing = names.filter((name) => !process.env[name]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
    }
}

module.exports = { int, float, bool, str, requireAll };
