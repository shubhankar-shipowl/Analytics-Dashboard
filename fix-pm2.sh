#!/bin/bash

# PM2 Corruption Fix Script
# This script fixes PM2 stale process errors by cleaning up and restarting

echo "🔧 Fixing PM2 corruption issue..."

# Step 1: Stop all PM2 processes
echo "📴 Stopping all PM2 processes..."
pm2 stop all 2>/dev/null || true

# Step 2: Delete all PM2 processes
echo "🗑️  Deleting all PM2 processes..."
pm2 delete all 2>/dev/null || true

# Step 3: Kill any remaining node processes on our ports
echo "🔪 Killing any remaining processes on ports 5009 and 3006..."
lsof -ti :5009 | xargs kill -9 2>/dev/null || true
lsof -ti :3006 | xargs kill -9 2>/dev/null || true

# Step 4: Clear PM2 logs (optional, but helps with corruption)
echo "🧹 Cleaning PM2 logs..."
pm2 flush 2>/dev/null || true

# Step 5: Reset PM2 (if corruption persists)
echo "🔄 Resetting PM2..."
pm2 kill 2>/dev/null || true
sleep 2

# Step 6: Start PM2 daemon fresh
echo "🚀 Starting PM2 daemon..."
pm2 resurrect 2>/dev/null || pm2 ping || true

# Step 7: Wait a moment
sleep 2

# Step 8: Start the application
echo "✅ Starting application..."
cd "$(dirname "$0")"
pm2 start ecosystem.config.js --only dashboard --env production

# Step 9: Save PM2 configuration
echo "💾 Saving PM2 configuration..."
pm2 save

# Step 10: Show status
echo ""
echo "📊 PM2 Status:"
pm2 status

echo ""
echo "✅ Done! Check logs with: pm2 logs dashboard"

