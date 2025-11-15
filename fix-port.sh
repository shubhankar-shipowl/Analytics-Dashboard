#!/bin/bash

# Fix Port Conflict Script
# Checks and kills processes using ports 5009 and 3006

echo "═══════════════════════════════════════════════════════════"
echo "🔧 PORT CONFLICT FIXER"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Function to check and kill process on port
fix_port() {
    local port=$1
    local service=$2
    
    echo "Checking port $port ($service)..."
    
    # Check if port is in use
    if lsof -i :$port > /dev/null 2>&1; then
        echo "  ⚠️  Port $port is IN USE"
        echo "  Process details:"
        lsof -i :$port
        
        # Get PID
        PID=$(lsof -ti :$port)
        if [ ! -z "$PID" ]; then
            echo ""
            echo "  🔍 Found process(es) using port $port:"
            ps -p $PID -o pid,ppid,cmd
            
            echo ""
            read -p "  ❓ Kill process(es) on port $port? (y/n): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                echo "  🗑️  Killing process(es)..."
                lsof -ti :$port | xargs kill -9 2>/dev/null
                sleep 1
                
                # Verify port is free
                if ! lsof -i :$port > /dev/null 2>&1; then
                    echo "  ✅ Port $port is now FREE"
                else
                    echo "  ❌ Failed to free port $port"
                fi
            else
                echo "  ⏭️  Skipped killing process"
            fi
        fi
    else
        echo "  ✅ Port $port is FREE"
    fi
    echo ""
}

# Check and fix backend port (5009)
fix_port 5009 "Backend"

# Check and fix frontend port (3006)
fix_port 3006 "Frontend"

echo "═══════════════════════════════════════════════════════════"
echo "💡 Quick Commands:"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Check port:"
echo "  lsof -i :5009"
echo "  lsof -i :3006"
echo ""
echo "Kill process on port (force):"
echo "  lsof -ti :5009 | xargs kill -9"
echo "  lsof -ti :3006 | xargs kill -9"
echo ""
echo "Check PM2 status:"
echo "  pm2 status"
echo "  pm2 delete all"
echo ""

