# VPS Configuration

## Your VPS Details

- **VPS URL**: `http://srv512766.hstgr.cloud:3006`
- **Frontend Port**: `3006`
- **Backend Port**: `5009`
- **Backend API URL**: `http://srv512766.hstgr.cloud:5009/api`

## Access URLs

### Frontend
- **URL**: http://srv512766.hstgr.cloud:3006
- **Status**: Configured in PM2 production mode

### Backend API
- **Health Check**: http://srv512766.hstgr.cloud:5009/api/health
- **API Docs**: http://srv512766.hstgr.cloud:5009/api-docs
- **Root API**: http://srv512766.hstgr.cloud:5009/

## Configuration Applied

### PM2 Configuration (`ecosystem.config.js`)
- ✅ Production mode uses: `REACT_APP_API_URL: 'http://srv512766.hstgr.cloud:5009/api'`
- ✅ Frontend configured to connect to VPS backend
- ✅ Backend configured for VPS

### CORS Configuration (`backend/server.js`)
- ✅ Added VPS origins to allowed origins:
  - `http://srv512766.hstgr.cloud:3006`
  - `http://srv512766.hstgr.cloud:3000`
  - `https://srv512766.hstgr.cloud:3006` (for SSL)
  - `https://srv512766.hstgr.cloud:3000` (for SSL)

## Starting the Application on VPS

### 1. Start with PM2 (Production Mode)
```bash
pm2 start ecosystem.config.js --only dashboard --env production
pm2 save
```

### 2. Check Status
```bash
pm2 status
pm2 logs dashboard
```

### 3. Verify Access
- Frontend: http://srv512766.hstgr.cloud:3006
- Backend Health: http://srv512766.hstgr.cloud:5009/api/health

## Firewall Configuration

Make sure these ports are open on your VPS:
- **Port 3006**: Frontend access
- **Port 5009**: Backend API access

### Ubuntu/Debian Firewall (UFW)
```bash
sudo ufw allow 3006/tcp
sudo ufw allow 5009/tcp
sudo ufw reload
```

### CentOS/RHEL Firewall (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=3006/tcp
sudo firewall-cmd --permanent --add-port=5009/tcp
sudo firewall-cmd --reload
```

## Troubleshooting

### Frontend can't connect to backend
1. Check if backend is running: `pm2 status`
2. Check backend logs: `pm2 logs dashboard --lines 50`
3. Verify backend is accessible: `curl http://srv512766.hstgr.cloud:5009/api/health`
4. Check firewall: `sudo ufw status` or `sudo firewall-cmd --list-ports`

### CORS Errors
- Verify CORS origins in `backend/server.js` include your VPS URL
- Check browser console for specific CORS error messages
- Ensure backend is running and accessible

### Port Already in Use
```bash
# Check what's using the port
sudo lsof -i :3006
sudo lsof -i :5009

# Kill process if needed
sudo kill -9 <PID>
```

## Environment Variables

If you need to override the API URL, you can set it in your `.env` file:

```env
REACT_APP_API_URL=http://srv512766.hstgr.cloud:5009/api
CORS_ORIGIN=http://srv512766.hstgr.cloud:3006,http://srv512766.hstgr.cloud:3000
```

## SSL/HTTPS Setup (Optional)

If you want to use HTTPS:

1. Install SSL certificate (Let's Encrypt recommended)
2. Update CORS origins to include `https://srv512766.hstgr.cloud:3006`
3. Update `REACT_APP_API_URL` to use `https://`
4. Configure Nginx reverse proxy (see `NGINX_SETUP.md`)

---

**Last Updated**: 2024
**VPS**: srv512766.hstgr.cloud

