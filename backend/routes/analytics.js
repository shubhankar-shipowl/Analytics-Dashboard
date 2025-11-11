const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Analytics API Routes
 * 
 * NOTE: All endpoints query the MySQL database ONLY.
 * This backend does NOT read from Excel files for serving data.
 * All analytics are calculated from database queries.
 */

/**
 * @swagger
 * /analytics/kpis:
 *   get:
 *     summary: Get Key Performance Indicators (KPIs)
 *     tags: [Analytics]
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/product'
 *       - $ref: '#/components/parameters/pincode'
 *     responses:
 *       200:
 *         description: KPI data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/KPIs'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/kpis', async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      // Handle multiple products (comma-separated)
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    // Total Orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-I + RTO-II + RTO-Dispatched + RTO Pending + Lost + Delivered
    const totalOrdersSql = `
      SELECT COUNT(*) as total 
      FROM orders 
      ${whereClause} 
      AND (
        LOWER(TRIM(order_status)) = 'rts' OR
        LOWER(TRIM(order_status)) = 'rto' OR
        LOWER(TRIM(order_status)) = 'delivered' OR
        LOWER(TRIM(order_status)) = 'lost' OR
        LOWER(TRIM(order_status)) = 'ndr' OR
        LOWER(TRIM(order_status)) = 'dispatched' OR
        LOWER(TRIM(order_status)) LIKE '%rto-it%' OR
        LOWER(TRIM(order_status)) LIKE '%rto it%' OR
        (LOWER(TRIM(order_status)) LIKE '%rto-i%' AND LOWER(TRIM(order_status)) NOT LIKE '%rto-it%') OR
        LOWER(TRIM(order_status)) LIKE '%rto-ii%' OR
        LOWER(TRIM(order_status)) LIKE '%rto ii%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto pending%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-pending%'
      )
    `;
    const totalOrdersResult = await query(totalOrdersSql, params);
    const totalOrders = totalOrdersResult && totalOrdersResult.length > 0 ? totalOrdersResult[0].total : 0;
    
    logger.debug(`KPI Calculation - Total Orders: ${totalOrders}, Filters: ${JSON.stringify({ startDate, endDate, product, pincode })}`);

    // Total Revenue (only from valid order statuses)
    const revenueSql = `
      SELECT SUM(order_value) as total 
      FROM orders 
      ${whereClause} 
      AND order_value IS NOT NULL 
      AND (
        LOWER(TRIM(order_status)) = 'rts' OR
        LOWER(TRIM(order_status)) = 'rto' OR
        LOWER(TRIM(order_status)) = 'delivered' OR
        LOWER(TRIM(order_status)) = 'lost' OR
        LOWER(TRIM(order_status)) = 'ndr' OR
        LOWER(TRIM(order_status)) = 'dispatched' OR
        LOWER(TRIM(order_status)) LIKE '%rto-it%' OR
        LOWER(TRIM(order_status)) LIKE '%rto it%' OR
        (LOWER(TRIM(order_status)) LIKE '%rto-i%' AND LOWER(TRIM(order_status)) NOT LIKE '%rto-it%') OR
        LOWER(TRIM(order_status)) LIKE '%rto-ii%' OR
        LOWER(TRIM(order_status)) LIKE '%rto ii%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto pending%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-pending%'
      )
    `;
    const revenueResult = await query(revenueSql, params);
    const totalRevenue = revenueResult && revenueResult.length > 0 ? (revenueResult[0].total || 0) : 0;
    
    logger.debug(`KPI Calculation - Total Revenue: ${totalRevenue}`);

    // Average Order Value
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    // Total COD
    const codSql = `SELECT SUM(order_value) as total FROM orders ${whereClause} AND payment_method = 'COD' AND order_value IS NOT NULL`;
    const codResult = await query(codSql, params);
    const totalCOD = codResult && codResult.length > 0 ? (codResult[0].total || 0) : 0;

    // Total RTO - count all orders with RTO in status (case-insensitive)
    const rtoSql = `SELECT COUNT(*) as total FROM orders ${whereClause} AND (LOWER(TRIM(order_status)) LIKE '%rto%' OR LOWER(TRIM(order_status)) LIKE '%return%')`;
    const rtoResult = await query(rtoSql, params);
    const totalRTO = rtoResult && rtoResult.length > 0 ? rtoResult[0].total : 0;

    // Total RTS - only exact "RTS" status (case-insensitive)
    const rtsSql = `SELECT COUNT(*) as total FROM orders ${whereClause} AND LOWER(TRIM(order_status)) = 'rts'`;
    const rtsResult = await query(rtsSql, params);
    const totalRTS = rtsResult && rtsResult.length > 0 ? rtsResult[0].total : 0;

    // Get Top Pincode by Number of Delivered Orders
    // Total orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-Dispatched + RTO Pending + Lost + Delivered
    // Delivered = orders with status exactly 'delivered' (case-insensitive)
    const topPincodeSql = `
      SELECT 
        pincode,
        COUNT(*) as totalOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END) as deliveredCount,
        (SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END) / COUNT(*)) * 100 as deliveryRatio
      FROM orders 
      ${whereClause}
      AND pincode IS NOT NULL
      AND (
        LOWER(TRIM(order_status)) = 'rts' OR
        LOWER(TRIM(order_status)) = 'rto' OR
        LOWER(TRIM(order_status)) = 'delivered' OR
        LOWER(TRIM(order_status)) = 'lost' OR
        LOWER(TRIM(order_status)) = 'ndr' OR
        LOWER(TRIM(order_status)) = 'dispatched' OR
        LOWER(TRIM(order_status)) LIKE '%rto-it%' OR
        LOWER(TRIM(order_status)) LIKE '%rto it%' OR
        (LOWER(TRIM(order_status)) LIKE '%rto-i%' AND LOWER(TRIM(order_status)) NOT LIKE '%rto-it%') OR
        LOWER(TRIM(order_status)) LIKE '%rto-ii%' OR
        LOWER(TRIM(order_status)) LIKE '%rto ii%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto pending%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-pending%'
      )
      GROUP BY pincode
      HAVING COUNT(*) > 0
      ORDER BY deliveredCount DESC, totalOrders DESC
      LIMIT 1
    `;
    const topPincodeResult = await query(topPincodeSql, params);
    const topPincode = topPincodeResult && topPincodeResult.length > 0 
      ? topPincodeResult[0].pincode 
      : 'N/A';
    const topPincodeDeliveredCount = topPincodeResult && topPincodeResult.length > 0
      ? (topPincodeResult[0].deliveredCount || 0)
      : 0;
    const topPincodeRatio = topPincodeResult && topPincodeResult.length > 0
      ? parseFloat((topPincodeResult[0].deliveryRatio || 0).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        averageOrderValue: parseFloat(avgOrderValue.toFixed(2)),
        topPincode,
        topPincodeRatio,
        topPincodeDeliveredCount,
        totalRTO,
        totalRTS
      }
    });
  } catch (error) {
    logger.error('Error fetching KPIs:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

/**
 * @swagger
 * /analytics/order-status:
 *   get:
 *     summary: Get order status distribution
 *     tags: [Analytics]
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/product'
 *       - $ref: '#/components/parameters/pincode'
 *     responses:
 *       200:
 *         description: Order status distribution data
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
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       percentage:
 *                         type: number
 *       500:
 *         description: Server error
 */
