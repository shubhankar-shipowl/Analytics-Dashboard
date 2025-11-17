# Environment Variables Configuration

This document describes all environment variables needed for the Dashboard application.

## Frontend Environment Variables

Create a `.env` file in the root directory:

```env
# API URL - Update with your production domain
# For development: http://localhost:5006/api
# For production: https://yourdomain.com/api
REACT_APP_API_URL=http://localhost:5006/api

# Frontend Port (for development only, not used in production build)
PORT=3003
```

**Important Notes:**
- `REACT_APP_API_URL` must be set **before** building the React app
- The value is embedded into the build at build time
- To change it, you must rebuild the application

## Backend Environment Variables

Create a `backend/.env` file:

```env
# Node Environment
# Options: development, production
NODE_ENV=production

# Server Configuration
# Port on which the backend server will run
PORT=5006

# Database Configuration
# Host address of your MySQL database
DB_HOST=localhost
# MySQL port (default: 3306)
DB_PORT=3306
# Database username
DB_USER=your_database_user
# Database password (enclose in quotes if it contains special characters)
DB_PASSWORD=your_database_password
# Database name
DB_NAME=your_database_name

# Database Connection Pool
# Number of connections in the pool (default: 20)
DB_POOL_SIZE=20

# SSL Configuration
# Set to 'true' for remote databases that require SSL
DB_SSL=false
# Set to 'false' to allow self-signed certificates
DB_SSL_REJECT_UNAUTHORIZED=true

# CORS Configuration
# Comma-separated list of allowed origins
# Example: https://yourdomain.com,https://www.yourdomain.com
# Leave empty in production to restrict to specified origins
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Security
# Set to 'true' only for testing - should be 'false' in production
# Allows server to start without database connection (for testing)
ALLOW_START_WITHOUT_DB=false

# Logging
# Options: error, warn, info, debug
LOG_LEVEL=info

# Swagger Documentation
# Set to 'true' to enable Swagger UI in production (default: disabled)
ENABLE_SWAGGER=false

# Static File Serving
# Set to 'true' to serve React build from backend (default: false)
# When false, frontend runs as separate process on port 3003
SERVE_STATIC_FILES=false
```

## Environment Variable Descriptions

### Frontend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `REACT_APP_API_URL` | Yes | `http://localhost:5006/api` | Base URL for API requests |
| `PORT` | No | `3003` | Development server port (not used in production) |

### Backend Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | `development` | Node environment (development/production) |
| `PORT` | No | `5006` | Server port |
| `DB_HOST` | Yes | `localhost` | MySQL host address |
| `DB_PORT` | No | `3306` | MySQL port |
| `DB_USER` | Yes | - | MySQL username |
| `DB_PASSWORD` | Yes | - | MySQL password |
| `DB_NAME` | Yes | `dashboard_db` | Database name |
| `DB_POOL_SIZE` | No | `20` | Connection pool size |
| `DB_SSL` | No | `false` | Enable SSL for database connection |
| `DB_SSL_REJECT_UNAUTHORIZED` | No | `true` | Reject unauthorized SSL certificates |
| `CORS_ORIGIN` | No | - | Allowed CORS origins (comma-separated) |
| `ALLOW_START_WITHOUT_DB` | No | `false` | Allow server start without database (testing only) |
| `LOG_LEVEL` | No | `info` | Logging level |
| `ENABLE_SWAGGER` | No | `false` | Enable Swagger UI in production |
| `SERVE_STATIC_FILES` | No | `false` | Serve React build from backend (if true, frontend not needed) |

## Production Configuration Example

### Frontend `.env` (Root Directory)

```env
REACT_APP_API_URL=https://yourdomain.com/api
```

### Backend `backend/.env`

```env
NODE_ENV=production
PORT=5006

DB_HOST=your-remote-db-host.com
DB_PORT=3306
DB_USER=production_user
DB_PASSWORD=secure_password_here
DB_NAME=dashboard_production
DB_POOL_SIZE=20
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

ALLOW_START_WITHOUT_DB=false
LOG_LEVEL=info
ENABLE_SWAGGER=false
SERVE_STATIC_FILES=false
```

## Development Configuration Example

### Frontend `.env` (Root Directory)

```env
REACT_APP_API_URL=http://localhost:5000/api
PORT=3003
```

### Backend `backend/.env`

```env
NODE_ENV=development
PORT=5006

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_local_password
DB_NAME=dashboard_db
DB_POOL_SIZE=10
DB_SSL=false

CORS_ORIGIN=http://localhost:3000,http://localhost:3003

ALLOW_START_WITHOUT_DB=false
LOG_LEVEL=debug
SERVE_STATIC_FILES=false
```

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Use strong passwords** for database credentials
3. **Restrict CORS origins** in production to your actual domains
4. **Use SSL** for database connections in production (`DB_SSL=true`)
5. **Set `ALLOW_START_WITHOUT_DB=false`** in production
6. **Use environment-specific values** - different for dev/staging/production
7. **Rotate credentials** regularly
8. **Limit database user permissions** - only grant necessary privileges

## Setting Environment Variables

### Local Development

1. Create `.env` file in root directory
2. Create `backend/.env` file
3. Add variables as shown in examples above

### Production (Hostinger)

1. SSH into your server
2. Navigate to project directory
3. Create `.env` files with production values
4. Ensure files have correct permissions:
   ```bash
   chmod 600 .env backend/.env
   ```

### Using PM2

PM2 automatically loads environment variables from:
- `backend/.env` file (specified in `ecosystem.config.js`)
- Environment variables set in the shell
- Variables in `ecosystem.config.js` `env_production` section

## Troubleshooting

### Environment Variables Not Loading

1. **Check file location:**
   - Frontend: `.env` in root directory
   - Backend: `backend/.env`

2. **Check file format:**
   - No spaces around `=`
   - No quotes unless needed for special characters
   - One variable per line

3. **Restart application:**
   ```bash
   pm2 restart dashboard-backend --update-env
   ```

### Database Connection Issues

1. **Verify credentials** in `backend/.env`
2. **Check host and port** are correct
3. **For remote databases:** Ensure IP is whitelisted
4. **Test connection manually:**
   ```bash
   mysql -h DB_HOST -u DB_USER -p
   ```

### CORS Errors

1. **Update `CORS_ORIGIN`** with your actual domain
2. **Include protocol** (http:// or https://)
3. **No trailing slashes**
4. **Restart server** after changes

### React App Not Connecting to API

1. **Check `REACT_APP_API_URL`** is set correctly
2. **Rebuild React app** after changing the variable:
   ```bash
   npm run build:prod
   ```
3. **Verify API is accessible** at the specified URL

## Notes

- Environment variables starting with `REACT_APP_` are embedded into the React build
- Backend environment variables are loaded at runtime
- Changes to frontend variables require a rebuild
- Changes to backend variables require a server restart

