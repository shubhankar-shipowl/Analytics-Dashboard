# PM2 Process Manager Guide

This guide explains how to use PM2 to manage the Dashboard application in production.

## What is PM2?

PM2 is a production process manager for Node.js applications that provides:
- **Auto-restart** on crashes
- **Process monitoring** and logging
- **Zero-downtime** deployments
- **Load balancing** (cluster mode)
- **Memory monitoring** and auto-restart
- **Log management**

## Installation

PM2 should be installed globally:

```bash
npm install -g pm2
```

Verify installation:
```bash
pm2 --version
```

## Quick Start

### Start Application
```bash
# Development mode
npm run pm2:start

# Production mode
npm run pm2:start:prod
```

Or directly with PM2:
```bash
pm2 start ecosystem.config.js
pm2 start ecosystem.config.js --env production
```

### Stop Application
```bash
npm run pm2:stop
# or
pm2 stop ecosystem.config.js
pm2 stop all
```

### Restart Application
```bash
npm run pm2:restart
# or
pm2 restart ecosystem.config.js
pm2 restart all
```

### View Status
```bash
npm run pm2:status
# or
pm2 status
```

### View Logs
```bash
npm run pm2:logs
# or
pm2 logs
pm2 logs dashboard-backend    # Backend logs only
pm2 logs dashboard-frontend  # Frontend logs only
```

### Monitor Processes
```bash
npm run pm2:monit
# or
pm2 monit
```

## PM2 Commands

### Process Management
```bash
pm2 start ecosystem.config.js    # Start all apps
pm2 stop ecosystem.config.js     # Stop all apps
pm2 restart ecosystem.config.js  # Restart all apps
pm2 reload ecosystem.config.js   # Zero-downtime reload
pm2 delete ecosystem.config.js   # Delete all apps
pm2 delete all                   # Delete all processes
```

### Individual Process Management
```bash
pm2 start dashboard-backend      # Start backend only
pm2 stop dashboard-backend       # Stop backend only
pm2 restart dashboard-backend    # Restart backend only
pm2 delete dashboard-backend    # Delete backend process
```

### Monitoring
```bash
pm2 status                       # View process status
pm2 list                         # List all processes
pm2 show dashboard-backend       # Detailed info about backend
pm2 monit                        # Real-time monitoring
pm2 logs                         # View all logs
pm2 logs dashboard-backend       # View backend logs only
pm2 logs --lines 100             # Last 100 lines
pm2 flush                        # Clear all logs
```

### Information
```bash
pm2 info dashboard-backend       # Detailed process info
pm2 describe dashboard-backend   # Process description
pm2 jlist                        # JSON list of processes
pm2 prettylist                   # Formatted list
```

## Auto-Start on System Boot

To make PM2 start your application automatically when the system reboots:

### Windows
```bash
npm run pm2:startup
# Follow the instructions to run the generated command
```

### Linux/Mac
```bash
pm2 startup
# Run the generated command (usually requires sudo)
pm2 save
```

After setup, save your current process list:
```bash
npm run pm2:save
# or
pm2 save
```

## Configuration

The PM2 configuration is in `ecosystem.config.js`. Key settings:

### Backend Configuration
- **Instances**: 1 (can increase for load balancing)
- **Memory Limit**: 500MB (auto-restart if exceeded)
- **Auto-restart**: Enabled
- **Logs**: Stored in `backend/logs/`

### Frontend Configuration
- **Instances**: 1
- **Memory Limit**: 1GB
- **Auto-restart**: Enabled
- **Logs**: Stored in `logs/`

## Environment Variables

PM2 will automatically load environment variables from:
- `backend/.env` for backend
- Root `.env` for frontend (if exists)

You can also set environment variables in `ecosystem.config.js`:
```javascript
env: {
  NODE_ENV: 'development',
  PORT: 5000
}
```

## Log Management

### Log Locations
- Backend logs: `backend/logs/pm2-*.log`
- Frontend logs: `logs/pm2-frontend-*.log`

