module.exports = {
  apps: [{
    name: '1-server',
    script: 'src/server/api/server.js',
    watch: ['src/server'],
    ignore_watch: ['node_modules', 'logs', 'src/client'],
    env: {
      NODE_ENV: 'development',
      PORT: 8080
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
