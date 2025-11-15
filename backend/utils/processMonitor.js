/**
 * Process Monitor Utility
 * 
 * Monitors process health and prevents crashes
 */

const logger = require('./logger');
const { getPoolStats } = require('../config/database');

// Track process health
let healthCheckCount = 0;
let lastHealthCheck = Date.now();

/**
 * Perform health check
 */
async function performHealthCheck() {
  try {
    const poolStats = getPoolStats();
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const health = {
      status: 'healthy',
      uptime: Math.round(uptime),
      memory: {
        used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      },
      database: {
        totalConnections: poolStats.totalConnections || 0,
        freeConnections: poolStats.freeConnections || 0,
        queuedRequests: poolStats.queuedRequests || 0
      },
      timestamp: new Date().toISOString()
    };

    // Check for issues
    if (memoryUsage.heapUsed > 1500 * 1024 * 1024) { // > 1.5GB
      logger.warn('⚠️ High memory usage detected:', health.memory);
    }

    if (poolStats.queuedRequests > 10) {
      logger.warn('⚠️ Database connection queue is high:', poolStats.queuedRequests);
    }

    healthCheckCount++;
    lastHealthCheck = Date.now();
    
    return health;
  } catch (error) {
    logger.error('Health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Start periodic health monitoring
 */
function startHealthMonitoring(intervalMinutes = 5) {
  const interval = setInterval(async () => {
    const health = await performHealthCheck();
    logger.debug('Health check:', health);
  }, intervalMinutes * 60 * 1000);

  // Perform initial health check
  performHealthCheck();

  return interval;
}

/**
 * Get process health status
 */
function getHealthStatus() {
  return {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    healthCheckCount,
    lastHealthCheck: new Date(lastHealthCheck).toISOString()
  };
}

module.exports = {
  performHealthCheck,
  startHealthMonitoring,
  getHealthStatus
};

