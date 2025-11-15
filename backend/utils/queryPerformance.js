/**
 * Query Performance Monitoring Utility
 * 
 * Tracks and logs slow queries for optimization
 */

const logger = require('./logger');

// Track query execution times
const queryStats = {
  slowQueries: [],
  totalQueries: 0,
  totalTime: 0,
  averageTime: 0
};

// Threshold for slow queries (in milliseconds)
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

/**
 * Wrap a query function to monitor performance
 * @param {Function} queryFn - The query function to wrap
 * @param {string} queryName - Name/description of the query
 * @returns {Function} Wrapped function with performance monitoring
 */
function monitorQuery(queryFn, queryName) {
  return async (...args) => {
    const startTime = Date.now();
    let error = null;
    let result = null;

    try {
      result = await queryFn(...args);
      return result;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const executionTime = Date.now() - startTime;
      
      queryStats.totalQueries++;
      queryStats.totalTime += executionTime;
      queryStats.averageTime = queryStats.totalTime / queryStats.totalQueries;

      // Log slow queries
      if (executionTime > SLOW_QUERY_THRESHOLD) {
        const slowQuery = {
          name: queryName,
          time: executionTime,
          timestamp: new Date().toISOString(),
          error: error ? error.message : null,
          args: args.length > 0 ? JSON.stringify(args).substring(0, 200) : null
        };
        
        queryStats.slowQueries.push(slowQuery);
        
        // Keep only last 100 slow queries
        if (queryStats.slowQueries.length > 100) {
          queryStats.slowQueries.shift();
        }

        logger.warn(`🐌 Slow Query Detected: ${queryName} took ${executionTime}ms`);
        if (error) {
          logger.error(`Query Error: ${error.message}`);
        }
      } else {
        logger.debug(`✅ Query: ${queryName} completed in ${executionTime}ms`);
      }
    }
  };
}

/**
 * Get query performance statistics
 * @returns {Object} Query statistics
 */
function getQueryStats() {
  return {
    ...queryStats,
    slowQueriesCount: queryStats.slowQueries.length,
    slowQueries: queryStats.slowQueries.slice(-10) // Last 10 slow queries
  };
}

/**
 * Reset query statistics
 */
function resetStats() {
  queryStats.slowQueries = [];
  queryStats.totalQueries = 0;
  queryStats.totalTime = 0;
  queryStats.averageTime = 0;
}

/**
 * Log query performance summary
 */
function logPerformanceSummary() {
  logger.info('📊 Query Performance Summary:');
  logger.info(`   Total Queries: ${queryStats.totalQueries}`);
  logger.info(`   Average Time: ${queryStats.averageTime.toFixed(2)}ms`);
  logger.info(`   Slow Queries (>${SLOW_QUERY_THRESHOLD}ms): ${queryStats.slowQueries.length}`);
  
  if (queryStats.slowQueries.length > 0) {
    logger.warn('🐌 Recent Slow Queries:');
    queryStats.slowQueries.slice(-5).forEach(q => {
      logger.warn(`   - ${q.name}: ${q.time}ms at ${q.timestamp}`);
    });
  }
}

// Log summary every 5 minutes
if (process.env.NODE_ENV === 'production') {
  setInterval(logPerformanceSummary, 5 * 60 * 1000);
}

module.exports = {
  monitorQuery,
  getQueryStats,
  resetStats,
  logPerformanceSummary,
  SLOW_QUERY_THRESHOLD
};

