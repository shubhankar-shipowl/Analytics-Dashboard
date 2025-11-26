# 🚀 Production Deployment - Hostinger VPS

## Quick Overview

Your application is now configured for production deployment on Hostinger VPS with:
- ✅ **Single Port (3006)**: Both frontend and backend accessible via port 3006
- ✅ **Nginx Reverse Proxy**: Handles routing and security
- ✅ **PM2 Process Management**: Auto-restart and monitoring
- ✅ **Scalable Architecture**: Ready for high traffic
- ✅ **Production Optimizations**: Memory limits, error handling, security

## Architecture

```
┌─────────────────────────────────────────┐
│         Internet (Port 3006)            │
└─────────────────┬───────────────────────┘
                   │
                   ▼
         ┌─────────────────┐
         │   Nginx (3006)   │
         └────────┬──────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼
┌──────────────┐   ┌──────────────┐
│  Frontend    │   │   Backend    │
│  (3006)      │   │   (5009)     │
└──────────────┘   └──────────────┘
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
         ┌─────────────────┐
         │  MySQL Database  │
         │  (31.97.61.5)    │
         └─────────────────┘
```

## Key Features

### 1. Single Port Access
- **External**: Port 3006 (accessible from internet)
- **Nginx**: Routes requests to appropriate service
- **Backend**: Internal port 5009 (not exposed directly)
- **Frontend**: Internal port 3006 (served by React)

### 2. Request Routing
- `/api/*` → Backend (port 5009)
- `/api-docs` → Backend Swagger UI
- `/` → Frontend (port 3006)
- Static assets → Frontend with caching

### 3. Production Optimizations
- **Memory**: Backend 4GB, Frontend 8GB
- **Caching**: Nginx caches static assets (1 year)
- **Compression**: Gzip enabled for all text assets
- **Rate Limiting**: API endpoints protected
- **Security Headers**: XSS, CSRF protection
- **Error Handling**: Graceful error recovery

### 4. Scalability
- PM2 clustering ready (can enable in ecosystem.config.js)
- Database connection pooling (30 connections)
- Nginx load balancing ready
- Horizontal scaling support

## Deployment Steps

### Option 1: Automated (Recommended)

```bash
# 1. Upload files to VPS
scp -r Analytics-Dashboard root@srv512766.hstgr.cloud:/var/www/

# 2. SSH into VPS
ssh root@srv512766.hstgr.cloud

# 3. Navigate and setup
cd /var/www/Analytics-Dashboard
chmod +x deploy.sh check-deployment.sh

# 4. Configure environment
nano backend/.env  # Update database credentials

# 5. Run deployment
./deploy.sh
```

### Option 2: Manual

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed manual steps.

## Configuration Files

### Backend (.env)
```env
PORT=5009
NODE_ENV=production
DB_HOST=31.97.61.5
DB_PORT=3306
DB_NAME=admin_analytics
DB_USER=admin_analytics
DB_PASSWORD=Adminanalytics@12
ALLOW_START_WITHOUT_DB=false
```

### PM2 (ecosystem.config.js)
- Production environment variables
- Memory limits configured
- Auto-restart enabled
- Logging configured

### Nginx (nginx.conf)
- Port 3006 listener
- API proxy to backend
- Frontend proxy
- Security headers
- Rate limiting
- Gzip compression

## Verification

After deployment, run:

```bash
./check-deployment.sh
```

Or manually verify:

```bash
# PM2 status
pm2 status

# Test endpoints
curl http://localhost:3006/api/health
curl http://localhost:3006

# Check Nginx
sudo systemctl status nginx
```

## Access URLs

- **Dashboard**: `http://srv512766.hstgr.cloud:3006`
- **API Health**: `http://srv512766.hstgr.cloud:3006/api/health`
- **API Docs**: `http://srv512766.hstgr.cloud:3006/api-docs`

## Management

### PM2 Commands
```bash
pm2 status              # Check status
pm2 logs dashboard      # View logs
pm2 restart dashboard   # Restart
pm2 stop dashboard      # Stop
pm2 monit               # Monitor
```

### Nginx Commands
```bash
sudo systemctl status nginx    # Check status
sudo systemctl reload nginx    # Reload config
sudo nginx -t                   # Test config
```

## Troubleshooting

### Application Not Starting
```bash
pm2 logs dashboard --lines 50
pm2 restart dashboard
```

### Nginx Errors
```bash
sudo tail -f /var/log/nginx/analytics-dashboard-error.log
sudo nginx -t
```

### Database Connection
```bash
cd backend
node -e "const mysql = require('mysql2/promise'); require('dotenv').config(); mysql.createConnection({host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME}).then(c => {console.log('OK'); c.end();}).catch(e => console.error('Error:', e.message));"
```

## Security Features

✅ **Nginx Security Headers**
- X-Frame-Options
- X-Content-Type-Options
- X-XSS-Protection
- Referrer-Policy

✅ **Rate Limiting**
- API endpoints: 10 req/s
- General: 30 req/s

✅ **File Upload Limits**
- Maximum: 100MB
- Validated on backend

✅ **CORS Handling**
- Nginx handles CORS in production
- Backend allows all (safe behind Nginx)

## Performance

- **Memory**: Optimized limits prevent crashes
- **Caching**: Static assets cached for 1 year
- **Compression**: Gzip reduces bandwidth
- **Connection Pooling**: Database connections reused
- **Query Optimization**: Indexed queries for fast responses

## Monitoring

### PM2 Monitoring
```bash
pm2 monit  # Real-time monitoring
pm2 show dashboard  # Detailed info
```

### Logs
- PM2: `pm2 logs dashboard`
- Nginx: `/var/log/nginx/analytics-dashboard-*.log`
- Backend: `backend/logs/*.log`

## Updates

To update the application:

```bash
cd /var/www/Analytics-Dashboard
git pull  # or upload new files
npm install
cd backend && npm install && cd ..
pm2 restart dashboard
```

## Support

For issues:
1. Check logs: `pm2 logs dashboard`
2. Run health check: `./check-deployment.sh`
3. Verify services: `pm2 status` and `sudo systemctl status nginx`
4. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed troubleshooting

---

**Ready to deploy!** Follow [QUICK_DEPLOY.md](./QUICK_DEPLOY.md) for fastest setup.