### View Logs
```bash
pm2 logs                    # All logs
pm2 logs dashboard-backend  # Backend only
pm2 logs --lines 50         # Last 50 lines
pm2 logs --err              # Errors only
pm2 logs --out              # Output only
```

### Clear Logs
```bash
pm2 flush                   # Clear all logs
```

## Cluster Mode (Load Balancing)

To run multiple instances of the backend for load balancing, edit `ecosystem.config.js`:

```javascript
{
  name: 'dashboard-backend',
  instances: 4,              // Number of instances
  exec_mode: 'cluster',      // Cluster mode
  // ... other config
}
```

Then restart:
```bash
pm2 restart ecosystem.config.js
```

## Monitoring & Alerts

### Real-time Monitoring
```bash
pm2 monit
```

Shows:
- CPU usage
- Memory usage
- Process status
- Logs

### Web Dashboard
PM2 Plus (optional, requires account):
```bash
pm2 link <secret_key> <public_key>
```

## Troubleshooting

### Process Won't Start
1. Check logs: `pm2 logs dashboard-backend`
2. Check status: `pm2 status`
3. Verify environment: `pm2 show dashboard-backend`

### High Memory Usage
- Check memory limit in `ecosystem.config.js`
- Increase `max_memory_restart` if needed
- Check for memory leaks

### Process Keeps Restarting
1. Check logs for errors: `pm2 logs dashboard-backend --err`
2. Check restart count: `pm2 status`
3. Verify database connection
4. Check environment variables

### Port Already in Use
```bash
# Find process using port
netstat -ano | findstr :5000  # Windows
lsof -i :5000                 # Linux/Mac

# Kill process or change port in ecosystem.config.js
```

## Best Practices

1. **Always use PM2 in production** - Never run `node server.js` directly
2. **Set up auto-start** - Use `pm2 startup` to survive reboots
3. **Monitor logs regularly** - Check `pm2 logs` for issues
4. **Set memory limits** - Prevent memory leaks from crashing the server
5. **Use cluster mode** - For high-traffic applications
6. **Save process list** - Run `pm2 save` after configuration changes
7. **Use environment files** - Keep sensitive data in `.env` files

## NPM Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `npm run pm2:start` | Start in dev mode | Starts both backend and frontend |
| `npm run pm2:start:prod` | Start in prod mode | Starts in production environment |
| `npm run pm2:stop` | Stop all | Stops all PM2 processes |
| `npm run pm2:restart` | Restart all | Restarts all processes |
| `npm run pm2:status` | View status | Shows process status |
| `npm run pm2:logs` | View logs | Shows all logs |
| `npm run pm2:monit` | Monitor | Real-time monitoring |
| `npm run pm2:delete` | Delete all | Removes all processes |
| `npm run pm2:save` | Save config | Saves current process list |
| `npm run pm2:startup` | Setup startup | Configures auto-start on boot |

## Migration from Current Setup

If you're currently running the app with `npm run dev:all`:

1. **Stop current processes**:
   ```bash
   npm run stop
   ```

2. **Start with PM2**:
   ```bash
   npm run pm2:start
   ```

3. **Verify it's running**:
   ```bash
   npm run pm2:status
   ```

4. **Check logs**:
   ```bash
   npm run pm2:logs
   ```

## Production Deployment Checklist

- [ ] Install PM2 globally
- [ ] Configure `ecosystem.config.js` for production
- [ ] Set up environment variables
- [ ] Test with `npm run pm2:start:prod`
- [ ] Set up auto-start with `pm2 startup`
- [ ] Save process list with `pm2 save`
- [ ] Configure log rotation (optional)
- [ ] Set up monitoring alerts (optional)
- [ ] Document deployment process

## Additional Resources

- [PM2 Official Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [PM2 Ecosystem File](https://pm2.keymetrics.io/docs/usage/application-declaration/)
- [PM2 Cluster Mode](https://pm2.keymetrics.io/docs/usage/cluster-mode/)

