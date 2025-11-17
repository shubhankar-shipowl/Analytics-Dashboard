# Production Deployment Guide for Hostinger

This guide will help you deploy the Dashboard application to Hostinger hosting.

## Prerequisites

- Hostinger VPS or Shared Hosting with Node.js support
- MySQL database (can be remote or on Hostinger)
- SSH access to your server (for VPS)
- Domain name configured (optional but recommended)

## Pre-Deployment Checklist

- [ ] Node.js 14+ installed on server
- [ ] MySQL database created and accessible
- [ ] Environment variables configured
- [ ] Domain name pointed to server (if using custom domain)
- [ ] SSL certificate configured (for HTTPS)

## Step 1: Prepare Your Local Environment

### 1.1 Prepare Environment Files

Create `backend/.env` file with your production configuration:

```env
# Backend Environment Variables
NODE_ENV=production
PORT=5006

# Database Configuration
DB_HOST=your_database_host
DB_PORT=3306
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name

# Database Connection Pool
DB_POOL_SIZE=20

# SSL Configuration (set to true for remote databases)
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true

# CORS Configuration
# Add your production domain(s) here
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Security
ALLOW_START_WITHOUT_DB=false

# Logging
LOG_LEVEL=info
```

Create `.env` file in root directory for frontend:

```env
# Frontend Environment Variables
REACT_APP_API_URL=https://yourdomain.com/api
```

**Important:** Update `REACT_APP_API_URL` with your actual production domain before building.

## Step 2: Upload Files to Hostinger

### Option A: Using SSH (VPS)

1. **Connect to your server:**
   ```bash
   ssh username@your-server-ip
   ```

2. **Navigate to your web directory:**
   ```bash
   cd /home/username/public_html
   # or
   cd /var/www/html
   ```

3. **Upload files using SCP or SFTP:**
   ```bash
   # From your local machine
   scp -r . username@your-server-ip:/home/username/public_html/dashboard
   ```

### Option B: Using File Manager (Shared Hosting)

1. Log in to Hostinger hPanel
2. Navigate to File Manager
3. Upload all project files to your domain's public_html directory
4. Extract if uploaded as ZIP

## Step 3: Install Dependencies

### On the Server:

```bash
# Navigate to project directory
cd /path/to/your/project

# Install root dependencies
npm install --production

# Install backend dependencies
cd backend
npm install --production
cd ..
```

## Step 4: Configure Environment Variables

1. **Create `backend/.env` file on the server** with your production values
2. **Ensure `.env` files are not publicly accessible** (they should be in `.gitignore`)

## Step 5: Set Up MySQL Database

### 5.1 Create Database

1. Log in to Hostinger hPanel
2. Navigate to MySQL Databases
3. Create a new database
4. Create a database user and grant privileges
5. Note down the connection details

### 5.2 Configure Database Connection

Update `backend/.env` with your database credentials:

```env
DB_HOST=localhost  # or remote MySQL host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
```

### 5.3 Initialize Database Tables

The application will automatically create tables on first start, or you can run:

```bash
cd backend
node scripts/create-tables.js  # If you have this script
```

## Step 6: Install PM2 Globally

```bash
npm install -g pm2
```

## Step 7: Start Application

### 7.1 Start with PM2

```bash
# Start in production mode (builds React app and starts backend)
npm run pm2:start:prod

# Or manually:
npm run build:prod
pm2 start ecosystem.config.js --only dashboard-backend --env production
```

This will:
- Build the React app for production
- Start the **backend server** on port 5006 (or port specified in `backend/.env`)
- Serve both API (`/api/*`) and frontend from the same port

### 7.2 Verify Application is Running

```bash
# Check status (should show backend process)
pm2 status

# View logs
pm2 logs dashboard-backend

# Monitor process
pm2 monit

# Test the application
curl http://localhost:5006/api/health
curl http://localhost:5006
```

## Step 8: Configure Auto-Start on Reboot

```bash
# Generate startup script
pm2 startup

# Follow the instructions shown (usually requires sudo)
# Then save the current process list
pm2 save
```

## Step 9: Configure Reverse Proxy (If Using Custom Domain)

### 9.1 Using Nginx (Recommended)

