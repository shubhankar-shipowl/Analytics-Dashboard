#!/bin/bash

# Deployment Health Check Script
# Run this after deployment to verify everything is working

echo "═══════════════════════════════════════════════════════════"
echo "🔍 Deployment Health Check"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check PM2
echo "📊 PM2 Status:"
if pm2 list | grep -q "dashboard.*online"; then
    echo -e "${GREEN}✅ Dashboard is running${NC}"
    pm2 list | grep dashboard
else
    echo -e "${RED}❌ Dashboard is not running${NC}"
fi
echo ""

# Check ports
echo "🔌 Port Status:"
if lsof -i :3006 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 3006 is in use${NC}"
    lsof -i :3006 | head -2
else
    echo -e "${RED}❌ Port 3006 is NOT in use${NC}"
fi

if lsof -i :5009 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Port 5009 (backend) is in use${NC}"
else
    echo -e "${YELLOW}⚠️  Port 5009 (backend) is NOT in use${NC}"
fi
echo ""

# Check Nginx
echo "🌐 Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✅ Nginx is running${NC}"
else
    echo -e "${RED}❌ Nginx is NOT running${NC}"
fi

if sudo nginx -t 2>/dev/null; then
    echo -e "${GREEN}✅ Nginx configuration is valid${NC}"
else
    echo -e "${RED}❌ Nginx configuration has errors${NC}"
fi
echo ""

# Test endpoints
echo "🏥 Health Checks:"
echo ""

# Backend direct
echo -n "Backend (direct): "
if curl -s http://localhost:5009/api/health > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Backend via Nginx
echo -n "Backend (via Nginx): "
if curl -s http://localhost:3006/api/health > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Frontend
echo -n "Frontend: "
if curl -s http://localhost:3006 > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi
echo ""

# Database connection
echo "💾 Database Connection:"
cd backend 2>/dev/null
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
    const [rows] = await conn.query('SELECT COUNT(*) as total FROM orders');
    console.log('✅ Connected - Total records:', rows[0].total);
    await conn.end();
    process.exit(0);
  } catch(e) {
    console.error('❌ Connection failed:', e.message);
    process.exit(1);
  }
})();
" 2>/dev/null; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Database connection failed${NC}"
fi
cd .. 2>/dev/null
echo ""

# Check logs for errors
echo "📋 Recent Errors (last 5 lines):"
pm2 logs dashboard --lines 5 --nostream 2>&1 | grep -i error | tail -5 || echo "No recent errors"
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "💡 If issues found:"
echo "   pm2 logs dashboard --lines 50"
echo "   sudo tail -f /var/log/nginx/analytics-dashboard-error.log"
echo "   pm2 restart dashboard"
echo "═══════════════════════════════════════════════════════════"

