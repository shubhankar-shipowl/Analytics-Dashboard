const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const logger = require('../utils/logger');

/**
 * Orders API Routes
 * 
 * NOTE: All endpoints query the MySQL database ONLY.
 * This backend does NOT read from Excel files for serving data.
 * Excel files are only used for importing data INTO the database.
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     summary: Get all orders with optional filters
 *     tags: [Orders]
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/product'
 *       - $ref: '#/components/parameters/pincode'
 *       - name: status
 *         in: query
 *         description: Filter by order status
 *         required: false
 *         schema:
 *           type: string
 *       - name: order_id
 *         in: query
 *         description: Filter by order ID
 *         required: false
 *         schema:
 *           type: string
 *       - $ref: '#/components/parameters/limit'
 *       - $ref: '#/components/parameters/offset'
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     offset:
 *                       type: integer
 *                     hasMore:
 *                       type: boolean
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      product, 
      products, // Support multiple products
      pincode, 
      status,
      order_id,
      limit = 100,
      offset = 0 
    } = req.query;

    // Memory-safe limit for dashboard display
    // Dashboard uses analytics API for KPIs (aggregated queries), so orders endpoint is just for display
    // Increased to 100k for dashboard needs, but analytics endpoints handle all calculations
    const maxLimit = 100000; // 100,000 records max per request (for dashboard display)
    const safeLimit = Math.min(parseInt(limit) || 100, maxLimit);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);
    
    // Warn if limit is too high
    if (parseInt(limit) > maxLimit) {
      logger.warn(`⚠️ Requested limit ${limit} exceeds max ${maxLimit}. Using ${maxLimit} instead. Note: KPIs should use /api/analytics/kpis endpoint.`);
    }

    const filters = {};
    // CRITICAL: Check for allData/lifetime flag to bypass 90-day default
    if (req.query.allData === 'true' || req.query.lifetime === 'true') {
      filters.allData = true;
      logger.info('📅 Orders API - Lifetime filter: Will return ALL data (bypassing 90-day default)');
    }
    if (startDate) {
      filters.startDate = startDate;
      logger.info(`📅 Orders API - Received startDate filter: ${startDate}`);
    }
    if (endDate) {
      filters.endDate = endDate;
      logger.info(`📅 Orders API - Received endDate filter: ${endDate}`);
    }
    if (product) filters.product = product;
    if (products) filters.products = products; // Multiple products (comma-separated)
    if (pincode) filters.pincode = pincode;
    if (status) filters.status = status;
    if (order_id) filters.order_id = order_id;

    logger.info(`📊 Orders API - Fetching orders with filters:`, JSON.stringify(filters, null, 2));
    
    // Check memory before large queries
    const memUsage = process.memoryUsage();
    const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    if (memUsageMB > 3000) {
      logger.warn(`⚠️ High memory usage detected: ${memUsageMB}MB. Consider reducing limit.`);
    }
    
    const orders = await Order.find(filters, { limit: safeLimit, offset: safeOffset });
    const total = await Order.count(filters);

    // Log memory after query
    const memUsageAfter = process.memoryUsage();
    const memUsageAfterMB = Math.round(memUsageAfter.heapUsed / 1024 / 1024);
    logger.info(`📊 Fetched ${orders.length} orders. Memory: ${memUsageMB}MB -> ${memUsageAfterMB}MB`);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        limit: safeLimit,
        offset: safeOffset,
        hasMore: (safeOffset + safeLimit) < total
      }
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    
    // Handle memory errors specifically
    if (error.message && error.message.includes('heap') || error.message.includes('memory')) {
      logger.error('💥 Memory error detected. Consider reducing limit or using pagination.');
      return res.status(500).json({
        success: false,
        error: 'Memory limit exceeded. Please reduce the limit or use pagination with offset.',
        suggestion: 'Try using a smaller limit (max 50,000) or paginate with offset parameter.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /orders/products/unique:
 *   get:
 *     summary: Get all unique product names from the database
 *     tags: [Orders]
 *     description: Returns a list of all unique product names, useful for filter dropdowns
 *     responses:
 *       200:
 *         description: List of unique product names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/products/unique', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { pincode, startDate, endDate, allData, lifetime } = req.query;
    
    // Build WHERE clause with optional filters
    let whereClause = 'WHERE product_name IS NOT NULL AND product_name != \'\' AND TRIM(product_name) != \'\'';
    const params = [];
    
    // Filter by pincode if provided
    if (pincode && pincode !== 'All' && pincode.trim() !== '') {
      whereClause += ' AND pincode = ?';
      params.push(pincode.trim());
    }
    
    // Filter by date range if provided (for related filtering)
    if (startDate && startDate.trim() !== '') {
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate && endDate.trim() !== '') {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
    }
    
    // Get unique product names from the database
    // Using DISTINCT for better performance
    const sql = `
      SELECT DISTINCT product_name 
      FROM orders 
      ${whereClause}
      ORDER BY product_name ASC
    `;
    
    const results = await query(sql, params);
    
    // Extract product names from results
    const products = results.map(row => String(row.product_name).trim()).filter(p => p.length > 0);
    
    logger.info(`📦 Fetched ${products.length} unique products for filter dropdown${pincode ? ` (filtered by pincode: ${pincode})` : ''}`);
    
    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    logger.error('Error fetching unique products:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch unique products',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }
});

/**
 * @swagger
 * /orders/pincodes/unique:
 *   get:
 *     summary: Get all unique pincodes from the database
 *     tags: [Orders]
 *     description: Returns a list of all unique pincodes, useful for filter dropdowns
 *     responses:
 *       200:
 *         description: List of unique pincodes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/pincodes/unique', async (req, res) => {
  try {
    const { query } = require('../config/database');
    const { products, product, startDate, endDate, allData, lifetime } = req.query;
    
    // Build WHERE clause with optional filters
    let whereClause = 'WHERE pincode IS NOT NULL AND pincode != \'\' AND TRIM(pincode) != \'\'';
    const params = [];
    
    // Filter by product(s) if provided
    if (products && products.trim() !== '') {
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    } else if (product && product.trim() !== '') {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product.trim()}%`);
    }
    
    // Filter by date range if provided (for related filtering)
    if (startDate && startDate.trim() !== '') {
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate && endDate.trim() !== '') {
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
    }
    
    // Get all unique pincodes from the database
    // Using DISTINCT for better performance
    // Order by numeric value if possible, otherwise alphabetically
    const sql = `
      SELECT DISTINCT pincode 
      FROM orders 
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN pincode REGEXP '^[0-9]+$' THEN CAST(pincode AS UNSIGNED)
          ELSE 999999999
        END ASC,
        pincode ASC
    `;
    
    const results = await query(sql, params);
    
    // Extract pincodes from results
    const pincodes = results.map(row => String(row.pincode).trim()).filter(p => p.length > 0);
    
    logger.info(`📍 Fetched ${pincodes.length} unique pincodes for filter dropdown${products || product ? ` (filtered by product)` : ''}`);
    
    res.json({
      success: true,
      data: pincodes
    });
  } catch (error) {
    logger.error('Error fetching unique pincodes:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch unique pincodes',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      }
    });
  }
});

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: Get a single order by ID
 *     tags: [Orders]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Order not found
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
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    logger.error(`Error fetching order ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: Create a new order
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *           example:
 *             order_id: "ORD-12345"
 *             order_date: "2024-01-15"
 *             order_status: "delivered"
 *             product_name: "Sample Product"
 *             sku: "SKU-001"
 *             pincode: "110001"
 *             city: "New Delhi"
 *             order_value: 999.99
 *             payment_method: "COD"
 *             fulfillment_partner: "Ekart"
 *             quantity: 1
 *     responses:
 *       201:
 *         description: Order created successfully
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
 *                   $ref: '#/components/schemas/Order'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', async (req, res) => {
  try {
    const order = await Order.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /orders/{id}:
 *   put:
 *     summary: Update an existing order
 *     tags: [Orders]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       200:
 *         description: Order updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Order.update(id, req.body);

    res.json({
      success: true,
      message: 'Order updated successfully'
    });
  } catch (error) {
    logger.error(`Error updating order ${id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @swagger
 * /orders/{id}:
 *   delete:
 *     summary: Delete an order
 *     tags: [Orders]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: Order ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Order deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await Order.delete(id);

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting order ${id}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