// Get order status distribution
router.get('/order-status', async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      // Handle multiple products (comma-separated)
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    const sql = `
      SELECT 
        order_status as status,
        COUNT(*) as count
      FROM orders 
      ${whereClause}
      GROUP BY order_status
      ORDER BY count DESC
    `;

    const results = await query(sql, params);
    
    // Calculate total and percentages
    const total = results && Array.isArray(results) ? results.reduce((sum, item) => sum + (item.count || 0), 0) : 0;
    const data = results && Array.isArray(results) ? results.map(item => ({
      status: item.status || 'Unknown',
      count: item.count || 0,
      percentage: total > 0 ? parseFloat(((item.count / total) * 100).toFixed(2)) : 0
    })) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching order status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get payment method distribution
router.get('/payment-methods', async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    const sql = `
      SELECT 
        payment_method as method,
        COUNT(*) as count
      FROM orders 
      ${whereClause}
      GROUP BY payment_method
      ORDER BY count DESC
    `;

    const results = await query(sql, params);
    
    const total = results && Array.isArray(results) ? results.reduce((sum, item) => sum + (item.count || 0), 0) : 0;
    const data = results && Array.isArray(results) ? results.map(item => ({
      method: item.method || 'Unknown',
      count: item.count || 0,
      percentage: total > 0 ? parseFloat(((item.count / total) * 100).toFixed(2)) : 0
    })) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching payment methods:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get fulfillment partner analysis
router.get('/fulfillment-partners', async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    const sql = `
      SELECT 
        fulfillment_partner as partner,
        COUNT(*) as orders,
        SUM(order_value) as revenue
      FROM orders 
      ${whereClause}
      AND fulfillment_partner IS NOT NULL
      GROUP BY fulfillment_partner
      ORDER BY orders DESC
    `;

    const results = await query(sql, params);
    
    const data = results && Array.isArray(results) ? results.map(item => ({
      partner: item.partner || 'Unknown',
      orders: item.orders || 0,
      revenue: parseFloat((item.revenue || 0).toFixed(2))
    })) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching fulfillment partners:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get top products
router.get('/top-products', async (req, res) => {
  try {
    const { startDate, endDate, pincode, by = 'orders', limit = 10 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    const orderBy = by === 'revenue' 
      ? 'ORDER BY revenue DESC' 
      : 'ORDER BY orders DESC';

    const sql = `
      SELECT 
        product_name as product,
        COUNT(*) as orders,
        SUM(order_value) as revenue
      FROM orders 
      ${whereClause}
      AND product_name IS NOT NULL
      GROUP BY product_name
      ${orderBy}
      LIMIT ?
    `;

    params.push(parseInt(limit));
    const results = await query(sql, params);

    const data = results && Array.isArray(results) ? results.map(item => ({
      product: item.product || 'Unknown',
      orders: item.orders || 0,
      revenue: parseFloat((item.revenue || 0).toFixed(2))
    })) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching top products:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get top cities
router.get('/top-cities', async (req, res) => {
  try {
    const { startDate, endDate, by = 'orders', limit = 10, sort = 'top' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }

    // Determine sort direction: 'top' = DESC, 'bottom' = ASC
    const sortDirection = sort === 'bottom' ? 'ASC' : 'DESC';
    const orderBy = by === 'revenue' 
      ? `ORDER BY revenue ${sortDirection}` 
      : `ORDER BY orders ${sortDirection}`;

    const sql = `
      SELECT 
        city,
        COUNT(*) as orders,
        SUM(order_value) as revenue
      FROM orders 
      ${whereClause}
      AND city IS NOT NULL
      GROUP BY city
      ${orderBy}
      LIMIT ?
    `;

    params.push(parseInt(limit));
    const results = await query(sql, params);

    const data = results && Array.isArray(results) ? results.map(item => ({
      city: item.city || 'Unknown',
      orders: item.orders || 0,
      revenue: parseFloat((item.revenue || 0).toFixed(2))
    })) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching top cities:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get daily trends
router.get('/trends', async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode, view = 'orders' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    const selectField = view === 'revenue' 
      ? 'SUM(order_value) as value' 
      : 'COUNT(*) as value';

    const sql = `
      SELECT 
        DATE(order_date) as date,
        ${selectField}
      FROM orders 
      ${whereClause}
      GROUP BY DATE(order_date)
      ORDER BY date ASC
    `;

    const results = await query(sql, params);

    const data = results && Array.isArray(results) ? results.map(item => ({
      date: item.date || null,
      value: parseFloat((item.value || 0).toFixed(2))
    })) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching trends:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get delivery ratio by fulfillment partner
/**
 * @swagger
 * /analytics/delivery-ratio:
 *   get:
 *     summary: Get delivery ratio by fulfillment partner
 *     tags: [Analytics]
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/product'
 *       - $ref: '#/components/parameters/pincode'
 *     responses:
 *       200:
 *         description: Delivery ratio data by partner
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
 *                     type: object
 *                     properties:
 *                       partner:
 *                         type: string
 *                       totalOrders:
 *                         type: integer
 *                       deliveredCount:
 *                         type: integer
 *                       ratio:
 *                         type: number
 *       500:
 *         description: Server error
 */
router.get('/delivery-ratio', async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    // Total orders for delivery ratio = booked + delivered + dispatched + in transit + lost + manifested + ndr + picked + pickup pending + rto + rto-dispatched + rto-it + rto-pending + rts
    // Delivery ratio = delivered / total orders
    // Delivered = orders with status exactly 'delivered' (case-insensitive)
    const sql = `
      SELECT 
        fulfillment_partner as partner,
        COUNT(*) as totalOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END) as deliveredCount
      FROM orders 
      ${whereClause}
      AND fulfillment_partner IS NOT NULL
      AND (
        LOWER(TRIM(order_status)) = 'booked' OR
        LOWER(TRIM(order_status)) = 'delivered' OR
        LOWER(TRIM(order_status)) = 'dispatched' OR
        LOWER(TRIM(order_status)) LIKE '%in transit%' OR
        LOWER(TRIM(order_status)) LIKE '%in-transit%' OR
        LOWER(TRIM(order_status)) = 'intransit' OR
        LOWER(TRIM(order_status)) = 'lost' OR
        LOWER(TRIM(order_status)) = 'manifested' OR
        LOWER(TRIM(order_status)) = 'ndr' OR
        LOWER(TRIM(order_status)) = 'picked' OR
        LOWER(TRIM(order_status)) LIKE '%pickup pending%' OR
        LOWER(TRIM(order_status)) LIKE '%pickup-pending%' OR
        LOWER(TRIM(order_status)) = 'pickuppending' OR
        LOWER(TRIM(order_status)) = 'rto' OR
        LOWER(TRIM(order_status)) LIKE '%rto-dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-it%' OR
        LOWER(TRIM(order_status)) LIKE '%rto it%' OR
        LOWER(TRIM(order_status)) LIKE '%rto pending%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-pending%' OR
        LOWER(TRIM(order_status)) = 'rts'
      )
      GROUP BY fulfillment_partner
    `;

    const results = await query(sql, params);
    
    // Debug logging
    logger.debug(`Delivery ratio query - whereClause: ${whereClause}, params: ${JSON.stringify(params)}`);
    logger.debug(`Delivery ratio query results: ${results ? results.length : 0} partners found`);

    const data = results && Array.isArray(results) ? results.map(item => {
      const totalOrders = item.totalOrders || 0;
      const deliveredCount = item.deliveredCount || 0;
      const ratio = totalOrders > 0 
        ? parseFloat(((deliveredCount / totalOrders) * 100).toFixed(2))
        : 0;
      
      // Debug logging for each partner
      if (totalOrders > 0) {
        logger.debug(`Partner: ${item.partner}, Total: ${totalOrders}, Delivered: ${deliveredCount}, Ratio: ${ratio}%`);
      }
      
      return {
        partner: item.partner || 'Unknown',
        totalOrders: totalOrders,
        deliveredCount: deliveredCount,
        ratio,
        ratioValue: ratio
      };
    }) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching delivery ratio:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get Good and Bad Pincodes by Product
// Good Pincode: delivery ratio > 60%
// Bad Pincode: delivery ratio < 20%
/**
 * @swagger
 * /analytics/good-bad-pincodes:
 *   get:
 *     summary: Get good and bad pincodes by product (delivery ratio > 60% = good, < 20% = bad)
 *     tags: [Analytics]
 *     parameters:
 *       - $ref: '#/components/parameters/startDate'
 *       - $ref: '#/components/parameters/endDate'
 *       - $ref: '#/components/parameters/product'
 *     responses:
 *       200:
 *         description: Good and bad pincodes data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     good:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                           pincode:
 *                             type: string
 *                           totalOrders:
 *                             type: integer
 *                           deliveredCount:
 *                             type: integer
 *                           ratio:
 *                             type: number
 *                     bad:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                           pincode:
 *                             type: string
 *                           totalOrders:
 *                             type: integer
 *                           deliveredCount:
 *                             type: integer
 *                           ratio:
 *                             type: number
 *       500:
 *         description: Server error
 */
router.get('/good-bad-pincodes', async (req, res) => {
  try {
    const { startDate, endDate, product, products } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }

    // Actual orders = booked + delivered + dispatched + in transit + lost + manifested + ndr + picked + pickup pending + rto + rto-dispatched + rto-it + rto-pending + rts
    // Delivery ratio = delivered / actual orders
    // Filter: Only include pincodes where actualOrders > (actualOrders + deliveredOrders) / 2
    // This simplifies to: actualOrders > deliveredOrders
    const sql = `
      SELECT 
        product_name as product,
        pincode,
        COUNT(*) as actualOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END) as deliveredCount,
        CASE 
          WHEN COUNT(*) > 0 
          THEN (SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END) * 100.0 / COUNT(*))
          ELSE 0
        END as ratio
      FROM orders 
      ${whereClause}
      AND pincode IS NOT NULL
      AND product_name IS NOT NULL
      AND (
        LOWER(TRIM(order_status)) = 'booked' OR
        LOWER(TRIM(order_status)) = 'delivered' OR
        LOWER(TRIM(order_status)) = 'dispatched' OR
        LOWER(TRIM(order_status)) LIKE '%in transit%' OR
        LOWER(TRIM(order_status)) LIKE '%in-transit%' OR
        LOWER(TRIM(order_status)) = 'intransit' OR
        LOWER(TRIM(order_status)) = 'lost' OR
        LOWER(TRIM(order_status)) = 'manifested' OR
        LOWER(TRIM(order_status)) = 'ndr' OR
        LOWER(TRIM(order_status)) = 'picked' OR
        LOWER(TRIM(order_status)) LIKE '%pickup pending%' OR
        LOWER(TRIM(order_status)) LIKE '%pickup-pending%' OR
        LOWER(TRIM(order_status)) = 'pickuppending' OR
        LOWER(TRIM(order_status)) = 'rto' OR
        LOWER(TRIM(order_status)) LIKE '%rto-dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto dispatched%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-it%' OR
        LOWER(TRIM(order_status)) LIKE '%rto it%' OR
        LOWER(TRIM(order_status)) LIKE '%rto pending%' OR
        LOWER(TRIM(order_status)) LIKE '%rto-pending%' OR
        LOWER(TRIM(order_status)) = 'rts'
      )
      GROUP BY product_name, pincode
      HAVING COUNT(*) > 0
        AND COUNT(*) > SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END)
    `;

    const results = await query(sql, params);

    const allPincodes = results && Array.isArray(results) ? results.map(item => ({
      product: item.product || 'Unknown',
      pincode: item.pincode || 'Unknown',
      totalOrders: item.actualOrders || 0, // Keep for backward compatibility
      actualOrders: item.actualOrders || 0,
      deliveredCount: item.deliveredCount || 0,
      ratio: parseFloat((item.ratio || 0).toFixed(2))
    })) : [];

    // Separate into good (> 60%) and bad (< 20%)
    const good = allPincodes
      .filter(item => item.ratio > 60)
      .sort((a, b) => b.ratio - a.ratio);

    const bad = allPincodes
      .filter(item => item.ratio < 20)
      .sort((a, b) => a.ratio - b.ratio);

    res.json({
      success: true,
      data: { good, bad }
    });
  } catch (error) {
    logger.error('Error fetching good/bad pincodes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Get Top 10 NDR by Pincode (by absolute NDR count)
router.get('/top-ndr-cities', async (req, res) => {
  try {
    const { startDate, endDate, product, products, limit = 10 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      whereClause += ' AND DATE(order_date) >= DATE(?)';
      params.push(startDate);
    }
    if (endDate) {
      whereClause += ' AND DATE(order_date) <= DATE(?)';
      params.push(endDate);
    }
    if (product) {
      whereClause += ' AND product_name LIKE ?';
      params.push(`%${product}%`);
    }
    if (products) {
      const productList = products.split(',').map(p => p.trim()).filter(p => p);
      if (productList.length > 0) {
        const placeholders = productList.map(() => '?').join(',');
        whereClause += ` AND product_name IN (${placeholders})`;
        params.push(...productList);
      }
    }
    // Note: pincode filter is removed as we're grouping by pincode

    // Get Top Pincodes by absolute NDR count
    const sql = `
      SELECT 
        pincode,
        COUNT(*) as totalOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'cancelled' OR LOWER(TRIM(order_status)) LIKE '%cancel%' THEN 1 ELSE 0 END) as cancelledOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'ndr' THEN 1 ELSE 0 END) as ndrCount,
        (
          COUNT(*) - 
          SUM(CASE WHEN LOWER(TRIM(order_status)) = 'cancelled' OR LOWER(TRIM(order_status)) LIKE '%cancel%' THEN 1 ELSE 0 END)
        ) as nonCancelledOrders,
        CASE 
          WHEN (
            COUNT(*) - 
            SUM(CASE WHEN LOWER(TRIM(order_status)) = 'cancelled' OR LOWER(TRIM(order_status)) LIKE '%cancel%' THEN 1 ELSE 0 END)
          ) > 0 
          THEN (
            SUM(CASE WHEN LOWER(TRIM(order_status)) = 'ndr' THEN 1 ELSE 0 END) * 100.0 / 
            (
              COUNT(*) - 
              SUM(CASE WHEN LOWER(TRIM(order_status)) = 'cancelled' OR LOWER(TRIM(order_status)) LIKE '%cancel%' THEN 1 ELSE 0 END)
            )
          )
          ELSE 0
        END as ndrRatio
      FROM orders 
      ${whereClause}
      AND pincode IS NOT NULL
      GROUP BY pincode
      HAVING SUM(CASE WHEN LOWER(TRIM(order_status)) = 'ndr' THEN 1 ELSE 0 END) > 0
      ORDER BY ndrCount DESC
      LIMIT ?
    `;

    params.push(parseInt(limit));
    const results = await query(sql, params);

    const data = results && Array.isArray(results) ? results.map(item => ({
      pincode: item.pincode || 'Unknown',
      totalOrders: item.totalOrders || 0,
      cancelledOrders: item.cancelledOrders || 0,
      ndrCount: item.ndrCount || 0,
      nonCancelledOrders: item.nonCancelledOrders || 0,
      ndrRatio: parseFloat((item.ndrRatio || 0).toFixed(2))
    })) : [];

    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Error fetching top NDR pincodes:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

module.exports = router;

