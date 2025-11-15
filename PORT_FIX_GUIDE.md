# Port Conflict Fix Guide

## Problem
`EADDRINUSE: address already in use 0.0.0.0:5009` - Port 5009 (or 3006) is already in use by another process.

## Quick Fix Commands

### 1. Check if port is in use:
```bash
# Check port 5009 (backend)
lsof -i :5009

# Check port 3006 (frontend)
lsof -i :3006

# Alternative commands:
netstat -tuln | grep :5009
ss -tuln | grep :5009
```

### 2. Kill process on port (Automatic):
```bash
# Use the provided script
./kill-port.sh 5009
./kill-port.sh 3006

# Or manually:
lsof -ti :5009 | xargs kill -9
lsof -ti :3006 | xargs kill -9
```

### 3. Interactive fix:
```bash
./fix-port.sh
```

### 4. Complete restart (Recommended):
```bash
# Stop PM2 processes
pm2 stop dashboard
pm2 delete dashboard

# Kill any remaining processes on ports
lsof -ti :5009 | xargs kill -9 2>/dev/null
lsof -ti :3006 | xargs kill -9 2>/dev/null

# Wait a moment
sleep 2

# Start fresh
pm2 start ecosystem.config.js --only dashboard --env production
pm2 save
```

## Using the Start Script (Auto-fix)

The `start.sh` script now automatically checks and frees ports before starting:

```bash
./start.sh
```

It will:
1. Check if ports 5009 and 3006 are in use
2. Automatically kill processes using those ports
3. Start the application

## Manual Steps

### Step 1: Find what's using the port
```bash
lsof -i :5009
```

Output example:
```
COMMAND   PID USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
node    12345 user   23u  IPv6  12345      0t0  TCP *:5009 (LISTEN)
```

### Step 2: Kill the process
```bash
# Using PID from above
kill -9 12345

# Or kill all processes on port
lsof -ti :5009 | xargs kill -9
```

### Step 3: Verify port is free
```bash
lsof -i :5009
# Should return nothing
```

### Step 4: Restart application
```bash
pm2 restart dashboard
# or
./start.sh
```

## Common Causes

1. **PM2 process still running**: Previous PM2 process didn't stop properly
2. **Manual node process**: Started with `npm start` or `node server.js` directly
3. **Crashed process**: Process crashed but didn't release the port
4. **Multiple instances**: Multiple PM2 instances running

## Prevention

The `start.sh` script now automatically:
- ✅ Checks ports before starting
- ✅ Kills conflicting processes
- ✅ Ensures clean startup

## Troubleshooting

### If port still shows as in use after killing:

1. **Check for zombie processes**:
   ```bash
   ps aux | grep node
   ps aux | grep react-scripts
   ```

2. **Check PM2 processes**:
   ```bash
   pm2 list
   pm2 delete all  # Delete all PM2 processes
   ```

3. **Check system processes**:
   ```bash
   sudo lsof -i :5009
   sudo kill -9 <PID>
   ```

4. **Wait and retry**:
   ```bash
   sleep 5
   lsof -i :5009
   ```

### If you can't kill the process:

1. **Check if it's a system process**:
   ```bash
   sudo lsof -i :5009
   ```

2. **Use sudo to kill**:
   ```bash
   sudo lsof -ti :5009 | xargs sudo kill -9
   ```

3. **Check process owner**:
   ```bash
   ps aux | grep <PID>
   ```

## Quick Reference

| Command | Description |
|---------|-------------|
| `lsof -i :5009` | Check what's using port 5009 |
| `lsof -ti :5009 \| xargs kill -9` | Kill process on port 5009 |
| `./kill-port.sh 5009` | Quick kill script |
| `./fix-port.sh` | Interactive port fixer |
| `./start.sh` | Auto-fix and start |
| `pm2 delete all` | Delete all PM2 processes |

---

**Last Updated**: 2024
**Status**: Port conflict auto-fix implemented

