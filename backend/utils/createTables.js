require('dotenv').config();
const { query, pool } = require('../config/database');
const logger = require('./logger');
const fs = require('fs');
const path = require('path');

async function createMissingTables() {
  try {
    logger.info('Creating missing database tables...');
    
    // Create api_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS api_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        method VARCHAR(10) NOT NULL,
        endpoint VARCHAR(255) NOT NULL,
        status_code INT,
        response_time INT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        request_body TEXT,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_endpoint (endpoint),
        INDEX idx_status_code (status_code),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ api_logs table created/verified');

    // Create import_logs table
    await query(`
      CREATE TABLE IF NOT EXISTS import_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500),
        total_rows INT,
        inserted_rows INT,
        error_rows INT,
        status ENUM('success', 'failed', 'partial') DEFAULT 'success',
        error_message TEXT,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP NULL,
        INDEX idx_status (status),
        INDEX idx_started_at (started_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ import_logs table created/verified');

    // Create orders table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id VARCHAR(100) NULL,
        order_date DATE NOT NULL,
        order_status VARCHAR(100),
        product_name VARCHAR(255),
        sku VARCHAR(100),
        pincode VARCHAR(20),
        city VARCHAR(100),
        order_value DECIMAL(12, 2) NULL,
        payment_method VARCHAR(50),
        fulfillment_partner VARCHAR(100),
        quantity INT DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_order_date (order_date),
        INDEX idx_order_status (order_status),
        INDEX idx_product_name (product_name),
        INDEX idx_sku (sku),
        INDEX idx_pincode (pincode),
        INDEX idx_city (city),
        INDEX idx_payment_method (payment_method),
        INDEX idx_fulfillment_partner (fulfillment_partner),
        INDEX idx_order_value (order_value)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    logger.info('✅ orders table created/verified');

    // Create composite indexes (MySQL doesn't support IF NOT EXISTS for indexes, so we check first)
    try {
      // Check and create indexes one by one
      const indexes = [
        { name: 'idx_order_date_status', sql: 'CREATE INDEX idx_order_date_status ON orders(order_date, order_status)' },
        { name: 'idx_product_pincode', sql: 'CREATE INDEX idx_product_pincode ON orders(product_name, pincode)' },
        { name: 'idx_date_payment', sql: 'CREATE INDEX idx_date_payment ON orders(order_date, payment_method)' },
        { name: 'idx_status_partner', sql: 'CREATE INDEX idx_status_partner ON orders(order_status, fulfillment_partner)' }
      ];

      for (const index of indexes) {
        try {
          // Check if index exists
          const indexCheck = await query(`
            SELECT COUNT(*) as count 
            FROM information_schema.statistics 
            WHERE table_schema = DATABASE() 
            AND table_name = 'orders' 
            AND index_name = ?
          `, [index.name]);
          
          const count = indexCheck && Array.isArray(indexCheck) && indexCheck.length > 0 && indexCheck[0] ? (indexCheck[0].count || 0) : 0;
          
          if (count === 0) {
            await query(index.sql);
            logger.debug(`Created index: ${index.name}`);
          }
        } catch (indexError) {
          // Index might already exist or there's another issue
          if (indexError.code !== 'ER_DUP_KEYNAME') {
            logger.debug(`Index ${index.name} may already exist or error:`, indexError.message);
          }
        }
      }
      logger.info('✅ Composite indexes verified');
    } catch (error) {
      // Indexes might already exist, that's okay
      logger.debug('Some indexes may already exist:', error.message);
    }

    logger.info('✅ All tables created successfully!');
    return true;
  } catch (error) {
    logger.error('Error creating tables:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createMissingTables()
    .then(() => {
      logger.info('Table creation completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Table creation failed:', error);
      process.exit(1);
    });
}

module.exports = { createMissingTables };

