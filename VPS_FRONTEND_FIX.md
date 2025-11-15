# VPS Frontend Connection Fix

## Problem
Frontend shows "Error Loading Data" on VPS even though backend is running. The issue is that the frontend is trying to connect to `localhost:5009` which doesn't work when accessing from a browser.

## Root Cause
When you access the frontend at `http://srv512766.hstgr.cloud:3006` from your browser, the frontend JavaScript runs in your browser. When it tries to connect to `localhost:5009`, it's trying to connect to YOUR computer's localhost, not the VPS server's localhost.

## Solution Applied

### 1. Updated API Configuration (`src/utils/api.js`)
- ✅ Added automatic VPS detection
- ✅ Uses VPS URL when accessing via VPS domain
- ✅ Falls back to environment variable or localhost

### 2. Updated Start Scripts
- ✅ `start-combined.js`: Explicitly passes `REACT_APP_API_URL` to React
- ✅ `start-frontend.js`: Explicitly passes `REACT_APP_API_URL` to React
- ✅ Both scripts detect VPS and use correct URL

### 3. PM2 Configuration
- ✅ Production mode already has `REACT_APP_API_URL: 'http://srv512766.hstgr.cloud:5009/api'`

## How It Works

### Automatic Detection
The frontend now automatically detects if it's running on VPS:
```javascript
// If accessing via srv512766.hstgr.cloud, use VPS backend URL
if (hostname.includes('srv512766.hstgr.cloud')) {
  return 'http://srv512766.hstgr.cloud:5009/api';
}
```

### Environment Variable Priority
1. **PM2 Environment**: `REACT_APP_API_URL` from `ecosystem.config.js`
2. **VPS Detection**: Automatically uses VPS URL if on VPS domain
3. **Fallback**: `http://localhost:5009/api` for local development

## Apply the Fix on VPS

### 1. Restart PM2 with Production Mode
```bash
cd /root/Analytics-Dashboard

# Stop current process
pm2 stop dashboard

# Delete and restart with production environment
pm2 delete dashboard
pm2 start ecosystem.config.js --only dashboard --env production
pm2 save
```

### 2. Verify Environment Variable
```bash
# Check PM2 environment
pm2 env dashboard | grep REACT_APP_API_URL

# Should show: REACT_APP_API_URL=http://srv512766.hstgr.cloud:5009/api
```

### 3. Check Frontend Logs
```bash
pm2 logs dashboard | grep "REACT_APP_API_URL"

# Should show the VPS URL in the logs
```

### 4. Test Connection
```bash
# Test backend health
curl http://srv512766.hstgr.cloud:5009/api/health

# Test from browser
# Open: http://srv512766.hstgr.cloud:3006
# Check browser console (F12) for API URL
```

## Verification

### Check Browser Console
1. Open `http://srv512766.hstgr.cloud:3006` in browser
2. Press F12 to open Developer Tools
3. Go to Console tab
4. Look for: `🔗 API Base URL: http://srv512766.hstgr.cloud:5009/api`
5. Check Network tab - API calls should go to VPS URL, not localhost

### Check PM2 Logs
```bash
pm2 logs dashboard --lines 50 | grep -E "API URL|REACT_APP"
```

Should show:
```
🔧 Frontend Environment:
   REACT_APP_API_URL: http://srv512766.hstgr.cloud:5009/api
   PORT: 3006
```

## Troubleshooting

### If Still Shows localhost

1. **Clear Browser Cache**:
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

2. **Verify PM2 Environment**:
   ```bash
   pm2 env dashboard | grep REACT_APP
   ```

3. **Restart Frontend Only**:
   ```bash
   pm2 restart dashboard
   # Wait for frontend to recompile
   # Check logs: pm2 logs dashboard
   ```

4. **Check Browser Console**:
   - Open browser console (F12)
   - Look for errors or the API URL being used
   - Check Network tab to see actual API calls

### If CORS Error

The backend CORS is already configured to allow:
- `http://srv512766.hstgr.cloud:3006`
- `http://srv512766.hstgr.cloud:3000`

If you still get CORS errors, verify backend is running:
```bash
curl -H "Origin: http://srv512766.hstgr.cloud:3006" \
     http://srv512766.hstgr.cloud:5009/api/health
```

## Expected Behavior

### Before Fix
- ❌ Frontend tries to connect to `localhost:5009`
- ❌ Connection fails (localhost is browser's machine, not VPS)
- ❌ Shows "Error Loading Data"

### After Fix
- ✅ Frontend detects VPS domain
- ✅ Uses `http://srv512766.hstgr.cloud:5009/api`
- ✅ Successfully connects to backend
- ✅ Data loads correctly

## Quick Fix Command

If you need to quickly fix on VPS:

```bash
cd /root/Analytics-Dashboard
pm2 delete dashboard
pm2 start ecosystem.config.js --only dashboard --env production
pm2 save
pm2 logs dashboard
```

Wait for frontend to compile, then test in browser.

---

**Last Updated**: 2024
**Status**: Frontend VPS connection fix applied
**Expected Result**: Frontend should connect to backend on VPS

