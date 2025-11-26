#!/bin/bash

# Deployment Script for Hostinger VPS
# This script automates the deployment process

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════"
echo "🚀 Analytics Dashboard - Production Deployment"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running as root (for some commands)
if [ "$EUID" -eq 0 ]; then 
   echo -e "${RED}⚠️  Please don't run this script as root${NC}"
   exit 1
fi

# Step 1: Check prerequisites
echo "📋 Step 1: Checking prerequisites..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "   Install with: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt install -y nodejs"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✅ Node.js: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
NPM_VERSION=$(npm --version)
echo -e "${GREEN}✅ npm: $NPM_VERSION${NC}"

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 is not installed${NC}"
    echo "   Installing PM2..."
    sudo npm install -g pm2
fi
PM2_VERSION=$(pm2 --version)
echo -e "${GREEN}✅ PM2: $PM2_VERSION${NC}"

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}⚠️  Nginx is not installed${NC}"
    echo "   Install with: sudo apt install -y nginx"
    exit 1
fi
NGINX_VERSION=$(nginx -v 2>&1 | cut -d'/' -f2)
echo -e "${GREEN}✅ Nginx: $NGINX_VERSION${NC}"

echo ""

# Step 2: Install/Update dependencies
echo "📦 Step 2: Installing dependencies..."
echo ""

echo "Installing root dependencies..."
npm install

echo "Installing backend dependencies..."
cd backend
npm install
cd ..

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Step 3: Check environment files
echo "🔧 Step 3: Checking environment configuration..."
echo ""

if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  backend/.env not found${NC}"
    echo "   Creating from .env.example..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}⚠️  Please update backend/.env with your database credentials${NC}"
    else
        echo -e "${RED}❌ backend/.env.example not found. Please create backend/.env manually${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ backend/.env exists${NC}"
fi

echo ""

# Step 4: Test database connection
echo "🔌 Step 4: Testing database connection..."
echo ""

cd backend
if node -e "
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'dashboard_db'
    });
    await conn.query('SELECT 1');
    await conn.end();
    console.log('✅ Database connection successful');
    process.exit(0);
  } catch(e) {
    console.error('❌ Database connection failed:', e.message);
    process.exit(1);
  }
})();
" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
    echo "   Please check your backend/.env configuration"
    exit 1
fi
cd ..

echo ""

# Step 5: Setup Nginx
echo "🌐 Step 5: Configuring Nginx..."
echo ""

if [ -f "nginx.conf" ]; then
    echo "Copying Nginx configuration..."
    sudo cp nginx.conf /etc/nginx/sites-available/analytics-dashboard
    
    if [ ! -L "/etc/nginx/sites-enabled/analytics-dashboard" ]; then
        echo "Creating symlink..."
        sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
    fi
    
    echo "Testing Nginx configuration..."
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
        echo "Reloading Nginx..."
        sudo systemctl reload nginx
        echo -e "${GREEN}✅ Nginx reloaded${NC}"
    else
        echo -e "${RED}❌ Nginx configuration test failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠️  nginx.conf not found. Skipping Nginx setup${NC}"
fi

echo ""

# Step 6: Start/Restart PM2
echo "🚀 Step 6: Starting application with PM2..."
echo ""

# Stop existing instance if running
pm2 delete dashboard 2>/dev/null || true

# Start in production mode
pm2 start ecosystem.config.js --only dashboard --env production

# Save PM2 configuration
pm2 save

echo -e "${GREEN}✅ Application started with PM2${NC}"
echo ""

# Step 7: Wait and verify
echo "⏳ Step 7: Waiting for services to start..."
sleep 5

echo "Checking services..."
echo ""

# Check PM2
if pm2 list | grep -q "dashboard.*online"; then
    echo -e "${GREEN}✅ PM2: Application is running${NC}"
else
    echo -e "${RED}❌ PM2: Application is not running${NC}"
    echo "   Check logs: pm2 logs dashboard"
    exit 1
fi

# Check backend
if curl -s http://localhost:5009/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend: Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Backend: Health check failed (may need more time)${NC}"
fi

# Check frontend
if curl -s http://localhost:3006 > /dev/null; then
    echo -e "${GREEN}✅ Frontend: Responding${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend: Not responding (may need more time)${NC}"
fi

# Check Nginx
if curl -s http://localhost:3006/api/health > /dev/null; then
    echo -e "${GREEN}✅ Nginx: Proxy working${NC}"
else
    echo -e "${YELLOW}⚠️  Nginx: Proxy check failed${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📍 Access your dashboard:"
echo "   http://srv512766.hstgr.cloud:3006"
echo "   or"
echo "   http://$(hostname -I | awk '{print $1}'):3006"
echo ""
echo "📊 Useful commands:"
echo "   pm2 status              - Check application status"
echo "   pm2 logs dashboard      - View logs"
echo "   pm2 restart dashboard   - Restart application"
echo "   pm2 monit               - Monitor in real-time"
echo ""
echo "🔧 Configuration files:"
echo "   PM2: ecosystem.config.js"
echo "   Nginx: /etc/nginx/sites-available/analytics-dashboard"
echo "   Backend: backend/.env"
echo ""
echo "═══════════════════════════════════════════════════════════"
