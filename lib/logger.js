/**
 * Minimal levelled console logger.
 *
 * The verbosity is driven by LOG_LEVEL (DEBUG, INFO, WARN, ERROR, FATAL).
 * Anything below the configured level is dropped, which is what keeps the PM2
 * output readable in production.
 */
const LEVELS = { DEBUG: 10, INFO: 20, WARN: 30, ERROR: 40, FATAL: 50 };

function resolveLevel() {
    const configured = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
    return LEVELS[configured] ?? LEVELS.INFO;
}

let threshold = resolveLevel();

function write(level, stream, args) {
    if (LEVELS[level] < threshold) return;
    stream(...args);
}

const logger = {
    /** Re-read LOG_LEVEL, for tests and for a restart with --update-env. */
    refresh() {
        threshold = resolveLevel();
    },
    get level() {
        return Object.keys(LEVELS).find((name) => LEVELS[name] === threshold);
    },
    debug: (...args) => write('DEBUG', console.debug, args),
    info: (...args) => write('INFO', console.log, args),
    warn: (...args) => write('WARN', console.warn, args),
    error: (...args) => write('ERROR', console.error, args),
    fatal: (...args) => write('FATAL', console.error, args),
};

module.exports = logger;
