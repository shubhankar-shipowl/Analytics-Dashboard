const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Order = require('../models/Order');
const logger = require('./logger');

// Normalize column names to match database schema
const normalizeColumnName = (colName) => {
  if (!colName) return colName;
  const lower = colName.toLowerCase().trim();
  
  // Order ID variations - prioritize exact matches
  if (lower === 'orderid' || lower === 'order id') return 'order_id';
  if ((lower.includes('order') && lower.includes('id')) || 
      lower.includes('orderid') || 
      lower.includes('order number') ||
      lower.includes('ordernumber') ||
      lower.includes('client order id')) return 'order_id';
  
  // Date variations - prioritize "Order Date"
  if (lower === 'order date' || lower === 'orderdate') return 'order_date';
  if (lower.includes('date') && !lower.includes('delivered') && !lower.includes('rts') && !lower.includes('added')) {
    return 'order_date';
  }
  
  // Amount/Revenue variations - prioritize "Order Amount" and "Total Amount"
  if (lower === 'order amount' || lower === 'total amount') return 'order_value';
  if (lower.includes('amount') && !lower.includes('cod') && !lower.includes('extra')) {
    return 'order_value';
  }
  if (lower.includes('price') || lower.includes('revenue') || 
      lower.includes('value') || lower.includes('total') || 
      lower.includes('order value') || lower.includes('order_value')) {
    return 'order_value';
  }
  
  // Status variations - exact match for "Status"
  if (lower === 'status') return 'order_status';
  if (lower.includes('status') || lower.includes('state') || 
      lower.includes('order status') || lower.includes('orderstatus')) return 'order_status';
  
  // Payment method variations - "Mode" column contains COD/PPD
  if (lower === 'mode') return 'payment_method';
  if (lower.includes('payment') || lower.includes('cod') || 
      lower.includes('ppd') || lower.includes('payment method') ||
      lower.includes('paymentmethod') || lower.includes('payment type')) return 'payment_method';
  
  // City variations
  if (lower === 'city') return 'city';
  if (lower.includes('city') || lower.includes('ship city') || 
      lower.includes('delivery city')) return 'city';
  
  // Pincode variations
  if (lower === 'pincode' || lower === 'pin code') return 'pincode';
  if (lower.includes('pin') || lower.includes('zip') || 
      lower.includes('pincode') || lower.includes('pin code') ||
      lower.includes('postal')) return 'pincode';
  
  // Product variations - exact match for "Product Name"
  if (lower === 'product name' || lower.trim() === 'product name') {
    return 'product_name';
  }
  // Check for "Product Name" variations (must include both "product" AND "name")
  if ((lower.includes('product') && lower.includes('name')) || lower.includes('productname')) {
    // Exclude quantity, qty, amount, price, cost, etc.
    if (!lower.includes('quantity') && !lower.includes('qty') && 
        !lower.includes('amount') && !lower.includes('price') && 
        !lower.includes('cost') && !lower.includes('value')) {
      return 'product_name';
    }
  }
  
  // SKU - exact match
  if (lower === 'sku') return 'sku';
  if (lower.includes('sku')) return 'sku';
  
  // Quantity variations - prioritize "Product Qty"
  if (lower === 'product qty' || lower === 'product quantity') return 'quantity';
  if (lower.includes('quantity') || lower.includes('qty') || 
      lower.includes('qty.') || lower.includes('qty ')) {
    return 'quantity';
  }
  
  // Fulfillment partner variations - exact match for "Fulfilled By"
  if (lower === 'fulfilled by' || lower === 'fulfilledby') return 'fulfillment_partner';
  if (lower.includes('fulfilled by') || lower.includes('fulfilledby')) {
    return 'fulfillment_partner';
  }
  if (lower.includes('fulfillment') || lower.includes('partner') || 
      lower.includes('vendor') || lower.includes('fulfillment partner') ||
      lower.includes('fulfillmentpartner') || lower.includes('carrier') ||
      lower.includes('shipping partner') || lower.includes('fulfilled')) {
    return 'fulfillment_partner';
  }
  
  return colName;
};

