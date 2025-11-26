const mysql = require('mysql2/promise');
require('dotenv').config();
const logger = require('../utils/logger');

// Build connection configuration
// Handle password with proper trimming and quote removal
let dbPassword = process.env.DB_PASSWORD || '';
if (dbPassword) {
  // Remove surrounding quotes if present
  dbPassword = dbPassword.trim();
  if ((dbPassword.startsWith('"') && dbPassword.endsWith('"')) ||
      (dbPassword.startsWith("'") && dbPassword.endsWith("'"))) {
    dbPassword = dbPassword.slice(1, -1);
  }
  dbPassword = dbPassword.trim();
}

const connectionConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: dbPassword,
  database: process.env.DB_NAME || 'dashboard_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 30, // Optimized: Increased for VPS production
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000, // 60 seconds
  // Optimize: Add connection reuse settings
  // Removed acquireTimeout and timeout - these are pool options, not connection options
  // SSL configuration for remote connections
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
  // Additional connection options
  multipleStatements: false,
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: true,
  // Optimize: Enable connection compression for large queries
  compress: true,
  // Optimize: Use prepared statements cache
  typeCast: true
  // Note: timeout and reuseConnection are not valid MySQL2 connection options
  // Query timeout is handled in the query() function using Promise.race()
};

// Create MySQL connection pool
const pool = mysql.createPool(connectionConfig);

// Log pool events
pool.on('connection', (connection) => {
  logger.db(`New MySQL connection established as id ${connection.threadId}`);
});

pool.on('error', (err) => {
  logger.error('MySQL pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    logger.warn('Database connection lost. Pool will automatically reconnect...');
    // Don't crash - pool handles reconnection automatically
  } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_QUIT') {
    logger.warn('Database connection closed. Pool will create new connections...');
  } else {
    logger.error('Unexpected database pool error:', err);
    // Log but don't crash - let pool handle it
  }
});

// Connection health check - validate connections periodically
let healthCheckInterval = null;

const startHealthCheck = () => {
  // Clear any existing interval
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  // Run health check every 5 minutes
  healthCheckInterval = setInterval(async () => {
    try {
      const connection = await pool.getConnection();
      await connection.query('SELECT 1');
      connection.release();
      logger.debug('✅ Database connection health check passed');
    } catch (error) {
      logger.warn('⚠️ Database health check failed:', error.message);
      // Don't crash - just log the warning
      // Pool will handle reconnection automatically
    }
  }, 5 * 60 * 1000); // Every 5 minutes
};

// Start health check
startHealthCheck();

// Cleanup on process exit
process.on('SIGTERM', () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
});

process.on('SIGINT', () => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
});

