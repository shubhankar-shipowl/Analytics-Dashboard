# PM2 Quick Start Guide

## Installation

```bash
npm install -g pm2
```

## Basic Commands

### Start Application
```bash
npm run pm2:start          # Development
npm run pm2:start:prod     # Production
```

### Manage Processes
```bash
npm run pm2:status         # View status
npm run pm2:stop           # Stop all
npm run pm2:restart        # Restart all
npm run pm2:delete         # Delete all
```

### View Logs
```bash
npm run pm2:logs           # All logs
pm2 logs dashboard-backend # Backend only
pm2 logs dashboard-frontend # Frontend only
```

### Monitor
```bash
npm run pm2:monit          # Real-time monitoring
```

## Auto-Start on Boot

```bash
npm run pm2:startup        # Setup auto-start
npm run pm2:save           # Save current processes
```

## Direct PM2 Commands

```bash
pm2 start ecosystem.config.js
pm2 stop ecosystem.config.js
pm2 restart ecosystem.config.js
pm2 delete ecosystem.config.js
pm2 status
pm2 logs
pm2 monit
```

For detailed documentation, see [PM2_GUIDE.md](./PM2_GUIDE.md)

