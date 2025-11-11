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

// Get KPIs (Key Performance Indicators)
router.get('/kpis', async (req, res) => {
  try {
    const { startDate, endDate, product, pincode } = req.query;

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

    // Average Order Value
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;

    // Total COD
    const codSql = `SELECT SUM(order_value) as total FROM orders ${whereClause} AND payment_method = 'COD' AND order_value IS NOT NULL`;
    const codResult = await query(codSql, params);
    const totalCOD = codResult && codResult.length > 0 ? (codResult[0].total || 0) : 0;

    // Total RTO
    const rtoSql = `SELECT COUNT(*) as total FROM orders ${whereClause} AND order_status LIKE '%RTO%'`;
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

// Get order status distribution
router.get('/order-status', async (req, res) => {
  try {
    const { startDate, endDate, product, pincode } = req.query;

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
    const { startDate, endDate, product, pincode } = req.query;

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
    const { startDate, endDate, product, pincode } = req.query;

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
    const { startDate, endDate, by = 'orders', limit = 10 } = req.query;

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

    const orderBy = by === 'revenue' 
      ? 'ORDER BY revenue DESC' 
      : 'ORDER BY orders DESC';

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
    const { startDate, endDate, product, pincode, view = 'orders' } = req.query;

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
router.get('/delivery-ratio', async (req, res) => {
  try {
    const { startDate, endDate, product, pincode } = req.query;

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
    if (pincode) {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    // Total orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-Dispatched + RTO Pending + Lost + Delivered
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

module.exports = router;

