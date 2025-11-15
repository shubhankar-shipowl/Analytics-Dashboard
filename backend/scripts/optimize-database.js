#!/usr/bin/env node

/**
 * Database Optimization Script
 * 
 * This script:
 * 1. Adds optimized indexes for better query performance
 * 2. Analyzes tables to update statistics
 * 3. Provides optimization recommendations
 * 
 * Usage: node scripts/optimize-database.js
 */

const { query, testConnection } = require('../config/database');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

async function optimizeDatabase() {
  try {
    logger.info('🚀 Starting database optimization...');
    
    // Test connection first
    const connected = await testConnection();
    if (!connected) {
      logger.error('❌ Failed to connect to database. Aborting optimization.');
      process.exit(1);
    }

    // Read optimization SQL file
    const sqlFile = path.join(__dirname, '../database/optimize-indexes.sql');
    let sqlContent = '';
    
    if (fs.existsSync(sqlFile)) {
      sqlContent = fs.readFileSync(sqlFile, 'utf8');
      logger.info('📄 Loaded optimization SQL from file');
    } else {
      // Fallback: Use inline SQL
      logger.warn('⚠️ Optimization SQL file not found, using inline SQL');
      sqlContent = `
        USE dashboard_db;
        
        -- Add composite indexes for common query patterns
        CREATE INDEX IF NOT EXISTS idx_date_status_value ON orders(order_date, order_status, order_value);
        CREATE INDEX IF NOT EXISTS idx_date_product ON orders(order_date, product_name);
        CREATE INDEX IF NOT EXISTS idx_date_pincode ON orders(order_date, pincode);
        CREATE INDEX IF NOT EXISTS idx_product_status ON orders(product_name, order_status);
        CREATE INDEX IF NOT EXISTS idx_date_product_status ON orders(order_date, product_name, order_status);
        CREATE INDEX IF NOT EXISTS idx_date_pincode_status ON orders(order_date, pincode, order_status);
        CREATE INDEX IF NOT EXISTS idx_partner_status_date ON orders(fulfillment_partner, order_status, order_date);
        CREATE INDEX IF NOT EXISTS idx_payment_date_status ON orders(payment_method, order_date, order_status);
        CREATE INDEX IF NOT EXISTS idx_city_date ON orders(city, order_date);
        CREATE INDEX IF NOT EXISTS idx_state_date ON orders(state, order_date);
      `;
    }

    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('USE'));

    logger.info(`📊 Executing ${statements.length} optimization statements...`);

    let successCount = 0;
    let errorCount = 0;

    for (const statement of statements) {
      try {
        await query(statement);
        successCount++;
        logger.debug(`✅ Executed: ${statement.substring(0, 80)}...`);
      } catch (error) {
        // Ignore "index already exists" errors
        if (error.code === 'ER_DUP_KEYNAME' || error.message.includes('Duplicate key name')) {
          logger.debug(`ℹ️ Index already exists: ${statement.substring(0, 80)}...`);
          successCount++;
        } else {
          errorCount++;
          logger.error(`❌ Error executing statement: ${error.message}`);
          logger.debug(`Statement: ${statement.substring(0, 200)}`);
        }
      }
    }

    // Analyze tables to update statistics
    logger.info('📊 Analyzing tables to update statistics...');
    try {
      await query('ANALYZE TABLE orders');
      logger.info('✅ Table statistics updated');
    } catch (error) {
      logger.warn(`⚠️ Could not analyze table: ${error.message}`);
    }

    // Get index information
    logger.info('📊 Checking index usage...');
    try {
      const indexes = await query('SHOW INDEX FROM orders');
      logger.info(`✅ Found ${indexes.length} indexes on orders table`);
      
      // Group by index name
      const indexGroups = {};
      indexes.forEach(idx => {
        if (!indexGroups[idx.Key_name]) {
          indexGroups[idx.Key_name] = [];
        }
        indexGroups[idx.Key_name].push(idx.Column_name);
        }
      });

      logger.info('📋 Index Summary:');
      Object.keys(indexGroups).forEach(key => {
        logger.info(`   - ${key}: (${indexGroups[key].join(', ')})`);
      });
    } catch (error) {
      logger.warn(`⚠️ Could not get index information: ${error.message}`);
    }

    logger.info('');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info('✅ Database Optimization Complete!');
    logger.info('═══════════════════════════════════════════════════════════');
    logger.info(`   Successfully executed: ${successCount} statements`);
    if (errorCount > 0) {
      logger.warn(`   Errors encountered: ${errorCount}`);
    }
    logger.info('');
    logger.info('💡 Performance Tips:');
    logger.info('   1. Monitor query performance with EXPLAIN SELECT ...');
    logger.info('   2. Check slow query log for queries taking > 1 second');
    logger.info('   3. Composite indexes are most effective when filtering by leftmost columns');
    logger.info('   4. Run ANALYZE TABLE periodically to update statistics');
    logger.info('');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Database optimization failed:', error);
    process.exit(1);
  }
}

// Run optimization
optimizeDatabase();

