#!/bin/bash

# Backend Health Check Script
# This script checks if the backend is running and accessible

echo "═══════════════════════════════════════════════════════════"
echo "🔍 BACKEND HEALTH CHECK"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check PM2 status
echo "📊 PM2 Status:"
pm2 status | grep -E "dashboard|backend" || echo "❌ No PM2 processes found"
echo ""

# Check if backend port is listening
echo "🔌 Port 5009 Status:"
if lsof -i :5009 > /dev/null 2>&1; then
    echo "✅ Port 5009 is in use"
    lsof -i :5009 | head -2
else
    echo "❌ Port 5009 is NOT in use - backend is not running"
fi
echo ""

# Check if frontend port is listening
echo "🔌 Port 3006 Status:"
if lsof -i :3006 > /dev/null 2>&1; then
    echo "✅ Port 3006 is in use"
    lsof -i :3006 | head -2
else
    echo "❌ Port 3006 is NOT in use - frontend is not running"
fi
echo ""

# Test backend health endpoint
echo "🏥 Backend Health Check:"
echo "Testing: http://localhost:5009/api/health"
HEALTH_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --max-time 5 http://localhost:5009/api/health 2>&1)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | grep -v "HTTP_CODE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is responding (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
else
    echo "❌ Backend is NOT responding (HTTP $HTTP_CODE)"
    if [ -z "$HTTP_CODE" ]; then
        echo "   Error: Could not connect to backend"
    fi
fi
echo ""

# Test from network IP
echo "🌐 Network Health Check:"
NETWORK_IP=$(hostname -I | awk '{print $1}')
echo "Testing: http://$NETWORK_IP:5009/api/health"
NETWORK_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" --max-time 5 http://$NETWORK_IP:5009/api/health 2>&1)
NETWORK_HTTP_CODE=$(echo "$NETWORK_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)

if [ "$NETWORK_HTTP_CODE" = "200" ]; then
    echo "✅ Backend is accessible from network (HTTP $NETWORK_HTTP_CODE)"
else
    echo "❌ Backend is NOT accessible from network (HTTP $NETWORK_HTTP_CODE)"
fi
echo ""

# Check PM2 logs for errors
echo "📋 Recent PM2 Logs (last 20 lines):"
pm2 logs dashboard --lines 20 --nostream 2>&1 | tail -20
echo ""

# Check backend process
echo "🔍 Backend Process Check:"
if pgrep -f "node.*server.js" > /dev/null; then
    echo "✅ Backend Node.js process is running"
    pgrep -f "node.*server.js" | xargs ps -p
else
    echo "❌ Backend Node.js process is NOT running"
fi
echo ""

# Check frontend process
echo "🔍 Frontend Process Check:"
if pgrep -f "react-scripts" > /dev/null; then
    echo "✅ Frontend React process is running"
    pgrep -f "react-scripts" | xargs ps -p
else
    echo "❌ Frontend React process is NOT running"
fi
echo ""

echo "═══════════════════════════════════════════════════════════"
echo "💡 If backend is not running, try:"
echo "   pm2 restart dashboard"
echo "   or"
echo "   pm2 delete dashboard && pm2 start ecosystem.config.js --only dashboard --env production"
echo "═══════════════════════════════════════════════════════════"

