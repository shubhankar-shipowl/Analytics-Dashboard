# PM2 Corruption Fix Guide

## Problem
When running `npm run pm2:start` on VPS, you get this error:
```
[PM2][ERROR] Process 9 not found
TypeError: Cannot read properties of undefined (reading 'pm2_env')
```

This happens when PM2's internal process list gets corrupted, usually after:
- Unexpected server shutdown
- PM2 daemon crash
- Process killed manually
- System reboot without proper PM2 cleanup

## Quick Fix (Recommended)

### Option 1: Use the Fix Script (Easiest)
```bash
cd /root/Analytics-Dashboard
./fix-pm2.sh
```

This script will:
1. Stop all PM2 processes
2. Delete all PM2 processes
3. Kill any remaining processes on ports 5009 and 3006
4. Clear PM2 logs
5. Reset PM2 daemon
6. Start the application fresh
7. Save PM2 configuration

### Option 2: Manual Fix (Step by Step)
```bash
cd /root/Analytics-Dashboard

# Step 1: Stop all PM2 processes
pm2 stop all

# Step 2: Delete all PM2 processes
pm2 delete all

# Step 3: Kill PM2 daemon completely
pm2 kill

# Step 4: Wait a moment
sleep 2

# Step 5: Kill any remaining processes on ports
lsof -ti :5009 | xargs kill -9 2>/dev/null || true
lsof -ti :3006 | xargs kill -9 2>/dev/null || true

# Step 6: Start PM2 daemon fresh
pm2 ping || true

# Step 7: Start the application
pm2 start ecosystem.config.js --only dashboard --env production

# Step 8: Save PM2 configuration
pm2 save

# Step 9: Check status
pm2 status
```

### Option 3: Use the Start Script (Auto-fix)
```bash
cd /root/Analytics-Dashboard
./start.sh production
```

The start script now automatically detects and fixes PM2 corruption before starting.

## Alternative: Use Start Script Instead

Instead of `npm run pm2:start`, use:
```bash
./start.sh production
```

This script:
- ✅ Automatically fixes PM2 corruption
- ✅ Checks and frees ports
- ✅ Installs missing dependencies
- ✅ Shows helpful status information

## Verify the Fix

After running the fix, verify everything is working:

```bash
# Check PM2 status
pm2 status

# Should show:
# ┌────┬──────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┐
# │ id │ name         │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │
# ├────┼──────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┤
# │ 0  │ dashboard    │ default     │ 1.0.0   │ fork    │ 12345    │ 5s     │ 0    │ online    │
# └────┴──────────────┴─────────────┴──────────┴─────────┴──────────┴────────┴──────┴───────────┘

# Check logs
pm2 logs dashboard --lines 20

# Test backend
curl http://localhost:5009/api/health

# Should return JSON with status: "OK"
```

## Prevention

To prevent PM2 corruption in the future:

1. **Always use PM2 commands to stop processes:**
   ```bash
   pm2 stop dashboard
   pm2 delete dashboard
   ```
   Don't use `kill -9` on PM2 processes directly.

2. **Save PM2 configuration after changes:**
   ```bash
   pm2 save
   ```

3. **Set up PM2 startup script:**
   ```bash
   pm2 startup
   pm2 save
   ```
   This ensures PM2 starts automatically after server reboot.

4. **Use graceful shutdown:**
   ```bash
   pm2 stop dashboard  # Graceful stop
   # Wait a few seconds
   pm2 delete dashboard  # Then delete
   ```

## Troubleshooting

### If fix-pm2.sh doesn't work:

1. **Check if PM2 is installed:**
   ```bash
   which pm2
   pm2 --version
   ```

2. **Reinstall PM2 if needed:**
   ```bash
   npm uninstall -g pm2
   npm install -g pm2
   ```

3. **Check PM2 home directory:**
   ```bash
   echo $PM2_HOME
   # Usually: ~/.pm2
   ```

4. **Manually clear PM2 data (last resort):**
   ```bash
   pm2 kill
   rm -rf ~/.pm2
   pm2 ping
   ```

### If ports are still in use:

```bash
# Check what's using the ports
lsof -i :5009
lsof -i :3006

# Kill processes manually
kill -9 <PID>
```

### If application still won't start:

1. **Check backend dependencies:**
   ```bash
   cd /root/Analytics-Dashboard/backend
   npm install
   ```

2. **Check frontend dependencies:**
   ```bash
   cd /root/Analytics-Dashboard
   npm install
   ```

3. **Check logs for errors:**
   ```bash
   pm2 logs dashboard --err --lines 50
   ```

## Summary

**Quick Fix Command:**
```bash
cd /root/Analytics-Dashboard && ./fix-pm2.sh
```

**Or use the start script:**
```bash
cd /root/Analytics-Dashboard && ./start.sh production
```

Both will automatically fix PM2 corruption and start your application.

---

**Last Updated**: 2024
**Status**: PM2 corruption auto-fix implemented