// Parse date from various formats
const parseDate = (dateValue) => {
  if (!dateValue) return null;
  
  // If already a Date object
  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }
  
  // If it's a number (Excel serial date)
  if (typeof dateValue === 'number') {
    // Excel epoch starts on 1899-12-30
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
    return isNaN(date.getTime()) ? null : date;
  }
  
  // If it's a string, try to parse it
  if (typeof dateValue === 'string') {
    const trimmed = dateValue.trim();
    if (!trimmed) return null;
    
    // Try direct Date parse first
    let date = new Date(trimmed);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try DD/MM/YYYY or MM/DD/YYYY format
    const parts = trimmed.split(/[/-]/);
    if (parts.length === 3) {
      // Try DD/MM/YYYY first (common in India)
      date = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (!isNaN(date.getTime())) {
        return date;
      }
      // Try MM/DD/YYYY
      date = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  return null;
};

// Parse number value
const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return value;
  
  // Remove currency symbols, commas, and whitespace
  const cleaned = String(value).replace(/[₹,$,\s]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

// Import Excel file
const importExcelFile = async (filePath, options = {}) => {
  const { clearExisting = false, batchSize = 5000 } = options; // Increased from 1000 to 5000 for better performance
  
  try {
    logger.info(`Starting Excel import from: ${filePath}`);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Read Excel file
    logger.info('Reading Excel file...');
    const workbook = XLSX.readFile(filePath, { 
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('No sheets found in Excel file');
    }
    
    // Get the first sheet
    const sheetName = workbook.SheetNames[0];
    logger.info(`Processing sheet: ${sheetName}`);
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '',
      raw: false
    });
    
    if (jsonData.length === 0) {
      throw new Error('No data found in Excel file');
    }
    
    logger.info(`Found ${jsonData.length} rows in Excel file`);
    
    // Normalize and process data
    const normalizedData = jsonData.map((row, index) => {
      const normalized = {};
      
      Object.keys(row).forEach(key => {
        const normalizedKey = normalizeColumnName(key);
        let value = row[key];
        
        // Handle date fields
        if (normalizedKey === 'order_date') {
          value = parseDate(value);
        }
        
        // Handle numeric fields
        if (normalizedKey === 'order_value' || normalizedKey === 'quantity') {
          value = parseNumber(value);
        }
        
        // Handle string fields - trim whitespace
        if (typeof value === 'string') {
          value = value.trim();
          if (value === '') value = null;
        }
        
        normalized[normalizedKey] = value;
      });
      
      return normalized;
    });
    
    // Clear existing data if requested
    if (clearExisting) {
      logger.warn('⚠️ Clearing existing orders from database...');
      const clearResult = await Order.clearAll();
      logger.info(`✅ Cleared ${clearResult.deleted || 0} existing orders from database`);
    }
    
    // Optimize: Disable indexes temporarily for faster bulk insert (if large dataset)
    const isLargeDataset = normalizedData.length > 10000;
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();
    
    try {
      if (isLargeDataset) {
        logger.info('📊 Large dataset detected - temporarily disabling indexes for faster import...');
        await connection.query('ALTER TABLE orders DISABLE KEYS');
      }
      
      // Insert data in batches with optimized batch size
      logger.info(`Inserting ${normalizedData.length} orders in batches of ${batchSize}...`);
      let totalInserted = 0;
      let totalErrors = 0;
      const totalBatches = Math.ceil(normalizedData.length / batchSize);
      
      for (let i = 0; i < normalizedData.length; i += batchSize) {
        const batch = normalizedData.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        
        try {
          // Use connection for batch insert to maintain transaction
          const result = await Order.bulkCreate(batch, connection);
          totalInserted += result.inserted;
          
          // Log progress every 10 batches or on last batch
          if (batchNumber % 10 === 0 || batchNumber === totalBatches) {
            const progress = ((batchNumber / totalBatches) * 100).toFixed(1);
            logger.info(`Batch ${batchNumber}/${totalBatches} (${progress}%): Inserted ${result.inserted} orders | Total: ${totalInserted}`);
          }
        } catch (error) {
          logger.error(`Error inserting batch ${batchNumber}:`, error.message);
          totalErrors += batch.length;
          // Continue with next batch instead of failing completely
        }
      }
      
      // Re-enable indexes and rebuild them
      if (isLargeDataset) {
        logger.info('🔧 Re-enabling and rebuilding indexes...');
        await connection.query('ALTER TABLE orders ENABLE KEYS');
      }
      
      logger.info(`Import completed: ${totalInserted} orders inserted, ${totalErrors} errors`);
      
      return {
        success: true,
        totalRows: jsonData.length,
        inserted: totalInserted,
        errors: totalErrors
      };
    } finally {
      connection.release();
    }
    
  } catch (error) {
    logger.error('Error importing Excel file:', error);
    throw error;
  }
};

module.exports = {
  importExcelFile,
  normalizeColumnName,
  parseDate,
  parseNumber
};

