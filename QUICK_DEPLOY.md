# Quick Deployment Guide - Hostinger VPS

## 🚀 Quick Start (5 Minutes)

### 1. Upload Files to VPS

```bash
# On your local machine, compress the project
tar -czf analytics-dashboard.tar.gz --exclude='node_modules' --exclude='.git' Analytics-Dashboard/

# Upload to VPS (replace with your VPS details)
scp analytics-dashboard.tar.gz root@srv512766.hstgr.cloud:/var/www/

# SSH into VPS
ssh root@srv512766.hstgr.cloud
```

### 2. Extract and Setup

```bash
cd /var/www
tar -xzf analytics-dashboard.tar.gz
cd Analytics-Dashboard

# Make scripts executable
chmod +x deploy.sh check-deployment.sh
```

### 3. Configure Environment

```bash
# Edit backend environment
nano backend/.env

# Ensure these values are set:
# PORT=5009
# NODE_ENV=production
# DB_HOST=31.97.61.5
# DB_PORT=3306
# DB_NAME=admin_analytics
# DB_USER=admin_analytics
# DB_PASSWORD=Adminanalytics@12
# ALLOW_START_WITHOUT_DB=false
```

### 4. Run Deployment Script

```bash
./deploy.sh
```

The script will:
- ✅ Check prerequisites
- ✅ Install dependencies
- ✅ Test database connection
- ✅ Configure Nginx
- ✅ Start application with PM2
- ✅ Verify everything is working

### 5. Open Firewall (if needed)

```bash
sudo ufw allow 3006/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable
```

### 6. Access Dashboard

Open in browser:
- `http://srv512766.hstgr.cloud:3006`
- Or `http://YOUR_IP:3006`

## 📋 Manual Deployment (Alternative)

If the script doesn't work, follow these steps:

### Install Dependencies

```bash
npm install
cd backend && npm install && cd ..
```

### Setup Nginx

```bash
sudo cp nginx.conf /etc/nginx/sites-available/analytics-dashboard
sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Start with PM2

```bash
pm2 start ecosystem.config.js --only dashboard --env production
pm2 save
pm2 startup  # Follow instructions shown
```

## 🔍 Verify Deployment

```bash
./check-deployment.sh
```

Or manually check:

```bash
# Check PM2
pm2 status

# Check Nginx
sudo systemctl status nginx

# Test endpoints
curl http://localhost:3006/api/health
curl http://localhost:3006
```

## 🛠️ Common Issues

### Port 3006 Already in Use

```bash
sudo lsof -i :3006
sudo kill -9 <PID>
```

### Nginx Configuration Error

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Application Not Starting

```bash
pm2 logs dashboard --lines 50
pm2 restart dashboard
```

### Database Connection Failed

```bash
# Test connection
cd backend
node -e "const mysql = require('mysql2/promise'); require('dotenv').config(); mysql.createConnection({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME}).then(c => {console.log('OK'); c.end();}).catch(e => console.error('Error:', e.message));"
```

## 📊 Management Commands

```bash
# View logs
pm2 logs dashboard

# Restart
pm2 restart dashboard

# Stop
pm2 stop dashboard

# Monitor
pm2 monit

# Reload Nginx
sudo systemctl reload nginx
```

## 🔒 Security Checklist

- [ ] Firewall configured (port 3006 open)
- [ ] Database credentials secure
- [ ] Nginx security headers enabled
- [ ] PM2 auto-restart enabled
- [ ] Regular backups configured

## 📝 Notes

- **Port 3006**: External port (accessible from internet)
- **Port 5009**: Backend internal port (only via Nginx)
- **Frontend**: Runs on port 3006 (same as external)
- **Nginx**: Routes `/api` → backend (5009), `/` → frontend (3006)

For detailed documentation, see [DEPLOYMENT.md](./DEPLOYMENT.md)
