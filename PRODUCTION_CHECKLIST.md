# Production Deployment Checklist

Use this checklist to ensure your application is production-ready before deploying to Hostinger.

## Pre-Deployment

### Code Preparation
- [ ] All code is committed to version control
- [ ] No console.log statements in production code
- [ ] Error handling is properly implemented
- [ ] All sensitive data is in environment variables
- [ ] No hardcoded credentials or API keys

### Build & Test
- [ ] Application builds successfully: `npm run build:prod`
- [ ] All tests pass (if applicable)
- [ ] No build warnings or errors
- [ ] React app builds without errors
- [ ] Backend starts successfully in production mode

### Environment Configuration
- [ ] `backend/.env` file created with production values
- [ ] `.env` file created in root with `REACT_APP_API_URL`
- [ ] Database credentials are correct
- [ ] CORS origins are set to production domains
- [ ] `NODE_ENV=production` is set
- [ ] `ALLOW_START_WITHOUT_DB=false` in production
- [ ] SSL enabled for database if using remote DB

### Security
- [ ] `.env` files are in `.gitignore`
- [ ] No `.env` files committed to repository
- [ ] Strong database passwords set
- [ ] CORS restricted to production domains only
- [ ] Security headers configured (done in server.js)
- [ ] Rate limiting enabled (already configured)
- [ ] Swagger UI disabled in production (or explicitly enabled)

### Database
- [ ] Database created on production server
- [ ] Database user created with appropriate permissions
- [ ] Database tables will be created automatically (or manually created)
- [ ] Database connection tested
- [ ] IP whitelisted (if using remote database)
- [ ] Database backups configured

## Deployment

### Server Setup
- [ ] Node.js 14+ installed on server
- [ ] npm installed and updated
- [ ] PM2 installed globally: `npm install -g pm2`
- [ ] Files uploaded to server
- [ ] Dependencies installed: `npm install --production`
- [ ] Backend dependencies installed: `cd backend && npm install --production`

### Configuration
- [ ] Environment variables set on server
- [ ] `.env` files have correct permissions (600)
- [ ] Database connection tested from server
- [ ] Port is available (default: 5006)
- [ ] Firewall configured (if applicable)

### Build & Start
- [ ] React app built: `npm run build:prod`
- [ ] Build directory exists and contains files
- [ ] Application started with PM2: `npm run pm2:start:prod`
- [ ] PM2 process is running: `pm2 status`
- [ ] No errors in PM2 logs: `pm2 logs dashboard-backend`

### Auto-Start
- [ ] PM2 startup configured: `pm2 startup`
- [ ] PM2 save executed: `pm2 save`
- [ ] Application restarts after server reboot (tested)

## Post-Deployment

### Verification
- [ ] Health endpoint accessible: `https://yourdomain.com/api/health`
- [ ] Frontend loads correctly: `https://yourdomain.com`
- [ ] API endpoints respond correctly
- [ ] Database queries work
- [ ] File uploads work (if applicable)
- [ ] All features tested and working

### Monitoring
- [ ] PM2 monitoring set up: `pm2 monit`
- [ ] Logs are being written: `pm2 logs dashboard-backend`
- [ ] Error logs checked: `pm2 logs dashboard-backend --err`
- [ ] Memory usage is normal
- [ ] CPU usage is normal

### Reverse Proxy (If Using)
- [ ] Nginx/Apache configured
- [ ] SSL certificate installed
- [ ] HTTPS redirects working
- [ ] Security headers configured in web server
- [ ] Proxy passes requests correctly

### Performance
- [ ] Application loads quickly
- [ ] API responses are fast
- [ ] Static assets are cached
- [ ] Compression is working
- [ ] Database queries are optimized

## Security Review

- [ ] HTTPS/SSL enabled
- [ ] Security headers present (check with browser dev tools)
- [ ] CORS properly configured
- [ ] Rate limiting active
- [ ] Database credentials secure
- [ ] No sensitive data in logs
- [ ] Error messages don't expose sensitive info
- [ ] Swagger UI disabled (unless explicitly enabled)

## Documentation

- [ ] Deployment process documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide available
- [ ] Backup procedures documented
- [ ] Update procedures documented

## Backup & Recovery

- [ ] Database backup configured
- [ ] Application files backup configured
- [ ] Backup restoration tested
- [ ] Backup schedule documented

## Maintenance Plan

- [ ] Update procedure documented
- [ ] Monitoring alerts configured (if applicable)
- [ ] Log rotation configured
- [ ] Regular security updates planned

## Final Checks

- [ ] All features work in production
- [ ] No console errors in browser
- [ ] Performance is acceptable
- [ ] Security measures are in place
- [ ] Monitoring is active
- [ ] Backups are configured

---

## Quick Production Start Commands

```bash
# 1. Build React app
npm run build:prod

# 2. Start with PM2
npm run pm2:start:prod

# 3. Check status
pm2 status

# 4. View logs
pm2 logs dashboard-backend

# 5. Setup auto-start
pm2 startup
pm2 save
```

## Troubleshooting Commands

```bash
# Check if process is running
pm2 status

# View all logs
pm2 logs dashboard-backend

# View only errors
pm2 logs dashboard-backend --err

# Restart application
pm2 restart dashboard-backend

# Check environment variables
pm2 env dashboard-backend

# Monitor in real-time
pm2 monit

# Check health endpoint
curl https://yourdomain.com/api/health
```

---

**Ready for Production! ✅**

Once all items are checked, your application is ready for production use.

