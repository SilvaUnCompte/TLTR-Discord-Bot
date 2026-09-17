const logger = require('./logger');

/**
 * Runs `task` with each candidate in order and returns the first successful result.
 * Moves to the next candidate only when `shouldFallback(error)` returns true,
 * otherwise the error is rethrown immediately. The last error is rethrown when
 * every candidate failed.
 * @template C, R
 * @param {C[]} candidates
 * @param {(candidate: C) => Promise<R>} task
 * @param {(error: Error) => boolean} [shouldFallback]
 * @returns {Promise<R>}
 */
async function withFallback(candidates, task, shouldFallback = () => true) {
    let lastError = new Error('No candidate provided');

    for (const [index, candidate] of candidates.entries()) {
        try {
            return await task(candidate);
        } catch (error) {
            lastError = error;
            if (!shouldFallback(error)) throw error;

            const next = candidates[index + 1];
            if (next !== undefined) {
                logger.warn(
                    `⚠️ "${candidate}" failed (${error.message}), falling back to "${next}"`
                );
            }
        }
    }

    throw lastError;
}

module.exports = { withFallback };
