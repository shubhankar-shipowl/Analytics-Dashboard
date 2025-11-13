const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Order = require('../models/Order');
const logger = require('./logger');

// Normalize column names to match database schema (all 34 Excel columns)
const normalizeColumnName = (colName) => {
  if (!colName) return colName;
  const lower = colName.toLowerCase().trim();
  
  // Exact matches first (from Excel file analysis)
  if (lower === 'order account') return 'order_account';
  if (lower === 'orderid') return 'order_id';
  if (lower === 'channel order number') return 'channel_order_number';
  if (lower === 'channel order date') return 'channel_order_date';
  if (lower === 'waybill number') return 'waybill_number';
  if (lower === 'pre generated waybill') return 'pre_generated_waybill';
  if (lower === 'order date') return 'order_date';
  if (lower === 'ref./invoice #' || lower === 'ref/invoice #' || lower === 'ref invoice #') return 'ref_invoice_number';
  if (lower === 'mode') return 'payment_method';
  if (lower === 'express') return 'express';
  if (lower === 'pickup warehouse') return 'pickup_warehouse';
  if (lower === 'consignee name') return 'consignee_name';
  if (lower === 'consignee contact') return 'consignee_contact';
  if (lower === 'alternate number') return 'alternate_number';
  if (lower === 'address') return 'address';
  if (lower === 'city') return 'city';
  if (lower === 'state') return 'state';
  if (lower === 'pincode') return 'pincode';
  if (lower === 'product name') return 'product_name';
  if (lower === 'product qty') return 'quantity';
  if (lower === 'product value') return 'product_value';
  if (lower === 'sku') return 'sku';
  if (lower === 'order amount') return 'order_value';
  if (lower === 'extra charges') return 'extra_charges';
  if (lower === 'total amount') return 'total_amount';
  if (lower === 'cod amount') return 'cod_amount';
  if (lower === 'dimensions') return 'dimensions';
  if (lower === 'weight') return 'weight';
  if (lower === 'fulfilled by') return 'fulfillment_partner';
  if (lower === 'status') return 'order_status';
  if (lower === 'added on') return 'added_on';
  if (lower === 'delivered date') return 'delivered_date';
  if (lower === 'rts date') return 'rts_date';
  if (lower === 'client order id') return 'client_order_id';
  
  // Fallback variations for compatibility
  if (lower === 'order id' || lower === 'orderid') return 'order_id';
  if ((lower.includes('order') && lower.includes('id')) && !lower.includes('client') && !lower.includes('channel')) {
    return 'order_id';
  }
  
  // Date variations
  if (lower.includes('channel order date')) return 'channel_order_date';
  if (lower.includes('delivered date') || lower === 'delivered date') return 'delivered_date';
  if (lower.includes('rts date') || lower === 'rts date') return 'rts_date';
  if (lower.includes('added on') || lower === 'added on') return 'added_on';
  if (lower.includes('order date') && !lower.includes('channel')) return 'order_date';
  
  // Amount variations
  if (lower.includes('order amount') && !lower.includes('cod') && !lower.includes('total')) return 'order_value';
  if (lower.includes('product value')) return 'product_value';
  if (lower.includes('total amount') && !lower.includes('cod')) return 'total_amount';
  if (lower.includes('cod amount')) return 'cod_amount';
  if (lower.includes('extra charges')) return 'extra_charges';
  
  // Status variations
  if (lower === 'status' || lower.includes('order status')) return 'order_status';
  
  // Payment method
  if (lower === 'mode' || lower.includes('payment method')) return 'payment_method';
  
  // Location variations
  if (lower === 'city' || lower.includes('ship city')) return 'city';
  if (lower === 'state') return 'state';
  if (lower === 'pincode' || lower === 'pin code') return 'pincode';
  if (lower.includes('pin') || lower.includes('zip') || lower.includes('postal')) return 'pincode';
  
  // Product variations
  if (lower === 'product name' || (lower.includes('product') && lower.includes('name') && !lower.includes('qty'))) {
    return 'product_name';
  }
  if (lower === 'product qty' || lower === 'product quantity') return 'quantity';
  if (lower.includes('quantity') || lower.includes('qty')) return 'quantity';
  
  // SKU
  if (lower === 'sku') return 'sku';
  
  // Fulfillment
  if (lower === 'fulfilled by' || lower.includes('fulfilled by')) return 'fulfillment_partner';
  if (lower.includes('fulfillment') || lower.includes('partner')) return 'fulfillment_partner';
  
  // Other fields
  if (lower.includes('waybill number')) return 'waybill_number';
  if (lower.includes('channel order number')) return 'channel_order_number';
  if (lower.includes('client order id')) return 'client_order_id';
  if (lower.includes('consignee name')) return 'consignee_name';
  if (lower.includes('consignee contact')) return 'consignee_contact';
  if (lower.includes('pickup warehouse')) return 'pickup_warehouse';
  if (lower.includes('ref') && lower.includes('invoice')) return 'ref_invoice_number';
  
  // Return original if no match (will be stored as-is or ignored)
  return colName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
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
        
        // Handle date/datetime fields
        if (normalizedKey === 'order_date' || 
            normalizedKey === 'channel_order_date' || 
            normalizedKey === 'added_on' || 
            normalizedKey === 'delivered_date' || 
            normalizedKey === 'rts_date') {
          value = parseDate(value);
        }
        
        // Handle numeric fields
        if (normalizedKey === 'order_value' || 
            normalizedKey === 'quantity' || 
            normalizedKey === 'product_value' ||
            normalizedKey === 'extra_charges' ||
            normalizedKey === 'total_amount' ||
            normalizedKey === 'cod_amount' ||
            normalizedKey === 'weight') {
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


