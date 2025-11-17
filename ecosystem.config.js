/**
 * PM2 Ecosystem Configuration
 * 
 * This file configures PM2 to manage the Dashboard application processes.
 * 
 * Usage:
 *   pm2 start ecosystem.config.js          # Start all processes
 *   pm2 start ecosystem.config.js --env production  # Start in production mode
 *   pm2 stop ecosystem.config.js            # Stop all processes
 *   pm2 restart ecosystem.config.js         # Restart all processes
 *   pm2 delete ecosystem.config.js          # Delete all processes
 *   pm2 logs                                # View logs
 *   pm2 monit                               # Monitor processes
 */

module.exports = {
  apps: [
    {
      name: 'dashboard-backend',
      script: './backend/server.js',
      cwd: './backend',
      instances: 1, // Run single instance (can increase for load balancing)
      exec_mode: 'fork', // Use 'cluster' for multiple instances
      watch: false, // Set to true for development auto-reload
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: 'development',
        PORT: 5006,
        SERVE_STATIC_FILES: 'true' // Serve frontend from backend on same port
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5006,
        SERVE_STATIC_FILES: 'true' // Always serve static files in production
      },
      error_file: './logs/pm2-backend-error.log',
      out_file: './logs/pm2-backend-out.log',
      log_file: './logs/pm2-backend-combined.log',
      time: true, // Prepend timestamp to logs
      merge_logs: true,
      autorestart: true, // Auto-restart on crash
      max_restarts: 10, // Max restarts in 10 seconds
      min_uptime: '10s', // Minimum uptime to consider app stable
      restart_delay: 4000, // Delay between restarts (ms)
      kill_timeout: 5000, // Time to wait for graceful shutdown
      wait_ready: false, // Don't wait for ready signal
      listen_timeout: 10000, // Timeout for listen event
      shutdown_with_message: true, // Graceful shutdown
      // Environment variables from .env file
      env_file: './backend/.env'
    },
    {
      name: 'dashboard-frontend',
      script: './start-frontend.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false, // Set to true for development
      max_memory_restart: '1G', // React apps can use more memory
      env: {
        NODE_ENV: 'development',
        PORT: 3003,
        FRONTEND_PORT: 3003,
        REACT_APP_API_URL: 'http://localhost:5006/api',
        BROWSER: 'none' // Don't auto-open browser
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3003,
        FRONTEND_PORT: 3003,
        REACT_APP_API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5006/api',
        BROWSER: 'none'
      },
      error_file: './logs/pm2-frontend-error.log',
      out_file: './logs/pm2-frontend-out.log',
      log_file: './logs/pm2-frontend-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: false,
      listen_timeout: 30000, // React dev server takes longer to start
      // Only start frontend if SERVE_STATIC_FILES is false
      // This is handled by conditional start scripts
    }
  ]
};

