# Deployment Checklist - Hostinger VPS

## ✅ Pre-Deployment Checklist

### Server Requirements
- [ ] VPS with root/sudo access
- [ ] Node.js 14+ installed
- [ ] PM2 installed globally
- [ ] Nginx installed
- [ ] MySQL database accessible (remote or local)
- [ ] Port 3006 open in firewall

### Configuration Files
- [ ] `backend/.env` configured with database credentials
- [ ] `ecosystem.config.js` has correct production settings
- [ ] `nginx.conf` updated with your domain/IP
- [ ] `REACT_APP_API_URL` set to `/api` in production

## 🚀 Deployment Steps

### 1. Upload Files
```bash
# Compress project (exclude node_modules and .git)
tar -czf analytics-dashboard.tar.gz --exclude='node_modules' --exclude='.git' Analytics-Dashboard/

# Upload to VPS
scp analytics-dashboard.tar.gz root@srv512766.hstgr.cloud:/var/www/
```

### 2. Extract and Setup
```bash
ssh root@srv512766.hstgr.cloud
cd /var/www
tar -xzf analytics-dashboard.tar.gz
cd Analytics-Dashboard
chmod +x deploy.sh check-deployment.sh
```

### 3. Configure Environment
```bash
# Edit backend environment
nano backend/.env

# Required settings:
# PORT=5009
# NODE_ENV=production
# DB_HOST=31.97.61.5
# DB_PORT=3306
# DB_NAME=admin_analytics
# DB_USER=admin_analytics
# DB_PASSWORD=Adminanalytics@12
# ALLOW_START_WITHOUT_DB=false
```

### 4. Run Deployment
```bash
./deploy.sh
```

### 5. Verify
```bash
./check-deployment.sh
```

## 📊 Architecture

```
Internet (Port 3006)
    ↓
Nginx (Reverse Proxy)
    ├── /api → Backend (localhost:5009)
    └── / → Frontend (localhost:3006)
```

**Ports:**
- **3006**: External (Internet) - Nginx listens here
- **5009**: Backend internal (only via Nginx)
- **3006**: Frontend internal (React dev server)

## 🔧 Configuration Summary

### Backend
- Port: 5009 (internal)
- Accessible via: `http://localhost:5009/api` (direct) or `http://domain:3006/api` (via Nginx)
- Environment: `backend/.env`

### Frontend
- Port: 3006 (same as external)
- API URL: `/api` (relative, Nginx routes to backend)
- Environment: Set via PM2 `REACT_APP_API_URL`

### Nginx
- Listens on: Port 3006
- Routes `/api` → Backend (5009)
- Routes `/` → Frontend (3006)
- Config: `/etc/nginx/sites-available/analytics-dashboard`

### PM2
- Process: `dashboard`
- Mode: Production
- Auto-restart: Enabled
- Config: `ecosystem.config.js`

## 🛠️ Post-Deployment

### Test Endpoints
```bash
# Health check (via Nginx)
curl http://localhost:3006/api/health

# Frontend (via Nginx)
curl http://localhost:3006

# Backend direct (should work)
curl http://localhost:5009/api/health
```

### Monitor
```bash
# PM2 status
pm2 status

# View logs
pm2 logs dashboard

# Real-time monitoring
pm2 monit
```

### Common Commands
```bash
# Restart application
pm2 restart dashboard

# Reload Nginx
sudo systemctl reload nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/analytics-dashboard-error.log

# Check PM2 logs
pm2 logs dashboard --lines 50
```

## 🔒 Security

- ✅ Nginx handles CORS
- ✅ Security headers enabled
- ✅ Rate limiting configured
- ✅ File upload size limit (100MB)
- ✅ Database credentials in .env (not in code)

## 📝 Notes

1. **Both services on port 3006**: Frontend runs on 3006, Nginx also listens on 3006 and proxies to frontend
2. **API routing**: All `/api/*` requests go to backend on port 5009
3. **Scalability**: PM2 can be configured for clustering if needed
4. **Memory**: Backend has 4GB memory limit, frontend has 8GB
5. **Auto-restart**: PM2 will auto-restart on crashes

## 🚨 Troubleshooting

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting guide.

