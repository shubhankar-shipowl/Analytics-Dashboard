require('dotenv').config();
const { query, pool } = require('../config/database');
const logger = require('../utils/logger');

// All columns that should exist in the orders table
const allColumns = [
  { name: 'order_account', type: 'VARCHAR(255) NULL' },
  { name: 'order_id', type: 'VARCHAR(100) NULL' },
  { name: 'channel_order_number', type: 'VARCHAR(100) NULL' },
  { name: 'channel_order_date', type: 'DATETIME NULL' },
  { name: 'waybill_number', type: 'VARCHAR(100) NULL' },
  { name: 'pre_generated_waybill', type: 'VARCHAR(100) NULL' },
  { name: 'order_date', type: 'DATE NOT NULL' },
  { name: 'ref_invoice_number', type: 'VARCHAR(100) NULL' },
  { name: 'payment_method', type: 'VARCHAR(50) NULL' },
  { name: 'express', type: 'VARCHAR(50) NULL' },
  { name: 'pickup_warehouse', type: 'VARCHAR(255) NULL' },
  { name: 'consignee_name', type: 'VARCHAR(255) NULL' },
  { name: 'consignee_contact', type: 'VARCHAR(20) NULL' },
  { name: 'alternate_number', type: 'VARCHAR(20) NULL' },
  { name: 'address', type: 'TEXT NULL' },
  { name: 'city', type: 'VARCHAR(100) NULL' },
  { name: 'state', type: 'VARCHAR(100) NULL' },
  { name: 'pincode', type: 'VARCHAR(20) NULL' },
  { name: 'product_name', type: 'VARCHAR(500) NULL' },
  { name: 'quantity', type: 'INT DEFAULT 1' },
  { name: 'product_value', type: 'DECIMAL(12, 2) NULL' },
  { name: 'sku', type: 'VARCHAR(100) NULL' },
  { name: 'order_value', type: 'DECIMAL(12, 2) NULL' },
  { name: 'extra_charges', type: 'DECIMAL(12, 2) NULL' },
  { name: 'total_amount', type: 'DECIMAL(12, 2) NULL' },
  { name: 'cod_amount', type: 'DECIMAL(12, 2) NULL' },
  { name: 'dimensions', type: 'VARCHAR(100) NULL' },
  { name: 'weight', type: 'DECIMAL(10, 2) NULL' },
  { name: 'fulfillment_partner', type: 'VARCHAR(100) NULL' },
  { name: 'order_status', type: 'VARCHAR(100) NULL' },
  { name: 'added_on', type: 'DATETIME NULL' },
  { name: 'delivered_date', type: 'DATETIME NULL' },
  { name: 'rts_date', type: 'DATETIME NULL' },
  { name: 'client_order_id', type: 'VARCHAR(100) NULL' }
];

async function migrateColumns() {
  try {
    logger.info('Starting migration to add all Excel columns...');
    
    // Get existing columns
    const existingColumnsResult = await query(`
      SELECT COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders'
    `);
    
    // The query function returns the results array directly for SELECT queries
    // Handle different possible formats
    let existingColumns = [];
    if (Array.isArray(existingColumnsResult)) {
      existingColumns = existingColumnsResult;
    } else if (existingColumnsResult && Array.isArray(existingColumnsResult[0])) {
      existingColumns = existingColumnsResult[0];
    } else if (existingColumnsResult && typeof existingColumnsResult === 'object') {
      // If it's an object with a rows property or similar
      existingColumns = existingColumnsResult.rows || existingColumnsResult[0] || [];
    }
    
    const existingColumnNames = existingColumns.map(col => {
      // Handle both object format {COLUMN_NAME: 'value'} and direct value
      const columnName = col && typeof col === 'object' 
        ? (col.COLUMN_NAME || col.column_name || Object.values(col)[0])
        : col;
      return String(columnName || '').toLowerCase();
    });
    logger.info(`Found ${existingColumnNames.length} existing columns`);
    
    // Find missing columns
    const missingColumns = allColumns.filter(col => 
      !existingColumnNames.includes(col.name.toLowerCase())
    );
    
    if (missingColumns.length === 0) {
      logger.info('✅ All columns already exist. No migration needed.');
      return;
    }
    
    logger.info(`Adding ${missingColumns.length} missing columns...`);
    
    // Add missing columns
    for (const column of missingColumns) {
      try {
        await query(`ALTER TABLE orders ADD COLUMN ${column.name} ${column.type}`);
        logger.info(`✅ Added column: ${column.name}`);
      } catch (error) {
        if (error.code === 'ER_DUP_FIELDNAME') {
          logger.warn(`Column ${column.name} already exists, skipping...`);
        } else {
          logger.error(`Error adding column ${column.name}:`, error.message);
        }
      }
    }
    
    // Update product_name size if needed
    try {
      await query(`ALTER TABLE orders MODIFY COLUMN product_name VARCHAR(500) NULL`);
      logger.info('✅ Updated product_name column size to 500');
    } catch (error) {
      logger.debug('Could not update product_name size:', error.message);
    }
    
    // Add missing indexes
    const indexesToAdd = [
      { name: 'idx_state', sql: 'CREATE INDEX idx_state ON orders(state)' },
      { name: 'idx_channel_order_number', sql: 'CREATE INDEX idx_channel_order_number ON orders(channel_order_number)' },
      { name: 'idx_waybill_number', sql: 'CREATE INDEX idx_waybill_number ON orders(waybill_number)' },
      { name: 'idx_client_order_id', sql: 'CREATE INDEX idx_client_order_id ON orders(client_order_id)' }
    ];
    
    for (const index of indexesToAdd) {
      try {
        const indexCheckResult = await query(`
          SELECT COUNT(*) as count 
          FROM information_schema.statistics 
          WHERE table_schema = DATABASE() 
          AND table_name = 'orders' 
          AND index_name = ?
        `, [index.name]);
        
        // Handle both array and [rows, fields] format
        const indexCheck = Array.isArray(indexCheckResult) 
          ? indexCheckResult 
          : (Array.isArray(indexCheckResult[0]) ? indexCheckResult[0] : []);
        
        const count = indexCheck && indexCheck[0] ? (indexCheck[0].count || 0) : 0;
        
        if (count === 0) {
          await query(index.sql);
          logger.info(`✅ Added index: ${index.name}`);
        }
      } catch (error) {
        if (error.code !== 'ER_DUP_KEYNAME') {
          logger.debug(`Index ${index.name} may already exist:`, error.message);
        }
      }
    }
    
    logger.info('✅ Migration completed successfully!');
    
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
if (require.main === module) {
  migrateColumns()
    .then(() => {
      logger.info('Migration completed');
      process.exit(0);
    })
    .catch(error => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateColumns };

