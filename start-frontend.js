#!/usr/bin/env node

/**
 * Frontend Start Wrapper for PM2
 * This script wraps react-scripts start for PM2 compatibility
 */

const { spawn } = require('child_process');
const os = require('os');

// Use npm to run react-scripts start
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['start'];

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
const frontendPort = process.env.PORT || process.env.FRONTEND_PORT || '3006';

// CRITICAL: Set REACT_APP_API_URL for frontend
// For VPS: Use the VPS URL, for local: use localhost
const isVPS =
  process.env.REACT_APP_API_URL &&
  process.env.REACT_APP_API_URL.includes('srv512766.hstgr.cloud');
const defaultAPIUrl = isVPS
  ? 'http://srv512766.hstgr.cloud:5009/api'
  : process.env.REACT_APP_API_URL || 'http://localhost:5009/api';

process.env.REACT_APP_API_URL = defaultAPIUrl;
process.env.BROWSER = 'none'; // Don't auto-open browser

// Suppress deprecation warnings
if (!process.env.NODE_OPTIONS) {
  process.env.NODE_OPTIONS = '--no-deprecation';
}

// Get server IP address
const networkInterfaces = os.networkInterfaces();
let serverIP = 'localhost';
for (const interfaceName in networkInterfaces) {
  const interfaces = networkInterfaces[interfaceName];
  for (const iface of interfaces) {
    if (iface.family === 'IPv4' && !iface.internal) {
      serverIP = iface.address;
      break;
    }
  }
  if (serverIP !== 'localhost') break;
}

console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('🌐 STARTING FRONTEND (React Development Server)');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📊 Environment: ${process.env.NODE_ENV}`);
console.log(`🔌 Frontend Port: ${frontendPort}`);
console.log(`🔗 API URL: ${process.env.REACT_APP_API_URL}`);
console.log('');
console.log('📍 Access URLs:');
console.log(`   Local:    http://localhost:${frontendPort}`);
console.log(`   Network:  http://${serverIP}:${frontendPort}`);
console.log('');
console.log('🌐 If using Nginx:');
console.log(`   Frontend: https://your-domain.com (or http://your-domain.com)`);
console.log(`   Backend:  https://your-domain.com/api`);
console.log('');
console.log('💡 Note: Replace "your-domain.com" with your actual domain or IP');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// Spawn npm start
// CRITICAL: Pass REACT_APP_API_URL explicitly to ensure React gets it
const frontendEnv = {
  ...process.env,
  PORT: frontendPort,
  NODE_OPTIONS: process.env.NODE_OPTIONS || '--no-deprecation',
  REACT_APP_API_URL: process.env.REACT_APP_API_URL, // Explicitly pass to React
  BROWSER: 'none',
};

console.log(`🔧 Frontend Environment:`);
console.log(`   REACT_APP_API_URL: ${frontendEnv.REACT_APP_API_URL}`);
console.log(`   PORT: ${frontendEnv.PORT}`);
console.log('');

const child = spawn(npm, args, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true,
  env: frontendEnv,
});

// Handle process events
child.on('error', (error) => {
  console.error('Failed to start frontend:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`Frontend process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle signals
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  child.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  child.kill('SIGINT');
});
