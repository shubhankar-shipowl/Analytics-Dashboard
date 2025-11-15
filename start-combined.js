#!/usr/bin/env node

/**
 * Combined Start Script for PM2
 * Runs both backend and frontend together
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '5009';
const frontendPort = process.env.FRONTEND_PORT || '3006';
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5009/api';
process.env.BROWSER = 'none'; // Don't auto-open browser
// Suppress deprecation warnings if not already set
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
console.log('🚀 STARTING ANALYTICS DASHBOARD');
console.log('═══════════════════════════════════════════════════════════');
console.log(`📊 Environment: ${process.env.NODE_ENV}`);
console.log(`🔌 Backend Port: ${process.env.PORT}`);
console.log(`🔌 Frontend Port: ${frontendPort}`);
console.log('');
console.log('📍 Direct Access URLs:');
console.log(`   Backend API:    http://localhost:${process.env.PORT}/api`);
console.log(`   Backend API:    http://${serverIP}:${process.env.PORT}/api`);
console.log(`   Frontend:       http://localhost:${frontendPort}`);
console.log(`   Frontend:       http://${serverIP}:${frontendPort}`);
console.log(`   API Docs:       http://localhost:${process.env.PORT}/api-docs`);
console.log('');
console.log('🌐 If using Nginx:');
console.log(`   Frontend:       https://your-domain.com (or http://your-domain.com)`);
console.log(`   Backend API:    https://your-domain.com/api`);
console.log(`   API Docs:       https://your-domain.com/api-docs`);
console.log('');
console.log('💡 Note: Replace "your-domain.com" with your actual domain or IP');
console.log('═══════════════════════════════════════════════════════════');
console.log('');

const isWindows = process.platform === 'win32';

// Start backend - use npm start (PM2 handles restarts, so nodemon not needed)
const backendPath = path.join(__dirname, 'backend');
// Always use npm start for PM2 (no nodemon needed - PM2 handles restarts)
const backendCmd = isWindows 
  ? `cd /d "${backendPath}" && npm start`
  : `cd "${backendPath}" && npm start`;

const backend = spawn(backendCmd, [], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'], // Pipe stdout and stderr
  shell: true,
  env: { ...process.env, PORT: '5009', NODE_OPTIONS: process.env.NODE_OPTIONS || '--no-deprecation' }
});

// Pipe backend output
backend.stdout.on('data', (data) => {
  console.log(`[backend] ${data.toString().trim()}`);
});
backend.stderr.on('data', (data) => {
  console.error(`[backend] ${data.toString().trim()}`);
});

// Start frontend
const frontendCmd = 'npm run frontend:dev';
const frontend = spawn(frontendCmd, [], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'], // Pipe stdout and stderr
  shell: true,
  env: { ...process.env, PORT: frontendPort, NODE_OPTIONS: process.env.NODE_OPTIONS || '--no-deprecation' }
});

// Pipe frontend output
frontend.stdout.on('data', (data) => {
  const output = data.toString().trim();
  // Only log important frontend messages
  if (output.includes('Compiled') || output.includes('Local:') || output.includes('error') || output.includes('Error')) {
    console.log(`[frontend] ${output}`);
  }
});
frontend.stderr.on('data', (data) => {
  console.error(`[frontend] ${data.toString().trim()}`);
});

// Handle errors
backend.on('error', (error) => {
  console.error('❌ Backend failed to start:', error);
  frontend.kill();
  process.exit(1);
});

frontend.on('error', (error) => {
  console.error('❌ Frontend failed to start:', error);
  backend.kill();
  process.exit(1);
});

// Handle exits
let exited = false;
const handleExit = (code, processName) => {
  if (exited) return;
  exited = true;
  console.log(`\n🛑 ${processName} exited with code ${code}`);
  backend.kill();
  frontend.kill();
  process.exit(code || 0);
};

backend.on('exit', (code) => {
  console.log(`\n🛑 Backend exited with code ${code}`);
  frontend.kill();
  process.exit(code || 0);
});

frontend.on('exit', (code) => {
  console.log(`\n🛑 Frontend exited with code ${code}`);
  backend.kill();
  process.exit(code || 0);
});

// Handle signals for graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📴 Received SIGTERM, shutting down gracefully...');
  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');
  setTimeout(() => {
    backend.kill('SIGKILL');
    frontend.kill('SIGKILL');
    process.exit(0);
  }, 5000);
});

process.on('SIGINT', () => {
  console.log('\n📴 Received SIGINT, shutting down gracefully...');
  backend.kill('SIGINT');
  frontend.kill('SIGINT');
  setTimeout(() => {
    backend.kill('SIGKILL');
    frontend.kill('SIGKILL');
    process.exit(0);
  }, 5000);
});

// Keep process alive
process.stdin.resume();

