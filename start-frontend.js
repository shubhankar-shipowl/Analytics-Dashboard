#!/usr/bin/env node

/**
 * Frontend Start Wrapper for PM2
 * This script wraps react-scripts start for PM2 compatibility on Windows
 */

const { spawn } = require('child_process');
const path = require('path');

// Use npm to run react-scripts start
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['start'];

// Set environment variables
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.env.PORT = process.env.PORT || process.env.FRONTEND_PORT || '3003';
process.env.REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
process.env.BROWSER = 'none'; // Don't auto-open browser

console.log('Starting React development server...');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`PORT: ${process.env.PORT}`);
console.log(`API URL: ${process.env.REACT_APP_API_URL}`);

// Spawn npm start
const child = spawn(npm, args, {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
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

