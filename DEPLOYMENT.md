# Deployment Guide for Hostinger VPS

This guide will help you deploy the Analytics Dashboard on Hostinger VPS with Nginx.

## Prerequisites

- Hostinger VPS with root/sudo access
- Domain or IP address (e.g., `srv512766.hstgr.cloud`)
- MySQL database (remote or local)
- Node.js 14+ and npm installed
- PM2 installed globally
- Nginx installed

## Architecture

```
Internet (Port 3006)
    ↓
Nginx (Reverse Proxy)
    ├── /api → Backend (localhost:5009)
    └── / → Frontend (localhost:3006)
```

**Port Configuration:**
- **External Port:** 3006 (accessible from internet)
- **Backend Internal:** 5009 (only accessible via Nginx)
- **Frontend Internal:** 3006 (served by React dev server or static build)

## Step 1: Server Setup

### Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install Git (if not already installed)
sudo apt install -y git
```

### Verify Installations

```bash
node --version  # Should be v18.x or higher
npm --version
pm2 --version
nginx -v
```

## Step 2: Clone and Setup Application

```bash
# Navigate to your web directory
cd /var/www  # or your preferred directory

# Clone your repository (or upload files)
git clone <your-repo-url> analytics-dashboard
cd analytics-dashboard

# Install dependencies
npm install
cd backend && npm install && cd ..
```

## Step 3: Configure Environment Variables

### Backend Environment (.env)

Create/update `backend/.env`:

```env
# Server Configuration
PORT=5009
NODE_ENV=production

# MySQL Database Configuration
DB_HOST=31.97.61.5
DB_PORT=3306
DB_NAME=admin_analytics
DB_USER=admin_analytics
DB_PASSWORD=Adminanalytics@12

# CORS Configuration (optional - Nginx handles this)
CORS_ORIGIN=http://srv512766.hstgr.cloud:3006,https://srv512766.hstgr.cloud:3006

# Production: Require database connection
ALLOW_START_WITHOUT_DB=false
```

### PM2 Configuration

The `ecosystem.config.js` already has production settings. Verify:

- `PORT: 5009` (backend)
- `FRONTEND_PORT: 3006` (frontend)
- `REACT_APP_API_URL: '/api'` (relative URL for Nginx)

## Step 4: Configure Nginx

### Copy Nginx Configuration

```bash
# Copy the nginx config
sudo cp nginx.conf /etc/nginx/sites-available/analytics-dashboard

# Create symlink to enable
sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t
```

### Update Nginx Config (if needed)

Edit `/etc/nginx/sites-available/analytics-dashboard`:

- Update `server_name` with your domain/IP
- Verify upstream ports match your configuration
- Adjust `client_max_body_size` if needed (default: 100MB)

### Start/Restart Nginx

```bash
sudo systemctl start nginx
sudo systemctl enable nginx  # Auto-start on boot
sudo systemctl reload nginx   # After config changes
```

## Step 5: Start Application with PM2

```bash
# Navigate to project directory
cd /var/www/analytics-dashboard

# Start in production mode
pm2 start ecosystem.config.js --only dashboard --env production

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the instructions shown (usually: sudo env PATH=$PATH:... pm2 startup systemd -u your-user --hp /home/your-user)
```

### Verify PM2 Status

```bash
pm2 status
pm2 logs dashboard
```

## Step 6: Configure Firewall

```bash
# Allow port 3006 (if using UFW)
sudo ufw allow 3006/tcp
sudo ufw allow 22/tcp  # SSH
sudo ufw enable

# Or if using iptables
sudo iptables -A INPUT -p tcp --dport 3006 -j ACCEPT
sudo iptables-save
```

## Step 7: Verify Deployment

### Check Services

```bash
# Check Nginx
sudo systemctl status nginx

# Check PM2
pm2 status

# Check ports
sudo netstat -tlnp | grep -E '3006|5009'
```

### Test Endpoints

```bash
# Health check (via Nginx)
curl http://srv512766.hstgr.cloud:3006/api/health

