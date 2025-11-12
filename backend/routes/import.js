const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { importExcelFile } = require('../utils/excelImporter');
const logger = require('../utils/logger');
const { query } = require('../config/database');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'import-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

/**
 * @swagger
 * /import/excel:
 *   post:
 *     summary: Import orders from Excel file
 *     tags: [Import]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Excel file (.xlsx, .xls, .csv)
 *               clearExisting:
 *                 type: string
 *                 description: Clear existing data before import (true/false)
 *                 example: "false"
 *     responses:
 *       200:
 *         description: Import completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     inserted:
 *                       type: integer
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *       400:
 *         description: Bad request (no file or invalid file)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/excel', upload.single('file'), async (req, res) => {
  const startTime = Date.now();
  let importLogId = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Get clearExisting from body (can be string "true"/"false" or boolean)
    let clearExisting = false;
    if (req.body.clearExisting !== undefined) {
      clearExisting = req.body.clearExisting === 'true' || req.body.clearExisting === true || req.body.clearExisting === '1';
    }
    const filePath = req.file.path;
    const fileName = req.file.originalname;

    logger.info(`Import request received for file: ${fileName}`);

    // Log import start (only if table exists)
    try {
      const logResult = await query(
        'INSERT INTO import_logs (file_name, file_path, started_at) VALUES (?, ?, NOW())',
        [fileName, filePath]
      );
      importLogId = logResult && logResult.insertId ? logResult.insertId : null;
    } catch (logError) {
      // If import_logs table doesn't exist, continue without logging
      if (logError.code !== 'ER_NO_SUCH_TABLE') {
        logger.warn('Could not log import start:', logError.message);
      }
      importLogId = null;
    }

    // Import the file with optimized batch size
    const result = await importExcelFile(filePath, {
      clearExisting: clearExisting === 'true' || clearExisting === true,
      batchSize: 5000 // Optimized: Increased from 1000 to 5000 for better performance
    });

    const duration = Date.now() - startTime;

    // Update import log (only if table exists and we have logId)
    if (importLogId) {
      try {
        await query(
          `UPDATE import_logs 
           SET total_rows = ?, inserted_rows = ?, error_rows = ?, 
               status = ?, completed_at = NOW() 
           WHERE id = ?`,
          [
            result.totalRows,
            result.inserted,
            result.errors,
            result.errors > 0 ? 'partial' : 'success',
            importLogId
          ]
        );
      } catch (logError) {
        // Non-critical - just log the warning
        if (logError.code !== 'ER_NO_SUCH_TABLE') {
          logger.warn('Could not update import log:', logError.message);
        }
      }
    }

    logger.info(`Import completed in ${duration}ms: ${result.inserted} orders inserted`);

    res.json({
      success: true,
      message: 'File imported successfully',
      data: {
        totalRows: result.totalRows,
        inserted: result.inserted,
        errors: result.errors,
        duration: duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Import error:', error);

    // Update import log with error (only if table exists)
    if (importLogId) {
      try {
        await query(
          `UPDATE import_logs 
           SET status = 'failed', error_message = ?, completed_at = NOW() 
           WHERE id = ?`,
          [error.message, importLogId]
        );
      } catch (logError) {
        // Non-critical
        if (logError.code !== 'ER_NO_SUCH_TABLE') {
          logger.warn('Could not update import log with error:', logError.message);
        }
      }
    }

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Import failed'
    });
  }
});

// Get import history
router.get('/history', async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    
    const sql = `
      SELECT * FROM import_logs 
      ORDER BY started_at DESC 
      LIMIT ? OFFSET ?
    `;
    
    const logs = await query(sql, [parseInt(limit), parseInt(offset)]);
    
    const countResult = await query('SELECT COUNT(*) as total FROM import_logs');
    const total = countResult && countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    logger.error('Error fetching import history:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get import log by ID
router.get('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    try {
      const sql = 'SELECT * FROM import_logs WHERE id = ?';
      const logs = await query(sql, [id]);
      const log = logs && logs.length > 0 ? logs[0] : null;

      if (!log) {
        return res.status(404).json({
          success: false,
          error: 'Import log not found'
        });
      }

      res.json({
        success: true,
        data: log
      });
    } catch (tableError) {
      if (tableError.code === 'ER_NO_SUCH_TABLE') {
        return res.status(404).json({
          success: false,
          error: 'Import log table does not exist'
        });
      }
      throw tableError;
    }
  } catch (error) {
    logger.error('Error fetching import log:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /import/clear:
 *   delete:
 *     summary: Delete all orders from the database
 *     tags: [Import]
 *     description: WARNING - This will permanently delete ALL orders from the database. This action cannot be undone.
 *     responses:
 *       200:
 *         description: All orders deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     deleted:
 *                       type: integer
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/clear', async (req, res) => {
  try {
    const Order = require('../models/Order');
    
    logger.warn('⚠️ DELETE ALL ORDERS request received');
    
    const result = await Order.clearAll();
    
    logger.warn(`✅ All orders deleted. Total deleted: ${result.deleted || 0}`);
    
    res.json({
      success: true,
      message: `All orders deleted successfully. ${result.deleted || 0} orders were removed.`,
      data: result
    });
  } catch (error) {
    logger.error('Error deleting all orders:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete orders'
    });
  }
});

module.exports = router;

