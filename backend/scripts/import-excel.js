#!/usr/bin/env node

/**
 * Script to import Excel file directly into the database
 * Usage: node backend/scripts/import-excel.js [--clear] [--file path/to/file.xlsx]
 */

const path = require('path');
const fs = require('fs');
const { importExcelFile } = require('../utils/excelImporter');
const logger = require('../utils/logger');
const { testConnection } = require('../config/database');

// Parse command line arguments
const args = process.argv.slice(2);
const clearExisting = args.includes('--clear') || args.includes('-c');
const fileArg = args.find(arg => arg.startsWith('--file=')) || args.find(arg => arg.startsWith('-f='));
const filePath = fileArg ? fileArg.split('=')[1] : null;

// Default file path
const defaultFilePath = path.join(__dirname, '../../public/data/ForwardOrders-1762582722-21819 (1).xlsx');
const rootFilePath = path.join(__dirname, '../../ForwardOrders-1762582722-21819 (1).xlsx');

async function main() {
  try {
    console.log('🚀 Starting Excel Import Script...\n');

    // Test database connection
    console.log('📡 Testing database connection...');
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ Database connection failed. Please check your database configuration.');
      process.exit(1);
    }
    console.log('✅ Database connected successfully\n');

    // Determine file path
    let excelFilePath = filePath;
    if (!excelFilePath) {
      // Try default locations
      if (fs.existsSync(defaultFilePath)) {
        excelFilePath = defaultFilePath;
      } else if (fs.existsSync(rootFilePath)) {
        excelFilePath = rootFilePath;
      } else {
        console.error('❌ Excel file not found. Please specify the file path:');
        console.error('   Usage: node backend/scripts/import-excel.js --file=path/to/file.xlsx');
        console.error(`   Or place the file at: ${defaultFilePath}`);
        process.exit(1);
      }
    }

    // Check if file exists
    if (!fs.existsSync(excelFilePath)) {
      console.error(`❌ File not found: ${excelFilePath}`);
      process.exit(1);
    }

    console.log(`📂 Excel file: ${excelFilePath}`);
    console.log(`🗑️  Clear existing data: ${clearExisting ? 'Yes' : 'No'}`);
    console.log('');

    // Import the file
    const result = await importExcelFile(excelFilePath, {
      clearExisting: clearExisting,
      batchSize: 1000
    });

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Total rows processed: ${result.totalRows.toLocaleString()}`);
    console.log(`✅ Successfully inserted: ${result.inserted.toLocaleString()}`);
    console.log(`❌ Errors: ${result.errors.toLocaleString()}`);
    console.log('='.repeat(60));

    if (result.errors > 0) {
      console.log('\n⚠️  Some rows failed to import. Check the logs for details.');
      process.exit(1);
    } else {
      console.log('\n🎉 Import completed successfully!');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ Import failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();

