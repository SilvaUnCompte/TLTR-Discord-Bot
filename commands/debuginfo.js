const errorHandler = require("../utils/errorHandler");

async function debuginfo(interaction) {
    try {
        await interaction.deferReply({ ephemeral: true });

        // Get error statistics
        const stats = errorHandler.getErrorStats();
        
        if (!stats) {
            await interaction.editReply({
                content: "❌ Unable to get error statistics."
            });
            return;
        }

        // Format statistics
        let statsMessage = "📊 **Bot Error Statistics**\n\n";
        statsMessage += `📁 **Log Files:** ${stats.totalFiles} total, ${stats.todayFiles} today\n\n`;
        
        if (Object.keys(stats.errorTypes).length > 0) {
            statsMessage += "📝 **Error Types:**\n";
            Object.entries(stats.errorTypes)
                .sort(([,a], [,b]) => b - a) // Sort by number of occurrences
                .forEach(([type, count]) => {
                    statsMessage += `• ${type}: ${count} file${count > 1 ? 's' : ''}\n`;
                });
        } else {
            statsMessage += "✅ **No error files detected**\n";
        }

        statsMessage += "\n🔍 **Bot Status:**\n";
        statsMessage += `• Uptime: ${Math.floor(process.uptime())} seconds\n`;
        statsMessage += `• Memory used: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n`;
        statsMessage += `• Node.js version: ${process.version}\n`;

        await interaction.editReply({
            content: statsMessage
        });

        console.log(`📊 ${interaction.user.tag} requested debug info`);

    } catch (error) {
        console.error('Error in debuginfo command:', error);
        
        const errorMessage = "❌ An error occurred while retrieving debug information.";
        
        if (interaction.deferred) {
            await interaction.editReply({ content: errorMessage });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
}

module.exports = { debuginfo };