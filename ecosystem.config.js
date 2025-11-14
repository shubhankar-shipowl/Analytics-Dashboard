/**
 * PM2 Ecosystem Configuration
 *
 * This file configures PM2 to manage the Dashboard application processes.
 *
 * DEFAULT USAGE (Single Process - Recommended):
 *   pm2 start ecosystem.config.js --only dashboard          # Start combined backend + frontend
 *   pm2 start ecosystem.config.js --only dashboard --env production  # Start in production mode
 *   pm2 stop dashboard                                       # Stop the combined process
 *   pm2 restart dashboard                                    # Restart the combined process
 *   pm2 logs dashboard                                       # View logs
 *   pm2 monit                                                # Monitor processes
 *
 * ALTERNATIVE USAGE (Separate Processes):
 *   pm2 start ecosystem.config.js --only dashboard-backend   # Start only backend
 *   pm2 start ecosystem.config.js --only dashboard-frontend   # Start only frontend
 *   pm2 start ecosystem.config.js                            # Start all processes (combined + separate)
 */

module.exports = {
  apps: [
    {
      name: 'dashboard',
      script: './start-combined.js',
      cwd: './',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1500M', // Combined memory limit (1.5GB)
      env: {
        NODE_ENV: 'development',
        PORT: 5009, // Backend port
        FRONTEND_PORT: 3006, // Frontend port
        // For VPS: Replace 'http://YOUR_VPS_IP' with your actual VPS IP or domain
        // Example: 'http://123.45.67.89' or 'http://yourdomain.com'
        REACT_APP_API_URL: 'http://localhost:5009/api', // Change to your VPS IP for production
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5009, // Backend port
        FRONTEND_PORT: 3006, // Frontend port
        // For VPS: Replace with your VPS IP or domain
        REACT_APP_API_URL: 'http://localhost:5009/api', // CHANGE THIS to your VPS IP/domain
      },
      error_file: './logs/pm2-combined-error.log',
      out_file: './logs/pm2-combined-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      kill_timeout: 10000, // Longer timeout for graceful shutdown of both processes
      wait_ready: false,
      listen_timeout: 30000,
    },
    {
      name: 'dashboard-backend',
      script: './server.js',
      cwd: './backend',
      instances: 1, // Run single instance (can increase for load balancing)
      exec_mode: 'fork', // Use 'cluster' for multiple instances
      watch: false, // Set to true for development auto-reload
      max_memory_restart: '500M', // Restart if memory exceeds 500MB
      env: {
        NODE_ENV: 'development',
        PORT: 5009,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5009,
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
      env_file: './.env',
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
        PORT: 3006,
        REACT_APP_API_URL: 'http://localhost:5009/api',
        BROWSER: 'none', // Don't auto-open browser
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3006,
        REACT_APP_API_URL: 'http://localhost:5009/api',
        BROWSER: 'none',
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
      // Only start frontend if backend is running
      wait_ready: false,
      listen_timeout: 30000, // React dev server takes longer to start
    },
  ],
};
