#!/bin/bash

# Quick Port Killer Script
# Automatically kills processes on specified ports

PORT=${1:-5009}

echo "🔍 Checking port $PORT..."

if lsof -i :$PORT > /dev/null 2>&1; then
    echo "⚠️  Port $PORT is in use"
    echo ""
    echo "Process details:"
    lsof -i :$PORT
    echo ""
    
    PIDS=$(lsof -ti :$PORT)
    if [ ! -z "$PIDS" ]; then
        echo "Killing process(es): $PIDS"
        echo "$PIDS" | xargs kill -9 2>/dev/null
        sleep 1
        
        if ! lsof -i :$PORT > /dev/null 2>&1; then
            echo "✅ Port $PORT is now FREE"
        else
            echo "❌ Failed to free port $PORT"
            exit 1
        fi
    fi
else
    echo "✅ Port $PORT is already FREE"
fi

