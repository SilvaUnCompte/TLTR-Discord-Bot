const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const errorHandler = require('../utils/errorHandler');
const logger = require('../lib/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('debuginfo')
        .setDescription('Show bot error statistics and debug information'),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const stats = errorHandler.getErrorStats();
        if (!stats) {
            await interaction.editReply('❌ Unable to read the error statistics.');
            return;
        }

        const lines = [
            '📊 **Bot error statistics**',
            '',
            `📁 **Log files:** ${stats.totalFiles} total, ${stats.todayFiles} today`,
            '',
        ];

        const types = Object.entries(stats.errorTypes).sort(([, a], [, b]) => b - a);
        if (types.length > 0) {
            lines.push('📝 **Error types:**');
            for (const [type, count] of types) {
                lines.push(`- ${type}: ${count} file${count > 1 ? 's' : ''}`);
            }
        } else {
            lines.push('✅ **No error files detected**');
        }

        const memoryMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        lines.push(
            '',
            '🔍 **Bot status:**',
            `- Uptime: ${formatUptime(process.uptime())}`,
            `- Memory used: ${memoryMb} MB`,
            `- Node.js: ${process.version}`,
            `- Log level: ${logger.level}`
        );

        await interaction.editReply(lines.join('\n'));
        logger.info(`📊 ${interaction.user.tag} requested debug info`);
    },
};

/** @param {number} seconds @returns {string} e.g. "3d 4h 12m" */
function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return [days && `${days}d`, hours && `${hours}h`, `${minutes}m`].filter(Boolean).join(' ');
}
