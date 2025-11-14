#!/usr/bin/env node

/**
 * Combined Start Script for PM2
 * Runs both backend and frontend together
 */

const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || '5009';
const frontendPort = process.env.FRONTEND_PORT || '3006';
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5009/api';
process.env.BROWSER = 'none'; // Don't auto-open browser

console.log('🚀 Starting Dashboard (Backend + Frontend)...');
console.log(`📊 Environment: ${process.env.NODE_ENV}`);
console.log(`🔗 Backend: http://localhost:5009`);
console.log(`🌐 Frontend: http://localhost:${frontendPort}`);
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
  env: { ...process.env, PORT: '5009' }
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
  env: { ...process.env, PORT: frontendPort }
});

// Pipe frontend output
frontend.stdout.on('data', (data) => {
  console.log(`[frontend] ${data.toString().trim()}`);
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
