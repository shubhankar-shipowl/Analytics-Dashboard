const { pool } = require('../config/database');
const logger = require('./logger');

/**
 * Helper function to safely execute database queries with automatic retry
 */
const executeWithRetry = async (queryFn, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Check if error is retryable
      const retryableErrors = [
        'PROTOCOL_CONNECTION_LOST',
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND'
      ];
      
      if (retryableErrors.includes(error.code)) {
        logger.warn(`Database error (${error.code}), retrying... (${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      } else {
        throw error;
      }
    }
  }
};

/**
 * Check if database tables exist, create if missing
 */
const ensureTablesExist = async () => {
  try {
    const { query } = require('../config/database');
    const { createMissingTables } = require('./createTables');
    
    // Check if orders table exists
    const tables = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'orders'
    `);
    
    // Handle result - query returns array of rows
    // For COUNT queries, the result is an array with one object containing the count
    const count = tables && Array.isArray(tables) && tables.length > 0 && tables[0] ? (tables[0].count || 0) : 0;
    
    if (count === 0) {
      logger.warn('Orders table does not exist. Creating tables...');
      try {
        await createMissingTables();
        logger.info('✅ All required tables created successfully');
        return true;
      } catch (error) {
        logger.error('Error creating tables:', error);
        return false;
      }
    }
    
    // Check if api_logs and import_logs exist
    const apiLogsCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'api_logs'
    `);
    const apiLogsExists = apiLogsCheck && Array.isArray(apiLogsCheck) && apiLogsCheck.length > 0 && apiLogsCheck[0] && apiLogsCheck[0].count > 0;
    
    const importLogsCheck = await query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'import_logs'
    `);
    const importLogsExists = importLogsCheck && Array.isArray(importLogsCheck) && importLogsCheck.length > 0 && importLogsCheck[0] && importLogsCheck[0].count > 0;
    
    if (!apiLogsExists || !importLogsExists) {
      logger.info('Creating missing log tables...');
      try {
        await createMissingTables();
        logger.info('✅ Missing log tables created');
      } catch (error) {
        logger.warn('Could not create log tables (non-critical):', error.message);
      }
    }
    
    logger.info('✅ Database tables verified');
    return true;
  } catch (error) {
    logger.error('Error checking database tables:', error);
    return false;
  }
};

module.exports = {
  executeWithRetry,
  ensureTablesExist
};

