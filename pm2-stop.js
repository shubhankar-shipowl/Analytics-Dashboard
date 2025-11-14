#!/usr/bin/env node

/**
 * PM2 Stop Script
 * Helper script to stop the application with PM2
 */

const { execSync } = require('child_process');

// Check if PM2 is installed
try {
  execSync('pm2 --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ PM2 is not installed');
  process.exit(1);
}

console.log('🛑 Stopping Dashboard application...\n');

try {
  execSync('pm2 stop ecosystem.config.js', { stdio: 'inherit' });
  console.log('\n✅ Application stopped successfully!');
} catch (error) {
  console.error('❌ Failed to stop application:', error.message);
  process.exit(1);
}

