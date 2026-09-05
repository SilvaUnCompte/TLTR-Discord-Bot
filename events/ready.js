const { Events } = require('discord.js');
const errorHandler = require('../utils/errorHandler');
const logger = require('../lib/logger');

module.exports = {
    name: Events.ClientReady,
    once: true,

    execute(client) {
        logger.info(`✅ Ready! Logged in as ${client.user.tag}`);
        logger.info(`🤖 Serving ${client.guilds.cache.size} server(s)`);

        for (const guild of client.guilds.cache.values()) {
            logger.debug(`- ${guild.name} (${guild.id})`);
        }

        const stats = errorHandler.getErrorStats();
        if (stats) {
            logger.info(`📊 Error log files: ${stats.totalFiles} total, ${stats.todayFiles} today`);
        }
    },
};
