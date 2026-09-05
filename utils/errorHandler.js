/**
 * Error logging and user-facing error replies.
 *
 * Errors go to the console through the shared logger and to a dated file under
 * logs/, one file per severity. Retention and file size come from the
 * environment (MAX_LOG_DAYS, MAX_LOG_FILE_SIZE).
 */
const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');
const logger = require('../lib/logger');
const { int } = require('../lib/env');

const SEPARATOR = '='.repeat(80);

class ErrorHandler {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    ensureLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                logger.info('📁 Created logs directory');
            }
            return true;
        } catch (error) {
            logger.error(`❌ Cannot create the logs directory: ${error.message}`);
            return false;
        }
    }

    formatError(error, context = {}) {
        const timestamp = new Date().toISOString();
        const info = {
            timestamp,
            name: error.name || 'Error',
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace available',
            context,
        };

        const entry = [
            `[${timestamp}] ${info.name}: ${info.message}`,
            `Stack: ${info.stack}`,
            `Context: ${JSON.stringify(context, null, 2)}`,
            `${SEPARATOR}\n`,
        ].join('\n');

        return { entry, info };
    }

    /** Rotates the file once it exceeds MAX_LOG_FILE_SIZE megabytes (0 disables). */
    rotateIfNeeded(filepath) {
        const maxMegabytes = int('MAX_LOG_FILE_SIZE', 10);
        if (maxMegabytes <= 0) return;

        try {
            if (!fs.existsSync(filepath)) return;
            if (fs.statSync(filepath).size < maxMegabytes * 1024 * 1024) return;

            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            fs.renameSync(filepath, `${filepath}.${stamp}`);
        } catch (error) {
            logger.warn(`⚠️ Could not rotate ${filepath}: ${error.message}`);
        }
    }

    writeToLogFile(entry, errorType = 'general') {
        const date = new Date().toISOString().split('T')[0];
        const filepath = path.join(this.logDir, `${errorType}-${date}.log`);

        try {
            this.rotateIfNeeded(filepath);
            fs.appendFileSync(filepath, entry);
        } catch (writeError) {
            logger.error(`❌ Failed to write to log file: ${writeError.message}`);
        }
    }

    /**
     * @param {Error} error
     * @param {object} context Free-form details attached to the log entry.
     * @param {string} severity Also used as the log file prefix.
     */
    logError(error, context = {}, severity = 'ERROR') {
        const { entry, info } = this.formatError(error, context);

        logger.error(`🔴 [${severity}] ${info.name}: ${info.message}`);
        if (context.command) logger.error(`📝 Command: ${context.command}`);
        if (context.user) logger.error(`👤 User: ${context.user}`);
        if (context.guild) logger.error(`🏰 Guild: ${context.guild}`);

        this.writeToLogFile(entry, severity.toLowerCase());
        return info;
    }

    /** Logs the error and answers the interaction with a readable message. */
    async handleInteractionError(interaction, error, context = {}) {
        this.logError(
            error,
            {
                ...context,
                command: interaction.commandName,
                user: `${interaction.user.tag} (${interaction.user.id})`,
                guild: interaction.guild
                    ? `${interaction.guild.name} (${interaction.guild.id})`
                    : 'DM',
                channel: interaction.channel?.name
                    ? `#${interaction.channel.name} (${interaction.channelId})`
                    : String(interaction.channelId),
            },
            'INTERACTION_ERROR'
        );

        const message = this.getUserFriendlyMessage(error);

        try {
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp({ content: message, flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
            }
        } catch (replyError) {
            logger.error(`🔴 Failed to send the error message to the user: ${replyError.message}`);
            this.logError(replyError, { originalError: error.message }, 'REPLY_ERROR');
        }
    }

    /** @returns {string} a message that is safe to show to a Discord user. */
    getUserFriendlyMessage(error) {
        const messages = {
            DiscordAPIError: '🔗 Connection error with Discord. Please try again in a few moments.',
            TimeoutError: '⏰ The operation took too long. Please try again.',
            ValidationError: '📝 The provided data is not valid.',
            AuthenticationError: '🔐 Authentication problem with an external service.',
            NetworkError: '🌐 Network connection problem.',
            RateLimitError: '🚫 Too many requests. Please wait before trying again.',
            PermissionError: '🚫 The bot lacks the permissions required for this action.',
        };
        return messages[error.name] || '❌ An error occurred while executing this command.';
    }

    handleClientError(error, context = {}) {
        this.logError(error, context, 'CLIENT_ERROR');
    }

    handleUnhandledRejection(reason) {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        this.logError(error, { type: 'UNHANDLED_REJECTION' }, 'CRITICAL');
        logger.fatal('🔴 CRITICAL: unhandled promise rejection');
    }

    /** Logs, then lets the process die so PM2 can restart it cleanly. */
    handleUncaughtException(error) {
        this.logError(error, { type: 'UNCAUGHT_EXCEPTION' }, 'FATAL');
        logger.fatal('🔴 FATAL: uncaught exception, shutting down');

        setTimeout(() => process.exit(1), 1000).unref();
    }

    /** Deletes log files older than MAX_LOG_DAYS. */
    cleanupOldLogs() {
        const maxAgeMs = int('MAX_LOG_DAYS', 30) * 24 * 60 * 60 * 1000;
        const now = Date.now();

        try {
            if (!fs.existsSync(this.logDir)) return;

            for (const file of fs.readdirSync(this.logDir)) {
                const filepath = path.join(this.logDir, file);
                if (now - fs.statSync(filepath).mtime.getTime() > maxAgeMs) {
                    fs.unlinkSync(filepath);
                    logger.info(`🗑️ Cleaned up old log file: ${file}`);
                }
            }
        } catch (error) {
            logger.error(`❌ Error during log cleanup: ${error.message}`);
        }
    }

    /** @returns {object|null} counts used by the /debuginfo command. */
    getErrorStats() {
        try {
            if (!fs.existsSync(this.logDir)) return null;

            const files = fs.readdirSync(this.logDir);
            const today = new Date().toISOString().split('T')[0];
            const errorTypes = {};

            for (const file of files) {
                const type = file.split('-')[0];
                errorTypes[type] = (errorTypes[type] || 0) + 1;
            }

            return {
                totalFiles: files.length,
                todayFiles: files.filter((file) => file.includes(today)).length,
                errorTypes,
            };
        } catch (error) {
            logger.error(`❌ Error getting stats: ${error.message}`);
            return null;
        }
    }
}

module.exports = new ErrorHandler();
