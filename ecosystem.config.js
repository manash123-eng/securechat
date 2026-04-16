module.exports = {
  apps: [
    {
      name: 'securechat',
      script: 'server/index.js',
      instances: 'max',          // One per CPU core
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      autorestart: true,
      restart_delay: 3000,
      max_restarts: 10,
    }
  ]
};
