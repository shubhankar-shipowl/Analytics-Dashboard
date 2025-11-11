/**
 * Backend Server
 * 
 * ARCHITECTURE: Database-Only
 * - All data is served from MySQL database
 * - Excel files are ONLY used for importing data INTO the database
 * - No Excel file reading for data retrieval
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const { testConnection, getPoolStats } = require('./config/database');
const logger = require('./utils/logger');
const { ensureTablesExist } = require('./utils/dbHelper');
const swaggerSpec = require('./config/swagger');
const ordersRoutes = require('./routes/orders');
const analyticsRoutes = require('./routes/analytics');
const importRoutes = require('./routes/import');

const app = express();
const PORT = process.env.PORT || 5000;

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.http(req, res, duration);
    
    // Log to database (async, don't wait) - only if table exists
    try {
      const { query } = require('./config/database');
      query(
        `INSERT INTO api_logs (method, endpoint, status_code, response_time, ip_address, user_agent) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.method,
          req.originalUrl,
          res.statusCode,
          duration,
          req.ip || req.connection.remoteAddress,
          req.get('user-agent') || ''
        ]
      ).catch(err => {
        // Only log if it's not a "table doesn't exist" error
        if (err.code === 'ER_NO_SUCH_TABLE') {
          // Table doesn't exist - try to create it (async, don't block)
          const { createMissingTables } = require('./utils/createTables');
          createMissingTables().catch(() => {
            // Ignore creation errors - table might be created on next restart
          });
        } else {
          // Other errors - only log in debug mode to avoid spam
          logger.debug('API logging error (non-critical):', err.message);
        }
      });
    } catch (err) {
      // Silently fail if logging fails
      if (err.code !== 'ER_NO_SUCH_TABLE') {
        logger.debug('API logging error (non-critical):', err);
      }
    }
  });
  
  next();
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Dashboard API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check endpoint
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 database:
 *                   type: object
 *                   properties:
 *                     connected:
 *                       type: boolean
 *                     poolStats:
 *                       type: object
 */
app.get('/api/health', (req, res) => {
  const poolStats = getPoolStats();
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    database: {
      connected: true,
      poolStats: poolStats
    }
  });
});

// API Routes
app.use('/api/orders', ordersRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/import', importRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Request error:', {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack
  });
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false,
    error: 'Route not found' 
  });
});

// Start server
const startServer = async () => {
  try {
    logger.info('Starting server...');
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection with retry
    logger.info('Testing database connection...');
    const dbConnected = await testConnection(3, 2000);
    if (!dbConnected) {
      const allowStartWithoutDB = process.env.ALLOW_START_WITHOUT_DB === 'true';
      
      if (allowStartWithoutDB) {
        logger.warn('⚠️  Database connection failed, but starting server anyway (ALLOW_START_WITHOUT_DB=true)');
        logger.warn('⚠️  API endpoints will not work without database connection');
        logger.warn('⚠️  To fix: Whitelist your IP (122.181.101.44) in MySQL server');
      } else {
        logger.error('Database connection failed after multiple attempts.');
        logger.error('Server will not start without database connection.');
        logger.error('');
        logger.error('💡 Solutions:');
        logger.error('   1. Whitelist your IP address (122.181.101.44) in MySQL server');
        logger.error('   2. Or set ALLOW_START_WITHOUT_DB=true in .env (for testing only)');
        logger.error('   3. Check MySQL server allows remote connections');
        logger.error('   4. Verify firewall settings');
        process.exit(1);
      }
    }
    
    // Verify and create database tables if missing
    logger.info('Verifying database tables...');
    try {
      const { createMissingTables } = require('./utils/createTables');
      await createMissingTables();
      logger.info('✅ All database tables verified/created');
    } catch (error) {
      logger.warn('Could not verify/create all tables:', error.message);
      // Continue anyway - tables might already exist
    }
    
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API URL: http://localhost:${PORT}/api`);
      logger.info(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
      logger.info(`📝 Logs directory: ${require('path').join(__dirname, 'logs')}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} signal received: closing HTTP server and database connections`);
  
  try {
    // Close database connections
    const { pool } = require('./config/database');
    await pool.end();
    logger.info('✅ Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();

module.exports = app;

