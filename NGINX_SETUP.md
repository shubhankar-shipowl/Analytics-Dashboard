# Nginx Setup Guide for Analytics Dashboard

This guide will help you set up Nginx as a reverse proxy for the Analytics Dashboard application.

## Prerequisites

- Ubuntu/Debian server (or similar Linux distribution)
- Root or sudo access
- Domain name pointing to your server (for SSL)
- PM2 running the application on ports 5009 (backend) and 3006 (frontend)

## Installation

### 1. Install Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y

# Verify installation
nginx -v
```

### 2. Copy Configuration File

```bash
# Copy the nginx.conf file to Nginx sites-available
sudo cp nginx.conf /etc/nginx/sites-available/analytics-dashboard

# Create symlink to enable the site
sudo ln -s /etc/nginx/sites-available/analytics-dashboard /etc/nginx/sites-enabled/

# Remove default Nginx site (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### 3. Update Configuration

Edit the configuration file:

```bash
sudo nano /etc/nginx/sites-available/analytics-dashboard
```

**Important changes to make:**

1. Replace `your-domain.com` with your actual domain name (or IP address)
2. Update SSL certificate paths if using custom certificates
3. Adjust rate limiting if needed
4. Update upload size limits if handling larger files

### 4. Test Configuration

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

## SSL Certificate Setup (Let's Encrypt)

### 1. Install Certbot

```bash
# Ubuntu/Debian
sudo apt install certbot python3-certbot-nginx -y

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx -y
```

### 2. Obtain SSL Certificate

```bash
# Replace your-domain.com with your actual domain
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Follow the prompts:
# - Enter your email address
# - Agree to terms of service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)
```

### 3. Auto-Renewal Setup

Certbot automatically sets up renewal, but you can test it:

```bash
# Test renewal
sudo certbot renew --dry-run
```

## Configuration for IP Address (No Domain)

If you don't have a domain name, you can use your server's IP address:

1. Edit the configuration file:
```bash
sudo nano /etc/nginx/sites-available/analytics-dashboard
```

2. Replace `server_name your-domain.com;` with:
```nginx
server_name your-server-ip;
```

3. Comment out or remove the SSL sections (lines with `ssl_certificate`)

4. Change the HTTP server block to not redirect:
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-server-ip;
    
    # ... rest of configuration without SSL
}
```

## Firewall Configuration

### Ubuntu/Debian (UFW)

```bash
# Allow HTTP and HTTPS
sudo ufw allow 'Nginx Full'
# Or individually:
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Check status
sudo ufw status
```

### CentOS/RHEL (firewalld)

```bash
# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Update Application Configuration

After setting up Nginx, update your application's API URL:

1. **Update ecosystem.config.js:**
```javascript
REACT_APP_API_URL: 'https://your-domain.com/api'  // Use your domain
```

2. **Update backend CORS settings** in `backend/server.js`:
```javascript
const allowedOrigins = [
  'https://your-domain.com',
  'https://www.your-domain.com'
];
```

3. **Restart PM2:**
```bash
pm2 restart dashboard --update-env
```

## Verification

### 1. Check Nginx Status

```bash
sudo systemctl status nginx
```

### 2. Test Backend API

```bash
curl https://your-domain.com/api/health
```

### 3. Test Frontend

Open in browser: `https://your-domain.com`

### 4. Check Logs

```bash
# Nginx access logs
sudo tail -f /var/log/nginx/analytics-dashboard-access.log

# Nginx error logs
sudo tail -f /var/log/nginx/analytics-dashboard-error.log

# Application logs
pm2 logs dashboard
```

## Common Issues and Solutions

### 1. 502 Bad Gateway

**Cause:** Backend or frontend not running

**Solution:**
```bash
# Check if PM2 processes are running
pm2 status

# If not running, start them
./start.sh
```

### 2. 504 Gateway Timeout

**Cause:** Application taking too long to respond

**Solution:** Increase timeout values in nginx.conf:
```nginx
proxy_read_timeout 300s;
proxy_connect_timeout 75s;
```

### 3. SSL Certificate Errors

**Cause:** Certificate not properly configured

**Solution:**
```bash
# Check certificate
sudo certbot certificates

# Renew if needed
sudo certbot renew
```

### 4. CORS Errors

**Cause:** Backend not allowing Nginx domain

**Solution:** Update CORS settings in `backend/server.js` to include your domain.

## Performance Optimization

### 1. Enable Gzip (Already in config)

Gzip compression is already enabled in the configuration.

### 2. Static Asset Caching

Static assets are cached for 1 year (already configured).

### 3. Rate Limiting

Rate limiting is configured:
- API endpoints: 10 requests/second
- General traffic: 30 requests/second

Adjust in `nginx.conf` if needed.

## Maintenance

### Reload Nginx After Configuration Changes

```bash
sudo nginx -t          # Test configuration
sudo systemctl reload nginx  # Reload without downtime
```

### Restart Nginx

```bash
sudo systemctl restart nginx
```

### View Nginx Status

```bash
sudo systemctl status nginx
```

## Security Best Practices

1. ✅ SSL/TLS encryption enabled
2. ✅ Security headers configured
3. ✅ Rate limiting enabled
4. ✅ Hidden files blocked
5. ✅ HSTS header enabled
6. ✅ Modern TLS protocols only

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Certbot Documentation](https://certbot.eff.org/)
- [Let's Encrypt](https://letsencrypt.org/)

## Quick Reference

```bash
# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx

# Restart Nginx
sudo systemctl restart nginx

# Check status
sudo systemctl status nginx

# View logs
sudo tail -f /var/log/nginx/analytics-dashboard-error.log

# Renew SSL certificate
sudo certbot renew
```