Create or edit `/etc/nginx/sites-available/yourdomain.com`:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy all requests to backend (serves both API and frontend)
    location / {
        proxy_pass http://localhost:5006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching (served by backend)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://localhost:5006;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 9.2 Using Apache (Alternative)

Create or edit `/etc/apache2/sites-available/yourdomain.com.conf`:

```apache
<VirtualHost *:80>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com
    
    # Redirect to HTTPS
    Redirect permanent / https://yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias www.yourdomain.com

    SSLEngine on
    SSLCertificateFile /path/to/ssl/certificate.crt
    SSLCertificateKeyFile /path/to/ssl/private.key

    # Proxy all requests to backend (serves both API and frontend)
    ProxyPreserveHost On
    ProxyPass / http://localhost:5006/
    ProxyPassReverse / http://localhost:5006/

    # Security Headers
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
</VirtualHost>
```

Enable modules and site:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod ssl
sudo a2enmod headers
sudo a2ensite yourdomain.com
sudo systemctl reload apache2
```

## Step 10: Configure Firewall

If you have a firewall, allow necessary ports:

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow your application port (if not using reverse proxy)
sudo ufw allow 5006/tcp
```

## Step 11: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# For Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# For Apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com
```

## Step 12: Verify Deployment

1. **Check Health Endpoint:**
   ```bash
   curl https://yourdomain.com/api/health
   ```

2. **Access Application:**
   - Open `https://yourdomain.com` in your browser
   - Verify all features work correctly

3. **Check Logs:**
   ```bash
   pm2 logs dashboard-backend
   ```

## Troubleshooting

### Application Won't Start

1. **Check PM2 logs:**
   ```bash
   pm2 logs dashboard-backend --lines 50
   ```

2. **Check environment variables:**
   ```bash
   pm2 env dashboard-backend
   ```

3. **Verify database connection:**
   - Check `backend/.env` file
   - Test database connection manually
   - Ensure IP is whitelisted (for remote databases)

### Database Connection Issues

1. **Check database credentials** in `backend/.env`
2. **Verify database server is accessible:**
   ```bash
   mysql -h your_db_host -u your_db_user -p
   ```
3. **Check firewall rules** - ensure MySQL port (3306) is open
4. **For remote databases:** Ensure your server IP is whitelisted

### Port Already in Use

1. **Find process using port:**
   ```bash
   sudo lsof -i :5006
   # or
   sudo netstat -tulpn | grep :5006
   ```

2. **Kill the process or change port** in `backend/.env`

### Frontend Not Loading

1. **Verify React app was built:**
   ```bash
   ls -la build/
   ```
   If build directory doesn't exist, run:
   ```bash
   npm run build:prod
   ```

2. **Check backend logs** for static file serving errors:
   ```bash
   pm2 logs dashboard-backend
   ```

3. **Verify REACT_APP_API_URL is set correctly** in root `.env` file before building

### CORS Errors

1. **Update CORS_ORIGIN** in `backend/.env` with your production domain
2. **Restart PM2:**
   ```bash
   pm2 restart dashboard-backend
   ```

## Maintenance

### Updating the Application

```bash
# Pull latest changes (if using Git)
git pull origin main

# Install/update dependencies
npm install --production
cd backend && npm install --production && cd ..

# Rebuild React app and restart backend
npm run deploy:prod

# Or manually:
npm run build:prod
pm2 restart dashboard-backend --update-env
```

### Viewing Logs

```bash
# All logs
pm2 logs dashboard-backend

# Error logs only
pm2 logs dashboard-backend --err

# Last 100 lines
pm2 logs dashboard-backend --lines 100

# Follow logs in real-time
pm2 logs dashboard-backend --lines 0
```

### Monitoring

```bash
# Real-time monitoring
pm2 monit

# Process status
pm2 status

# Detailed info
pm2 show dashboard-backend
```

### Backup

1. **Database Backup:**
   ```bash
   mysqldump -u your_db_user -p your_db_name > backup_$(date +%Y%m%d).sql
   ```

2. **Application Backup:**
   ```bash
   tar -czf dashboard_backup_$(date +%Y%m%d).tar.gz /path/to/your/project
   ```

## Security Best Practices

1. ✅ **Never commit `.env` files** to version control
2. ✅ **Use strong database passwords**
3. ✅ **Enable HTTPS/SSL** for all connections
4. ✅ **Keep dependencies updated:**
   ```bash
   npm audit
   npm audit fix
   ```
5. ✅ **Restrict CORS** to known domains only
6. ✅ **Regular backups** of database and files
7. ✅ **Monitor logs** for suspicious activity
8. ✅ **Use firewall** to restrict unnecessary ports

## Performance Optimization

1. **Enable Gzip compression** (already configured in server.js)
2. **Use CDN** for static assets (optional)
3. **Enable database query caching**
4. **Monitor memory usage:**
   ```bash
   pm2 monit
   ```

## Support

For issues or questions:
- Check PM2 logs: `pm2 logs dashboard-backend`
- Review server logs in `backend/logs/`
- Check application health: `https://yourdomain.com/api/health`

---

**Deployment Complete! 🎉**

Your application should now be running at `https://yourdomain.com`

