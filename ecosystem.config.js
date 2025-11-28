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
 *   pm2 monit                                               # Monitor processes
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

      // Process Configuration - Optimized for combined backend + frontend
      instances: 1,
      exec_mode: 'fork',

      // Working Directory - Critical for file paths
      cwd: process.cwd(), // Ensures correct working directory

      // Environment Variables
      env: {
        NODE_ENV: 'development',
        PORT: 5009, // Backend port
        FRONTEND_PORT: 3006, // Frontend port
        // For VPS: Replace 'http://YOUR_VPS_IP' with your actual VPS IP or domain
        // Example: 'http://123.45.67.89' or 'http://yourdomain.com'
        REACT_APP_API_URL: 'http://srv512766.hstgr.cloud:5009', // Change to your VPS IP for production
        NODE_OPTIONS: '--no-deprecation --max-old-space-size=4096', // Increased memory for production
        BROWSER: 'none', // Don't auto-open browser
        ALLOW_START_WITHOUT_DB: 'true', // Allow backend to start without database (for testing)
        // Database Configuration (from backend/.env)
        DB_HOST: '31.97.61.5',
        DB_PORT: '3306',
        DB_NAME: 'admin_analytics',
        DB_USER: 'admin_analytics',
        DB_PASSWORD: 'Adminanalytics@12',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5009, // Backend port (internal, Nginx proxies to this)
        FRONTEND_PORT: 3006, // Frontend port (same as Nginx port 3006)
        // VPS Configuration: Use relative URL when behind Nginx on port 3006
        // Nginx will route /api requests to backend on port 5009
        REACT_APP_API_URL: '/api', // Relative URL - Nginx handles routing
        NODE_OPTIONS: '--no-deprecation --max-old-space-size=4096', // Increased memory for production
        BROWSER: 'none',
        ALLOW_START_WITHOUT_DB: 'false', // Production should require database
        // Database Configuration
        DB_HOST: '31.97.61.5',
        DB_PORT: '3306',
        DB_NAME: 'admin_analytics',
        DB_USER: 'admin_analytics',
        DB_PASSWORD: 'Adminanalytics@12',
        // CORS Configuration (Nginx handles CORS in production)
        CORS_ORIGIN:
          'http://srv512766.hstgr.cloud:3006,https://srv512766.hstgr.cloud:3006',
        // Production: Do not allow server to start without database
        ALLOW_START_WITHOUT_DB: 'false',
      },

      // Logging Configuration
      log_file: './logs/pm2-combined.log',
      out_file: './logs/pm2-combined-out.log',
      error_file: './logs/pm2-combined-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,

      // Process Management - Enhanced for VPS Production
      max_memory_restart: '2G', // Increased for large file processing and React dev server
      min_uptime: '30s', // Minimum uptime before considering stable
      max_restarts: 15, // Allow recovery attempts but prevent infinite loops
      restart_delay: 4000, // Delay between restarts
      autorestart: true,
      // VPS Optimization: Add exponential backoff
      exp_backoff_restart_delay: 100,

      // Health Monitoring
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'build',
        'dist',
        '.git',
        '*.log',
        'temp',
        'uploads',
        'public/data',
        'backend/logs',
        'backend/uploads',
      ],

      // Advanced Process Settings
      kill_timeout: 10000, // More time for graceful shutdown of both processes
      listen_timeout: 30000, // More time for app to start listening (React takes longer)
      wait_ready: false, // Don't wait for ready signal (combined process)

      // Performance Optimizations for VPS
      source_map_support: false, // Disable for better performance
      disable_trace: true, // Disable tracing for better performance
      // VPS: Optimize for production
      node_args: '--max-old-space-size=2048 --optimize-for-size',
      interpreter_args: '',

      // Additional PM2 Features
      pmx: false, // Disable PMX for better performance

      // Instance Variables for debugging
      instance_var: 'NODE_APP_INSTANCE',
    },
    {
      name: 'dashboard-backend',
      script: './server.js',
      cwd: './backend',

      // Process Configuration
      instances: 1,
      exec_mode: 'fork',

      // Environment Variables
      env: {
        NODE_ENV: 'development',
        PORT: 5009,
        NODE_OPTIONS: '--no-deprecation --max-old-space-size=8192',
        ALLOW_START_WITHOUT_DB: 'true', // Allow backend to start without database (for testing)
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5009,
        NODE_OPTIONS: '--no-deprecation --max-old-space-size=8192',
        // VPS Configuration
        REACT_APP_API_URL: 'http://srv512766.hstgr.cloud:5009/api',
      },

      // Environment File Loading
      env_file: './.env',

      // Logging Configuration
      log_file: './logs/pm2-backend-combined.log',
      out_file: './logs/pm2-backend-out.log',
      error_file: './logs/pm2-backend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,

      // Process Management
      max_memory_restart: '1G',
      min_uptime: '30s',
      max_restarts: 15,
      restart_delay: 4000,
      autorestart: true,

      // Health Monitoring
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'uploads', '*.log', '.git'],

      // Advanced Process Settings
      kill_timeout: 5000,
      listen_timeout: 10000,
      wait_ready: false,
      shutdown_with_message: true,

      // Performance Optimizations
      source_map_support: false,
      disable_trace: true,
      pmx: false,
    },
    {
      name: 'dashboard-frontend',
      script: './start-frontend.js',
      cwd: './',

      // Process Configuration
      instances: 1,
      exec_mode: 'fork',

      // Environment Variables
      env: {
        NODE_ENV: 'development',
        PORT: 3006,
        REACT_APP_API_URL: 'http://srv512766.hstgr.cloud:5009/api',
        BROWSER: 'none',
        NODE_OPTIONS: '--no-deprecation --max-old-space-size=8192',
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3006,
        REACT_APP_API_URL: 'http://srv512766.hstgr.cloud:5009/api', // VPS backend API URL
        BROWSER: 'none',
        NODE_OPTIONS: '--no-deprecation --max-old-space-size=8192',
      },

      // Logging Configuration
      log_file: './logs/pm2-frontend-combined.log',
      out_file: './logs/pm2-frontend-out.log',
      error_file: './logs/pm2-frontend-error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true,

      // Process Management
      max_memory_restart: '2G', // React dev server can use more memory
      min_uptime: '30s',
      max_restarts: 15,
      restart_delay: 4000,
      autorestart: true,

      // Health Monitoring
      watch: false,
      ignore_watch: [
        'node_modules',
        'logs',
        'build',
        '*.log',
        '.git',
        'public/data',
      ],

      // Advanced Process Settings
      kill_timeout: 5000,
      listen_timeout: 30000, // React dev server takes longer to start
      wait_ready: false,

      // Performance Optimizations
      source_map_support: false,
      disable_trace: true,
      pmx: false,
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'root',
      host: 'YOUR_SERVER_IP',
      ref: 'origin/master',
      repo: 'YOUR_REPOSITORY_URL',
      path: '/var/www/analytics-dashboard',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && cd backend && npm install && cd .. && pm2 reload ecosystem.config.js --env production && pm2 save',
      'pre-setup': 'mkdir -p logs backend/logs temp uploads backend/uploads',
    },
  },
};
