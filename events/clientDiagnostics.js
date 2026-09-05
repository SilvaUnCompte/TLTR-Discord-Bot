/**
 * Client-level diagnostics.
 *
 * An event module may export a single handler or an array of them; these are
 * several low-traffic events that are not worth one file each.
 */
const { Events } = require('discord.js');
const errorHandler = require('../utils/errorHandler');
const logger = require('../lib/logger');
const { bool } = require('../lib/env');

module.exports = [
    {
        name: Events.Error,
        execute(error) {
            errorHandler.handleClientError(error, { source: 'Discord client' });
        },
    },
    {
        name: Events.Warn,
        execute(warning) {
            if (!bool('LOG_DISCORD_WARNINGS', false)) return;
            logger.warn(`⚠️ Discord warning: ${warning}`);
        },
    },
    {
        name: Events.Debug,
        execute(info) {
            // Off by default: this fires on every gateway heartbeat.
            if (!bool('LOG_DISCORD_DEBUG', false)) return;
            logger.debug(`🔍 Discord debug: ${info}`);
        },
    },
    {
        name: Events.ShardDisconnect,
        execute(event, shardId) {
            logger.warn(`🔌 Shard ${shardId} disconnected (code ${event?.code})`);
        },
    },
    {
        name: Events.ShardReconnecting,
        execute(shardId) {
            logger.info(`🔄 Shard ${shardId} reconnecting...`);
        },
    },
    {
        name: Events.ShardResume,
        execute(shardId, replayed) {
            logger.info(`🔄 Shard ${shardId} resumed, replayed ${replayed} event(s)`);
        },
    },
];
