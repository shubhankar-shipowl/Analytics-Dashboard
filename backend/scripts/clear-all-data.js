require('dotenv').config();
const Order = require('../models/Order');
const logger = require('../utils/logger');
const { query } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function clearAllData() {
  try {
    console.log('🗑️  Starting data cleanup...\n');

    // 1. Delete all orders
    console.log('📊 Deleting all orders from database...');
    const result = await Order.clearAll();
    console.log(`✅ Deleted ${result.deleted || 0} orders from database\n`);

    // 2. Clear import logs (optional - uncomment if needed)
    // console.log('📋 Clearing import logs...');
    // await query('DELETE FROM import_logs');
    // console.log('✅ Import logs cleared\n');

    // 3. Clear backend uploads folder
    console.log('📁 Clearing backend uploads folder...');
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      let deletedCount = 0;
      files.forEach(file => {
        if (file !== '.gitkeep') {
          try {
            fs.unlinkSync(path.join(uploadsDir, file));
            deletedCount++;
          } catch (err) {
            console.log(`  ⚠️  Could not delete ${file}: ${err.message}`);
          }
        }
      });
      console.log(`✅ Cleared ${deletedCount} files from uploads folder\n`);
    } else {
      console.log('✅ Uploads folder does not exist\n');
    }

    // 4. Clear backend logs (optional)
    console.log('📝 Clearing backend log files...');
    const logsDir = path.join(__dirname, '..', 'logs');
    if (fs.existsSync(logsDir)) {
      const files = fs.readdirSync(logsDir).filter(f => f.endsWith('.log'));
      let deletedCount = 0;
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(logsDir, file));
          deletedCount++;
        } catch (err) {
          console.log(`  ⚠️  Could not delete ${file}: ${err.message}`);
        }
      });
      console.log(`✅ Cleared ${deletedCount} log files\n`);
    } else {
      console.log('✅ Logs folder does not exist\n');
    }

    console.log('✅ All data and cache cleared successfully!');
    console.log('\n📊 Database Status:');
    const countResult = await query('SELECT COUNT(*) as count FROM orders');
    const count = countResult && countResult.length > 0 ? countResult[0].count : 0;
    console.log(`   Orders in database: ${count}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    logger.error('Error in clear-all-data script:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  clearAllData();
}

module.exports = { clearAllData };