# Frontend (via Nginx)
curl http://srv512766.hstgr.cloud:3006
```

### Access Dashboard

Open in browser:
- `http://srv512766.hstgr.cloud:3006`
- Or `http://YOUR_IP:3006`

## Step 8: SSL/HTTPS (Optional but Recommended)

### Using Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d srv512766.hstgr.cloud

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

After SSL setup, update Nginx config to use HTTPS on port 3006.

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs dashboard --lines 100

# Check if ports are in use
sudo lsof -i :3006
sudo lsof -i :5009

# Restart PM2
pm2 restart dashboard
```

### Nginx Errors

```bash
# Check Nginx error logs
sudo tail -f /var/log/nginx/analytics-dashboard-error.log

# Test Nginx config
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx
```

### Database Connection Issues

```bash
# Test database connection from server
cd backend
node -e "const mysql = require('mysql2/promise'); (async () => { try { const conn = await mysql.createConnection({host: '31.97.61.5', port: 3306, user: 'admin_analytics', password: 'Adminanalytics@12', database: 'admin_analytics'}); console.log('✅ Connected'); await conn.end(); } catch(e) { console.error('❌ Error:', e.message); } })()"
```

### Port Already in Use

```bash
# Find process using port
sudo lsof -i :3006
sudo lsof -i :5009

# Kill process if needed
sudo kill -9 <PID>
```

### Memory Issues

```bash
# Check memory usage
pm2 monit

# Increase Node.js memory (already set in ecosystem.config.js)
# NODE_OPTIONS: '--max-old-space-size=4096'
```

## Maintenance Commands

```bash
# View logs
pm2 logs dashboard

# Restart application
pm2 restart dashboard

# Stop application
pm2 stop dashboard

# Reload Nginx config
sudo systemctl reload nginx

# Check application status
pm2 status
pm2 info dashboard
```

## Performance Optimization

### Enable Gzip (Already configured in Nginx)

Gzip compression is enabled in the Nginx config for:
- Text files (HTML, CSS, JS, JSON)
- Fonts
- SVG images

### Database Optimization

```bash
# Run database optimization script
cd backend
npm run optimize:db
```

### PM2 Clustering (Optional)

For high traffic, you can enable PM2 clustering in `ecosystem.config.js`:

```javascript
instances: 2,  // Number of instances
exec_mode: 'cluster',  // Cluster mode
```

## Security Checklist

- [ ] Firewall configured (port 3006 open)
- [ ] Database credentials secure
- [ ] Nginx security headers enabled
- [ ] SSL/HTTPS configured (recommended)
- [ ] PM2 auto-restart enabled
- [ ] Logs monitored
- [ ] Regular backups configured

## Monitoring

### PM2 Monitoring

```bash
# Real-time monitoring
pm2 monit

# View metrics
pm2 show dashboard
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/analytics-dashboard-access.log

# Error logs
sudo tail -f /var/log/nginx/analytics-dashboard-error.log
```

## Backup Strategy

### Database Backup

```bash
# Create backup script
cat > /var/www/analytics-dashboard/backup-db.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -h 31.97.61.5 -u admin_analytics -p'Adminanalytics@12' admin_analytics > /var/backups/db_backup_$DATE.sql
# Keep only last 7 days
find /var/backups -name "db_backup_*.sql" -mtime +7 -delete
EOF

chmod +x /var/www/analytics-dashboard/backup-db.sh

# Add to crontab (daily at 2 AM)
(crontab -l 2>/dev/null; echo "0 2 * * * /var/www/analytics-dashboard/backup-db.sh") | crontab -
```

## Updates and Deployment

### Update Application

```bash
cd /var/www/analytics-dashboard

# Pull latest changes
git pull

# Install/update dependencies
npm install
cd backend && npm install && cd ..

# Restart application
pm2 restart dashboard
```

## Support

For issues:
1. Check PM2 logs: `pm2 logs dashboard`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/analytics-dashboard-error.log`
3. Verify services: `pm2 status` and `sudo systemctl status nginx`
4. Test endpoints: `curl http://localhost:3006/api/health`
