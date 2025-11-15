# VPS Backend Connection Fix - Complete Solution

## Problem
Frontend shows "Error Loading Data" and tries to connect to `localhost:5009` instead of VPS URL. Backend may also be crashing or not staying up.

## Root Causes
1. **Frontend using wrong URL**: Still trying `localhost:5009` instead of VPS URL
2. **Environment variable not passed**: `REACT_APP_API_URL` not reaching React
3. **Backend may be crashing**: Process might be exiting after a few minutes

## Solutions Applied

### 1. Smart API URL Detection (`src/utils/api.js`)
✅ Automatically detects VPS domain and uses correct URL
✅ Checks environment variable first
✅ Falls back to VPS URL if on VPS domain
✅ Supports IP address detection

### 2. Centralized URL Management
✅ All error messages now use correct URL
✅ Single source of truth for API URL
✅ Browser console logs show actual URL being used

### 3. Enhanced Logging
✅ Frontend logs API URL on startup
✅ Shows hostname and environment
✅ Helps debug connection issues

## Apply Fix on VPS

### Step 1: Upload Updated Files
Make sure these files are updated on VPS:
- `src/utils/api.js`
- `src/utils/dataService.js`
- `src/app.js`
- `start-combined.js`
- `start-frontend.js`

### Step 2: Restart PM2 with Production Mode
```bash
cd /root/Analytics-Dashboard

# Stop and delete current process
pm2 stop dashboard
pm2 delete dashboard

# Start with production environment (this sets REACT_APP_API_URL correctly)
pm2 start ecosystem.config.js --only dashboard --env production
pm2 save

# Monitor logs
pm2 logs dashboard
```

### Step 3: Verify Environment Variable
```bash
# Check if REACT_APP_API_URL is set
pm2 env dashboard | grep REACT_APP_API_URL

# Should show:
# REACT_APP_API_URL=http://srv512766.hstgr.cloud:5009/api
```

### Step 4: Check Backend Health
```bash
# Run the diagnostic script
./check-backend.sh

# Or manually test
curl http://localhost:5009/api/health
curl http://srv512766.hstgr.cloud:5009/api/health
```

### Step 5: Check Frontend Logs
Wait for frontend to compile, then check logs:
```bash
pm2 logs dashboard | grep -E "API URL|REACT_APP|Compiled"
```

Should show:
```
🔧 Frontend Environment:
   REACT_APP_API_URL: http://srv512766.hstgr.cloud:5009/api
   PORT: 3006
```

### Step 6: Test in Browser
1. Open: `http://srv512766.hstgr.cloud:3006`
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for:
   ```
   🔗 API Base URL: http://srv512766.hstgr.cloud:5009/api
   🌐 Current Hostname: srv512766.hstgr.cloud
   📋 Environment: production
   🔧 REACT_APP_API_URL: http://srv512766.hstgr.cloud:5009/api
   ```

## Troubleshooting

### If Backend is Not Running

1. **Check PM2 Status**:
   ```bash
   pm2 status
   pm2 logs dashboard --lines 50
   ```

2. **Check if Backend Process Exists**:
   ```bash
   ps aux | grep "node.*server.js"
   lsof -i :5009
   ```

3. **Check Backend Logs for Errors**:
   ```bash
   tail -50 /root/Analytics-Dashboard/logs/pm2-combined-error.log
   tail -50 /root/Analytics-Dashboard/backend/logs/*.log
   ```

4. **Restart Backend Only**:
   ```bash
   pm2 restart dashboard
   # Wait and check logs
   pm2 logs dashboard --lines 100
   ```

### If Frontend Still Shows localhost

1. **Clear Browser Cache**:
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

2. **Verify Environment Variable**:
   ```bash
   pm2 env dashboard | grep REACT_APP
   ```

3. **Check Frontend is Using Correct URL**:
   - Open browser console (F12)
   - Look for the API URL log messages
   - Check Network tab to see actual API calls

4. **Force Frontend Rebuild**:
   ```bash
   pm2 restart dashboard
   # Wait for "Compiled successfully!" message
   ```

### If Backend Keeps Crashing

1. **Check for Memory Issues**:
   ```bash
   pm2 monit
   # Watch memory usage
   ```

2. **Check Database Connection**:
   ```bash
   # Verify database is accessible
   mysql -u your_user -p -h localhost
   ```

3. **Check for Unhandled Errors**:
   ```bash
   tail -100 /root/Analytics-Dashboard/logs/pm2-combined-error.log
   ```

4. **Increase PM2 Restart Limits**:
   Already configured in `ecosystem.config.js`:
   - `max_restarts: 15`
   - `min_uptime: '30s'`

## Expected Behavior After Fix

### Frontend
- ✅ Detects VPS domain automatically
- ✅ Uses `http://srv512766.hstgr.cloud:5009/api`
- ✅ Error messages show correct URL
- ✅ Browser console shows correct API URL

### Backend
- ✅ Runs on port 5009
- ✅ Accessible at `http://srv512766.hstgr.cloud:5009/api`
- ✅ Health check responds: `http://srv512766.hstgr.cloud:5009/api/health`
- ✅ Stays running (doesn't crash)

### Connection
- ✅ Frontend successfully connects to backend
- ✅ Data loads from database
- ✅ No "Error Loading Data" message

## Quick Diagnostic Commands

```bash
# Full health check
./check-backend.sh

# Check PM2 status
pm2 status
pm2 logs dashboard --lines 50

# Test backend directly
curl http://localhost:5009/api/health
curl http://srv512766.hstgr.cloud:5009/api/health

# Check ports
lsof -i :5009
lsof -i :3006

# Check processes
ps aux | grep -E "node|react-scripts"
```

## If Still Not Working

1. **Verify all files are updated on VPS**
2. **Check PM2 is using production environment**: `pm2 env dashboard`
3. **Check browser console for actual errors**
4. **Verify firewall allows ports 5009 and 3006**
5. **Check Nginx configuration if using Nginx**

---

**Last Updated**: 2024
**Status**: Complete fix applied
**Next Steps**: Apply on VPS and verify

