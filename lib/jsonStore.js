/**
 * Small JSON persistence helper shared by the guild configuration and the
 * starboard mapping.
 *
 * Two properties matter here:
 *   - writes are atomic (temp file + rename), so a crash mid-write cannot leave
 *     a truncated JSON file behind;
 *   - a non-writable directory degrades to memory-only instead of throwing on
 *     every call, and says so once rather than on every write.
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class JsonStore {
    /**
     * @param {string} directory Absolute path of the folder holding the files.
     * @param {string} label Short name used in log lines.
     */
    constructor(directory, label) {
        this.directory = directory;
        this.label = label;
        this.writable = true;
        this.reportedFailure = false;
    }

    ensureDirectory() {
        try {
            if (!fs.existsSync(this.directory)) {
                fs.mkdirSync(this.directory, { recursive: true });
            }
            return true;
        } catch (error) {
            if (!this.reportedFailure) {
                logger.error(
                    `❌ [${this.label}] Cannot create ${this.directory}: ${error.message}`
                );
                this.reportedFailure = true;
            }
            this.writable = false;
            return false;
        }
    }

    filePath(name) {
        return path.join(this.directory, `${name}.json`);
    }

    /**
     * Startup self-check. Without it, a directory the process cannot write to
     * silently breaks persistence and the symptom only shows up much later.
     * @returns {boolean} whether the directory is writable.
     */
    checkWritable() {
        if (!this.ensureDirectory()) return false;

        const probe = path.join(this.directory, '.write-test');
        try {
            fs.writeFileSync(probe, 'ok', 'utf8');
            fs.unlinkSync(probe);
            this.writable = true;
            logger.debug(`✅ [${this.label}] Storage OK: ${this.directory}`);
        } catch (error) {
            this.writable = false;
            logger.error(
                `❌ [${this.label}] Storage NOT writable (${this.directory}): ${error.code} ${error.message}`
            );
            logger.error(
                `   Fix the folder rights, for example: chown -R $USER "${this.directory}" && chmod -R u+rwX "${this.directory}"`
            );
        }
        return this.writable;
    }

    /** @returns {object} the parsed file, or an empty object when absent or invalid. */
    read(name) {
        const file = this.filePath(name);
        try {
            if (!fs.existsSync(file)) return {};
            const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            logger.error(`❌ [${this.label}] Cannot read ${file}: ${error.message}`);
            return {};
        }
    }

    /** @returns {boolean} whether the data reached the disk. */
    write(name, data) {
        if (!this.ensureDirectory()) return false;

        const file = this.filePath(name);
        const temporary = `${file}.tmp`;
        try {
            fs.writeFileSync(temporary, JSON.stringify(data, null, 2), 'utf8');
            fs.renameSync(temporary, file);
            this.writable = true;
            this.reportedFailure = false;
            return true;
        } catch (error) {
            if (!this.reportedFailure) {
                logger.error(
                    `❌ [${this.label}] Cannot write ${file}: ${error.code} ${error.message}`
                );
                this.reportedFailure = true;
            }
            this.writable = false;
            try {
                if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
            } catch {
                // The temp file will be overwritten on the next successful write.
            }
            return false;
        }
    }
}

module.exports = { JsonStore };