// Test database connection with retry logic
const testConnection = async (retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.db(`Database connection test attempt ${attempt}/${retries}`);
      
      const connection = await pool.getConnection();
      logger.db('Connection acquired, testing query...');
      
      // Test query with timeout
      await Promise.race([
        connection.query('SELECT 1 as test'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 10000)
        )
      ]);
      
      // Test database selection (optional, connection already uses the database)
      try {
        await connection.query(`USE \`${process.env.DB_NAME || 'dashboard_db'}\``);
      } catch (useError) {
        // Ignore USE errors, connection might already be using the database
        logger.debug('USE database query skipped or failed (this is usually fine)');
      }
      
      connection.release();
      
      logger.info('✅ Database connected successfully');
      logger.db(`Connected to database: ${process.env.DB_NAME || 'dashboard_db'} on ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}`);
      return true;
    } catch (error) {
      logger.error(`❌ Database connection attempt ${attempt} failed:`, error.message);
      logger.error('Error code:', error.code);
      logger.error('Error errno:', error.errno);
      logger.error('Error sqlState:', error.sqlState);
      
      if (attempt < retries) {
        logger.warn(`Retrying connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
      } else {
        logger.error('All connection attempts failed');
        logger.error('Connection details:', {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 3306,
          database: process.env.DB_NAME || 'dashboard_db',
          user: process.env.DB_USER || 'root',
          ssl: connectionConfig.ssl
        });
        
        // Provide helpful error messages
        if (error.code === 'ER_ACCESS_DENIED_ERROR' || error.code === 'ECONNREFUSED') {
          logger.error('💡 Troubleshooting tips:');
          logger.error('   1. Verify username and password are correct');
          logger.error('   2. Check if your IP address is whitelisted in MySQL');
          logger.error('   3. Ensure MySQL server allows remote connections');
          logger.error('   4. Check firewall settings');
          logger.error('   5. Verify database name exists');
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
          logger.error('💡 Troubleshooting tips:');
          logger.error('   1. Check if host address is correct');
          logger.error('   2. Verify network connectivity');
          logger.error('   3. Check if MySQL port is open');
        }
      }
    }
  }
  return false;
};

// Execute query helper function with logging and performance monitoring
const query = async (sql, params = []) => {
  const startTime = Date.now();
  const SLOW_QUERY_THRESHOLD = 1000; // 1 second
  
  try {
    // Use Promise.race to add query timeout
    const queryPromise = pool.execute(sql, params);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout after 120 seconds')), 120000)
    );
    
    const [results, fields] = await Promise.race([queryPromise, timeoutPromise]);
    const duration = Date.now() - startTime;
    
    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD) {
      logger.warn(`🐌 Slow Query Detected (${duration}ms): ${sql.substring(0, 150)}${sql.length > 150 ? '...' : ''}`);
    } else {
      logger.debug(`Executing query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`, params.length > 0 ? `Params: ${params.length} items` : '');
    }
    
    // For INSERT/UPDATE/DELETE, results contains affectedRows and insertId
    // For SELECT, results is an array of rows
    const isModifyQuery = sql.trim().toUpperCase().startsWith('INSERT') || 
                          sql.trim().toUpperCase().startsWith('UPDATE') || 
                          sql.trim().toUpperCase().startsWith('DELETE');
    
    if (isModifyQuery) {
      logger.db(`Query executed successfully in ${duration}ms`, { 
        affectedRows: results.affectedRows || 0,
        insertId: results.insertId || null
      });
      // Return the result object which contains affectedRows and insertId
      return results;
    } else {
      logger.db(`Query executed successfully in ${duration}ms`, { rows: Array.isArray(results) ? results.length : 1 });
      // Return the array of rows for SELECT queries
      return results;
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Handle connection errors gracefully - don't crash
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || 
        error.code === 'ECONNRESET' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND') {
      logger.error(`Database connection error after ${duration}ms:`, {
        message: error.message,
        code: error.code,
        sql: sql.substring(0, 200)
      });
      // Retry once for connection errors
      try {
        logger.info('Retrying query after connection error...');
        const [results, fields] = await pool.execute(sql, params);
        logger.info('Query succeeded on retry');
        return results;
      } catch (retryError) {
        logger.error('Query retry failed:', retryError.message);
        throw new Error(`Database connection error: ${error.message}. Please try again.`);
      }
    }
    
    logger.error(`Database query error after ${duration}ms:`, {
      message: error.message,
      code: error.code,
      sql: sql.substring(0, 200),
      params: params.length
    });
    throw error;
  }
};

// Get pool statistics
const getPoolStats = () => {
  return {
    totalConnections: pool.pool._allConnections.length,
    freeConnections: pool.pool._freeConnections.length,
    queuedRequests: pool.pool._connectionQueue.length
  };
};

// Close database connection pool gracefully
const closePool = async () => {
  try {
    if (pool && pool.end) {
      await pool.end();
      logger.info('✅ Database connection pool closed successfully');
    } else {
      logger.warn('⚠️ Database pool not available or already closed');
    }
  } catch (error) {
    logger.error('Error closing database pool:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  query,
  getPoolStats,
  closePool
};

