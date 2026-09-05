module.exports = {
    apps: [
        {
            name: 'tltr-bot',
            script: 'index.js',
            cwd: __dirname,

            // --- Restart ---
            autorestart: true,
            max_restarts: 20,
            min_uptime: '30s', // Instant crash
            restart_delay: 5000,
            exp_backoff_restart_delay: 1000,
            max_memory_restart: '600M',

            watch: false,

            // --- Logs ---
            out_file: 'logs/pm2-out.log',
            error_file: 'logs/pm2-error.log',
            merge_logs: true,
            time: true, // Add timestamp to logs

            env: {
                NODE_ENV: 'production',
            },
        },
    ],
};
