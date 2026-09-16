module.exports = {
    apps: [{
        name: "ctf-backend",
        script: "./server.js",
        instances: 2, // Use 2-4 instances instead of "max" to reserve resources
        exec_mode: "cluster", // Enable clustering for performance
        env: {
            NODE_ENV: "development",
        },
        env_production: {
            NODE_ENV: "production",
            PORT: 10000
        },
        // Error handling
        max_memory_restart: '800M', // Restart if exceeds 800MB (critical for stability)
        restart_delay: 3000,
        exp_backoff_restart_delay: 100,
        // Graceful shutdown for active connections
        kill_timeout: 5000,
        listen_timeout: 10000,
        // Logging
        error_file: './logs/err.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
        merge_logs: true
    }]
};
