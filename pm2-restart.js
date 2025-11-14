#!/usr/bin/env node

/**
 * PM2 Restart Script
 * Helper script to restart the application with PM2
 */

const { execSync } = require('child_process');

// Check if PM2 is installed
try {
  execSync('pm2 --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ PM2 is not installed');
  process.exit(1);
}

console.log('🔄 Restarting Dashboard application...\n');

try {
  execSync('pm2 restart ecosystem.config.js', { stdio: 'inherit' });
  console.log('\n✅ Application restarted successfully!');
} catch (error) {
  console.error('❌ Failed to restart application:', error.message);
  process.exit(1);
}

