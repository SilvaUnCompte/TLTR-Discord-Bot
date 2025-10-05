const fs = require('fs');
const path = require('path');

/**
 * Provides comprehensive error logging and management
 */
class ErrorHandler {
    constructor() {
        this.logDir = path.join(__dirname, '..', 'logs');
        this.ensureLogDirectory();
    }

    /**
     * Ensure logs directory exists
     */
    ensureLogDirectory() {
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
            console.log('Created logs directory');
        }
    }

    /**
     * Get current timestamp for logging
     */
    getTimestamp() {
        return new Date().toISOString();
    }

    /**
     * Format error message for logging
     */
    formatError(error, context = {}) {
        const timestamp = this.getTimestamp();
        const errorInfo = {
            timestamp,
            message: error.message || 'Unknown error',
            stack: error.stack || 'No stack trace available',
            name: error.name || 'Error',
            context
        };

        return {
            logEntry: `[${timestamp}] ${errorInfo.name}: ${errorInfo.message}\nStack: ${errorInfo.stack}\nContext: ${JSON.stringify(context, null, 2)}\n${'='.repeat(80)}\n`,
            errorInfo
        };
    }

    /**
     * Write error to log file
     */
    writeToLogFile(logEntry, errorType = 'general') {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${errorType}-${date}.log`;
        const filepath = path.join(this.logDir, filename);

        try {
            fs.appendFileSync(filepath, logEntry);
        } catch (writeError) {
            console.error('❌ Failed to write to log file:', writeError.message);
        }
    }

    /**
     * Log error with different severity levels
     */
    logError(error, context = {}, severity = 'ERROR') {
        const { logEntry, errorInfo } = this.formatError(error, context);

        // Console output with colors
        console.error(`🔴 [${severity}] ${errorInfo.name}: ${errorInfo.message}`);
        if (context.command) {
            console.error(`📝 Command: ${context.command}`);
        }
        if (context.user) {
            console.error(`👤 User: ${context.user}`);
        }
        if (context.guild) {
            console.error(`🏰 Guild: ${context.guild}`);
        }

        // Write to appropriate log file
        const logType = severity.toLowerCase();
        this.writeToLogFile(logEntry, logType);

        return errorInfo;
    }

    /**
     * Handle Discord interaction errors
     */
    async handleInteractionError(interaction, error, context = {}) {
        const errorContext = {
            ...context,
            command: interaction.commandName,
            user: `${interaction.user.tag} (${interaction.user.id})`,
            guild: interaction.guild ? `${interaction.guild.name} (${interaction.guild.id})` : 'DM',
            channel: interaction.channel ? `#${interaction.channel.name} (${interaction.channel.id})` : 'Unknown'
        };

        this.logError(error, errorContext, 'INTERACTION_ERROR');

        // Send user-friendly error message
        const errorMessage = this.getUserFriendlyMessage(error);

        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ 
                    content: errorMessage, 
                    ephemeral: true 
                });
            } else {
                await interaction.reply({ 
                    content: errorMessage, 
                    ephemeral: true 
                });
            }
        } catch (replyError) {
            console.error('🔴 Failed to send error message to user:', replyError.message);
            this.logError(replyError, { originalError: error.message }, 'REPLY_ERROR');
        }
    }

    /**
     * Generate user-friendly error messages
     */
    getUserFriendlyMessage(error) {
        const errorType = error.name || 'Error';
        const baseMessage = '❌ An error occurred while executing this command.';

        // Specific error messages for common issues
        const errorMessages = {
            'DiscordAPIError': '🔗 Connection error with Discord. Please try again in a few moments.',
            'TimeoutError': '⏰ The operation took too long. Please try again.',
            'ValidationError': '📝 The provided data is not valid.',
            'AuthenticationError': '🔐 Authentication problem with external services.',
            'NetworkError': '🌐 Network connection problem. Check your connection.',
            'RateLimitError': '🚫 Too many requests. Please wait before trying again.',
            'PermissionError': '🚫 The bot does not have the necessary permissions for this action.'
        };

        return errorMessages[errorType] || baseMessage;
    }

    /**
     * Handle Discord client errors
     */
    handleClientError(error, context = {}) {
        this.logError(error, context, 'CLIENT_ERROR');

        // Don't restart the bot for minor errors
        const criticalErrors = ['ENOTFOUND', 'ECONNRESET', 'WEBSOCKET_ERROR'];
        const isCritical = criticalErrors.some(criticalError => 
            error.message?.includes(criticalError) || error.code === criticalError
        );

        if (isCritical) {
            console.error('🔴 Critical client error detected. Bot may need restart.');
            // TODO: automatic restart logic here if needed
        }
    }

    /**
     * Handle unhandled promise rejections
     */
    handleUnhandledRejection(reason, promise) {
        const error = reason instanceof Error ? reason : new Error(String(reason));
        
        this.logError(error, { 
            type: 'UNHANDLED_REJECTION',
            promise: promise.toString()
        }, 'CRITICAL');

        console.error('🔴 CRITICAL: Unhandled Promise Rejection detected!');
        
        // Log additional debugging info
        if (reason?.stack) {
            console.error('Stack trace:', reason.stack);
        }
    }

    /**
     * Handle uncaught exceptions
     */
    handleUncaughtException(error) {
        this.logError(error, { type: 'UNCAUGHT_EXCEPTION' }, 'FATAL');
        
        console.error('🔴 FATAL: Uncaught Exception detected!');
        console.error('The bot will attempt graceful shutdown...');

        // Allow time for logs to be written
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    }

    /**
     * Clean up old log files (keep last 30 days)
     */
    cleanupOldLogs() {
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
        const now = Date.now();

        try {
            if (!fs.existsSync(this.logDir)) return;

            const files = fs.readdirSync(this.logDir);
            
            files.forEach(file => {
                const filepath = path.join(this.logDir, file);
                const stats = fs.statSync(filepath);
                
                if (now - stats.mtime.getTime() > maxAge) {
                    fs.unlinkSync(filepath);
                    console.log(`🗑️ Cleaned up old log file: ${file}`);
                }
            });
        } catch (error) {
            console.error('❌ Error during log cleanup:', error.message);
        }
    }

    /**
     * Get error statistics from log files
     */
    getErrorStats() {
        try {
            if (!fs.existsSync(this.logDir)) return null;

            const files = fs.readdirSync(this.logDir);
            const today = new Date().toISOString().split('T')[0];
            
            const stats = {
                totalFiles: files.length,
                todayFiles: files.filter(f => f.includes(today)).length,
                errorTypes: {}
            };

            files.forEach(file => {
                const type = file.split('-')[0];
                stats.errorTypes[type] = (stats.errorTypes[type] || 0) + 1;
            });

            return stats;
        } catch (error) {
            console.error('❌ Error getting stats:', error.message);
            return null;
        }
    }
}

// Export singleton instance
const errorHandler = new ErrorHandler();
module.exports = errorHandler;