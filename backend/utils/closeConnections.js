/**
 * Script to close all database connections and clear the connection pool
 */
require('dotenv').config();
const { pool, getPoolStats } = require('../config/database');
const logger = require('./logger');

async function closeAllConnections() {
  try {
    logger.info('Closing all database connections...');
    
    // Get pool stats before closing
    const statsBefore = getPoolStats();
    logger.info(`Pool stats before close: ${JSON.stringify(statsBefore)}`);
    
    // End all connections in the pool
    await pool.end();
    
    logger.info('✅ All database connections closed successfully');
    logger.info('Connection pool has been terminated');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error closing database connections:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  closeAllConnections();
}

module.exports = { closeAllConnections };

