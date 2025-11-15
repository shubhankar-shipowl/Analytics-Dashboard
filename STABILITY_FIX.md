# Backend Stability Fix - Auto-Crash Prevention

## Problem
Backend was working initially but automatically stopped/crashed after a few minutes on VPS.

## Root Causes Identified

1. **Database Connection Timeouts**: Connections timing out and causing crashes
2. **Unhandled Promise Rejections**: Causing process to exit
3. **Uncaught Exceptions**: Not properly handled, causing crashes
4. **Connection Pool Issues**: Connections not being properly managed
5. **No Health Monitoring**: No way to detect and recover from issues

## Solutions Applied

### 1. Database Connection Resilience

**File**: `backend/config/database.js`

- ✅ Added automatic connection health checks (every 5 minutes)
- ✅ Improved error handling for connection errors (PROTOCOL_CONNECTION_LOST, ECONNRESET, etc.)
- ✅ Automatic query retry on connection errors
- ✅ Pool error handling that doesn't crash the process
- ✅ Graceful connection pool cleanup

**Key Changes**:
- Connection health check runs every 5 minutes
- Queries automatically retry once on connection errors
- Pool errors are logged but don't crash the process

### 2. Process Error Handling

**File**: `backend/server.js`

- ✅ Added `unhandledRejection` handler (prevents crashes from unhandled promises)
- ✅ Added `uncaughtException` handler (prevents crashes from uncaught errors)
- ✅ Only exits on critical errors (EADDRINUSE, EACCES)
- ✅ Added process health monitoring
- ✅ Improved graceful shutdown

**Key Changes**:
- Unhandled promise rejections are logged but don't crash
- Uncaught exceptions are logged (only critical errors cause exit)
- Process health monitoring every 5 minutes

### 3. PM2 Configuration

**File**: `ecosystem.config.js`

- ✅ Optimized restart settings
- ✅ Better memory management
- ✅ Improved error recovery

**Settings**:
- `max_restarts: 15` - Allow recovery attempts
- `min_uptime: 30s` - Minimum stable uptime
- `restart_delay: 4000` - Delay between restarts
- `max_memory_restart: 2G` - Restart if memory exceeds 2GB

### 4. Process Health Monitoring

**File**: `backend/utils/processMonitor.js` (NEW)

- ✅ Monitors process health every 5 minutes
- ✅ Tracks memory usage
- ✅ Monitors database connection pool
- ✅ Logs warnings for high resource usage

## How It Works Now

### Connection Health Checks
```
Every 5 minutes:
1. Get a connection from pool
2. Run SELECT 1 query
3. Release connection
4. Log success/failure (doesn't crash on failure)
```

### Error Recovery
```
On connection error:
1. Log the error
2. Retry query once automatically
3. If retry succeeds, return result
4. If retry fails, return user-friendly error
5. Don't crash the process
```

### Process Monitoring
```
Every 5 minutes:
1. Check memory usage
2. Check database pool stats
3. Log warnings if issues detected
4. Continue running (doesn't crash)
```

## Testing the Fix

### 1. Restart PM2
```bash
pm2 restart dashboard
pm2 save
```

### 2. Monitor Logs
```bash
# Watch for errors
pm2 logs dashboard --lines 50

# Check status
pm2 status

# Monitor in real-time
pm2 monit
```

### 3. Test Stability
```bash
# Check if it stays running
watch -n 5 'pm2 status'

# Should show "online" status continuously
```

### 4. Check Health Endpoint
```bash
# Should return healthy status
curl http://srv512766.hstgr.cloud:5009/api/health
```

## Monitoring

### Check Process Health
```bash
# PM2 status
pm2 status

# Detailed info
pm2 describe dashboard

# Memory usage
pm2 monit
```

### Check Database Connections
```bash
# Health endpoint shows pool stats
curl http://srv512766.hstgr.cloud:5009/api/health | jq .database
```

### Check Logs for Issues
```bash
# Recent errors
pm2 logs dashboard --err --lines 100

# All logs
pm2 logs dashboard --lines 200
```

## Troubleshooting

### If Backend Still Crashes

1. **Check PM2 Logs**:
   ```bash
   pm2 logs dashboard --err --lines 100
   ```
   Look for the actual error message before crash

2. **Check Memory Usage**:
   ```bash
   pm2 monit
   ```
   If memory keeps growing, there might be a memory leak

3. **Check Database Connection**:
   ```bash
   curl http://srv512766.hstgr.cloud:5009/api/health
   ```
   Verify database is accessible

4. **Check System Resources**:
   ```bash
   # Check disk space
   df -h
   
   # Check memory
   free -h
   
   # Check MySQL status
   sudo systemctl status mysql
   ```

### Common Issues

**Issue**: Backend crashes after exactly X minutes
- **Cause**: Database connection timeout
- **Fix**: Check MySQL `wait_timeout` and `interactive_timeout` settings
- **Solution**: Health checks should prevent this now

**Issue**: Memory keeps growing until crash
- **Cause**: Memory leak
- **Fix**: Check for unclosed connections, event listeners, or timers
- **Solution**: PM2 will restart at 2GB limit

**Issue**: Backend stops but PM2 shows "online"
- **Cause**: Process hung/frozen
- **Fix**: Check for blocking operations or infinite loops
- **Solution**: Health monitoring should detect this

## Configuration

### Adjust Health Check Interval

In `backend/config/database.js`:
```javascript
// Change from 5 minutes to desired interval
healthCheckInterval = setInterval(..., 5 * 60 * 1000);
```

### Adjust Memory Limit

In `ecosystem.config.js`:
```javascript
max_memory_restart: '2G', // Change to '3G' or '4G' if needed
```

### Adjust Restart Settings

In `ecosystem.config.js`:
```javascript
max_restarts: 15,      // Increase if needed
min_uptime: '30s',    // Decrease if too strict
restart_delay: 4000,   // Increase if restarts too fast
```

## Verification Checklist

After applying fixes:

- [ ] PM2 shows process as "online"
- [ ] Health endpoint returns 200 OK
- [ ] No crashes in logs after 10+ minutes
- [ ] Database health checks passing
- [ ] Memory usage stable (not continuously growing)
- [ ] No "unhandledRejection" errors in logs
- [ ] No "uncaughtException" errors in logs

## Expected Behavior

### Before Fix
- ✅ Backend starts successfully
- ❌ Crashes after a few minutes
- ❌ Requires manual restart
- ❌ No error recovery

### After Fix
- ✅ Backend starts successfully
- ✅ Stays running indefinitely
- ✅ Auto-recovers from connection errors
- ✅ Health monitoring detects issues
- ✅ PM2 auto-restarts if needed
- ✅ Graceful error handling

---

**Last Updated**: 2024
**Status**: Stability improvements applied
**Expected Result**: Backend should stay running without crashes

