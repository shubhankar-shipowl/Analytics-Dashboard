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
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 60000, // 60 seconds
  // SSL configuration for remote connections
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false'
  } : false,
  // Additional connection options
  multipleStatements: false,
  dateStrings: false,
  supportBigNumbers: true,
  bigNumberStrings: true
};

// Create MySQL connection pool
const pool = mysql.createPool(connectionConfig);

// Log pool events
pool.on('connection', (connection) => {
  logger.db(`New MySQL connection established as id ${connection.threadId}`);
});

pool.on('error', (err) => {
  logger.error('MySQL pool error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    logger.warn('Database connection lost. Attempting to reconnect...');
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

// Execute query helper function with logging
const query = async (sql, params = []) => {
  const startTime = Date.now();
  try {
    logger.debug(`Executing query: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`, params.length > 0 ? `Params: ${params.length} items` : '');
    const [results, fields] = await pool.execute(sql, params);
    const duration = Date.now() - startTime;
    
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

module.exports = {
  pool,
  testConnection,
  query,
  getPoolStats
};

