#!/usr/bin/env node

/**
 * PM2 Start Script
 * Helper script to start the application with PM2
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Check if PM2 is installed
try {
  execSync('pm2 --version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ PM2 is not installed. Please install it first:');
  console.error('   npm install -g pm2');
  process.exit(1);
}

// Check if ecosystem file exists
const ecosystemFile = path.join(__dirname, 'ecosystem.config.js');
if (!fs.existsSync(ecosystemFile)) {
  console.error('❌ ecosystem.config.js not found');
  process.exit(1);
}

// Get environment (default to development)
const env = process.argv[2] === '--prod' || process.argv[2] === '--production' ? 'production' : 'development';

console.log(`🚀 Starting Dashboard application with PM2 (${env} mode)...\n`);

try {
  // Start with PM2
  if (env === 'production') {
    execSync('pm2 start ecosystem.config.js --env production', { stdio: 'inherit' });
  } else {
    execSync('pm2 start ecosystem.config.js', { stdio: 'inherit' });
  }
  
  console.log('\n✅ Application started successfully!');
  console.log('\n📊 Useful PM2 commands:');
  console.log('   pm2 status              - View process status');
  console.log('   pm2 logs                - View logs');
  console.log('   pm2 monit               - Monitor processes');
  console.log('   pm2 stop all            - Stop all processes');
  console.log('   pm2 restart all         - Restart all processes');
  console.log('   pm2 delete all          - Delete all processes');
  console.log('   pm2 save                - Save current process list');
  console.log('   pm2 startup             - Setup PM2 to start on system boot\n');
} catch (error) {
  console.error('❌ Failed to start application:', error.message);
  process.exit(1);
}

