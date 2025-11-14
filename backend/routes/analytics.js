const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const logger = require('../utils/logger');
const { cacheMiddleware } = require('../middleware/cache');

// Helper function to build optimized date filters (avoids DATE() function for better index usage)
const buildDateFilters = (whereClause, params, startDate, endDate) => {
  if (startDate) {
    whereClause += ' AND order_date >= ?';
    params.push(startDate);
  }
  if (endDate) {
    // Optimize: Use < next day for better index usage instead of DATE() function
    const nextDay = new Date(endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    whereClause += ' AND order_date < ?';
    params.push(nextDay.toISOString().split('T')[0]);
  }
  return { whereClause, params };
};

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
// KPIs endpoint - cache for 2 minutes (frequently accessed, but data changes)
router.get('/kpis', cacheMiddleware(120), async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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

    // Total Revenue = Sum of order_value column where status is 'delivered'
    // Revenue = order_value where order_status is delivered
    // Total Revenue = sum of all order_value from delivered orders
    const revenueSql = `
      SELECT SUM(order_value) as total 
      FROM orders 
      ${whereClause} 
      AND order_value IS NOT NULL 
      AND LOWER(TRIM(order_status)) = 'delivered'
    `;
    const revenueResult = await query(revenueSql, params);
    // Convert to number - MySQL SUM() on DECIMAL(12, 2) returns DECIMAL which might be a string
    // Ensure proper handling of DECIMAL type
    const totalRevenue = revenueResult && revenueResult.length > 0 
      ? parseFloat(revenueResult[0].total) || 0 
      : 0;
    
    // Also get count of delivered orders for verification
    const deliveredCountSql = `
      SELECT COUNT(*) as count 
      FROM orders 
      ${whereClause} 
      AND LOWER(TRIM(order_status)) = 'delivered'
    `;
    const deliveredCountResult = await query(deliveredCountSql, params);
    const deliveredCount = deliveredCountResult && deliveredCountResult.length > 0 ? deliveredCountResult[0].count : 0;
    
    logger.info(`KPI Calculation - Total Revenue (order_value): ₹${totalRevenue} from ${deliveredCount} delivered orders`);
    logger.debug(`KPI Calculation - Revenue SQL: ${revenueSql}, Params: ${JSON.stringify(params)}`);

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
      ? (() => {
          const ratioNum = parseFloat(topPincodeResult[0].deliveryRatio) || 0;
          return parseFloat(ratioNum.toFixed(2));
        })()
      : 0;

    // Ensure totalRevenue is a number before formatting
    const totalRevenueNum = parseFloat(totalRevenue) || 0;
    const avgOrderValueNum = parseFloat(avgOrderValue) || 0;
    
    res.json({
      success: true,
      data: {
        totalOrders,
        totalRevenue: parseFloat(totalRevenueNum.toFixed(2)),
        averageOrderValue: parseFloat(avgOrderValueNum.toFixed(2)),
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
// Order status - cache for 3 minutes
router.get('/order-status', cacheMiddleware(180), async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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
    // Ensure count is parsed as integer
    const total = results && Array.isArray(results) 
      ? results.reduce((sum, item) => {
          const count = parseInt(item.count || 0, 10);
          return sum + (isNaN(count) ? 0 : count);
        }, 0) 
      : 0;
    
    const data = results && Array.isArray(results) 
      ? results
          .filter(item => item && item.status && String(item.status).trim() !== '') // Filter out null/empty statuses
          .map(item => {
            const count = parseInt(item.count || 0, 10);
            const status = String(item.status || 'Unknown').trim();
            const percentage = total > 0 && !isNaN(count) 
              ? parseFloat(((count / total) * 100).toFixed(2)) 
              : 0;
            
            return {
              status: status,
              count: isNaN(count) ? 0 : count,
              percentage: percentage
            };
          })
          .filter(item => item.count > 0) // Only include statuses with count > 0
      : [];
    
    logger.info(`Order status distribution: Total=${total}, Statuses=${data.length}`);
    if (data.length === 0 && total > 0) {
      logger.warn('⚠️ Order status data is empty but total > 0. Check data structure.');
    }

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
// Payment methods - cache for 3 minutes
router.get('/payment-methods', cacheMiddleware(180), async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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
    
    // Ensure counts are parsed as integers and calculate total
    const total = results && Array.isArray(results) 
      ? results.reduce((sum, item) => {
          const count = parseInt(item.count || 0, 10);
          return sum + (isNaN(count) ? 0 : count);
        }, 0) 
      : 0;
    
    const data = results && Array.isArray(results) ? results.map(item => {
      const count = parseInt(item.count || 0, 10);
      const percentage = total > 0 && !isNaN(count) 
        ? parseFloat(((count / total) * 100).toFixed(2)) 
        : 0;
      
      return {
        method: item.method || 'Unknown',
        count: isNaN(count) ? 0 : count,
        percentage: percentage
      };
    }) : [];

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
// Fulfillment partners - cache for 3 minutes
router.get('/fulfillment-partners', cacheMiddleware(180), async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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
    
    const data = results && Array.isArray(results) ? results.map(item => {
      // Convert revenue to number first, then format
      const revenueValue = parseFloat(item.revenue) || 0;
      return {
        partner: item.partner || 'Unknown',
        orders: item.orders || 0,
        revenue: parseFloat(revenueValue.toFixed(2))
      };
    }) : [];

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
// Top products - cache for 3 minutes
router.get('/top-products', cacheMiddleware(180), async (req, res) => {
  try {
    const { startDate, endDate, pincode, by = 'orders', limit = 10 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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

    const data = results && Array.isArray(results) ? results.map(item => {
      // Convert revenue to number first, then format
      const revenueValue = parseFloat(item.revenue) || 0;
      return {
        product: item.product || 'Unknown',
        orders: item.orders || 0,
        revenue: parseFloat(revenueValue.toFixed(2))
      };
    }) : [];

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
// Top cities - cache for 3 minutes
router.get('/top-cities', cacheMiddleware(180), async (req, res) => {
  try {
    const { startDate, endDate, by = 'orders', limit = 10, sort = 'top' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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

    const data = results && Array.isArray(results) ? results.map(item => {
      // Convert revenue to number first, then format
      const revenueValue = parseFloat(item.revenue) || 0;
      return {
        city: item.city || 'Unknown',
        orders: item.orders || 0,
        revenue: parseFloat(revenueValue.toFixed(2))
      };
    }) : [];

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
// Trends - cache for 2 minutes (time-series data)
router.get('/trends', cacheMiddleware(120), async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode, view = 'orders' } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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

    // Get both orders count and revenue for each date
    const sql = `
      SELECT 
        DATE(order_date) as date,
        COUNT(*) as orders,
        SUM(order_value) as revenue
      FROM orders 
      ${whereClause}
      GROUP BY DATE(order_date)
      ORDER BY date ASC
    `;

    logger.info(`Trends query - whereClause: ${whereClause}, params: ${JSON.stringify(params)}`);
    const results = await query(sql, params);
    logger.info(`Trends query returned ${results && Array.isArray(results) ? results.length : 0} rows`);

    const data = results && Array.isArray(results) ? results.map(item => {
      // Format date as YYYY-MM-DD string (avoid UTC conversion issues)
      let dateStr = null;
      if (item.date) {
        if (item.date instanceof Date) {
          // If it's a Date object, format it as YYYY-MM-DD
          const year = item.date.getFullYear();
          const month = String(item.date.getMonth() + 1).padStart(2, '0');
          const day = String(item.date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
        } else if (typeof item.date === 'string') {
          // If it's already a string, use it (should be YYYY-MM-DD from DATE() function)
          dateStr = item.date.split('T')[0]; // Remove time part if present
        } else {
          dateStr = String(item.date);
        }
      }

      const orders = parseInt(item.orders || 0, 10);
      const revenue = parseFloat(item.revenue || 0);
      
      logger.debug(`Trend data point: date=${dateStr}, orders=${orders}, revenue=${revenue}`);

      return {
        date: dateStr,
        orders: orders,
        revenue: revenue
      };
    }) : [];

    logger.info(`Trends response: ${data.length} data points`);
    if (data.length === 0) {
      logger.warn('⚠️ No trend data found. Check date filters and database records.');
    }

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
// Delivery ratio - cache for 3 minutes
router.get('/delivery-ratio', cacheMiddleware(180), async (req, res) => {
  try {
    const { startDate, endDate, product, products, pincode } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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
// New logic:
// 1. Actual orders = total orders - cancelled orders (for each product-pincode)
// 2. Calculate median of actual orders per product (across all pincodes)
// 3. Only consider pincodes where actual orders > median for that product
// 4. If delivery ratio > 60%, mark as good pincode
// Bad Pincode: delivery ratio < 20% (after median filter)
/**
 * @swagger
 * /analytics/good-bad-pincodes:
 *   get:
 *     summary: Get good and bad pincodes by product (actual orders > median, then delivery ratio > 60% = good, < 20% = bad)
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
// Good/bad pincodes - cache for 5 minutes (less frequently changing)
router.get('/good-bad-pincodes', cacheMiddleware(300), async (req, res) => {
  try {
    const { startDate, endDate, product, products } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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

    // New logic:
    // 1. Actual orders = total orders - cancelled orders (for each product-pincode)
    // 2. Calculate median of actual orders per product (across all pincodes)
    // 3. Only consider pincodes where actual orders > median for that product
    // 4. If delivery ratio > 60%, mark as good pincode
    const sql = `
      SELECT 
        product_name as product,
        pincode,
        COUNT(*) as totalOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'cancelled' OR LOWER(TRIM(order_status)) LIKE '%cancel%' THEN 1 ELSE 0 END) as cancelledOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END) as deliveredCount
      FROM orders 
      ${whereClause}
      AND pincode IS NOT NULL
      AND TRIM(pincode) != ''
      AND LOWER(TRIM(pincode)) != 'unknown'
      AND product_name IS NOT NULL
      AND TRIM(product_name) != ''
      AND LOWER(TRIM(product_name)) != 'unknown'
      GROUP BY product_name, pincode
      HAVING COUNT(*) > 0
    `;

    logger.info(`Executing Good/Bad Pincodes query with ${params.length} parameters`);
    logger.debug(`SQL: ${sql}`);
    logger.debug(`Params: ${JSON.stringify(params)}`);
    
    const results = await query(sql, params);
    logger.info(`Good/Bad Pincodes query returned ${results ? results.length : 0} product-pincode combinations`);
    
    if (!results || results.length === 0) {
      logger.warn(`⚠️ No product-pincode combinations found. This could mean:`);
      logger.warn(`  1. No orders in database`);
      logger.warn(`  2. All orders have NULL pincode or product_name`);
      logger.warn(`  3. Date filters are too restrictive`);
      
      // Try a simple count query to see if there's any data at all
      const countSql = `SELECT COUNT(*) as total FROM orders ${whereClause}`;
      const countResult = await query(countSql, params);
      const totalOrders = countResult && countResult[0] ? countResult[0].total : 0;
      logger.warn(`   Total orders matching filters: ${totalOrders}`);
      
      const pincodeCountSql = `SELECT COUNT(DISTINCT pincode) as pincodes, COUNT(DISTINCT product_name) as products FROM orders ${whereClause} AND pincode IS NOT NULL AND product_name IS NOT NULL`;
      const pincodeCountResult = await query(pincodeCountSql, params);
      if (pincodeCountResult && pincodeCountResult[0]) {
        logger.warn(`   Distinct pincodes: ${pincodeCountResult[0].pincodes}, Distinct products: ${pincodeCountResult[0].products}`);
      }
    }

    // Process results: calculate actual orders and delivery ratio
    const allPincodes = results && Array.isArray(results) ? results.map(item => {
      const totalOrders = parseInt(item.totalOrders || 0, 10);
      const cancelledOrders = parseInt(item.cancelledOrders || 0, 10);
      const deliveredCount = parseInt(item.deliveredCount || 0, 10);
      const actualOrders = totalOrders - cancelledOrders; // Actual orders = total - cancelled
      const ratio = actualOrders > 0 
        ? parseFloat(((deliveredCount / actualOrders) * 100).toFixed(2))
        : 0;

      // Filter out invalid pincodes and products
      const product = String(item.product || '').trim();
      const pincode = String(item.pincode || '').trim();
      
      if (!product || product === '' || product.toLowerCase() === 'unknown') {
        return null;
      }
      if (!pincode || pincode === '' || pincode.toLowerCase() === 'unknown') {
        return null;
      }

      return {
        product: product,
        pincode: pincode,
        totalOrders: totalOrders,
        cancelledOrders: cancelledOrders,
        actualOrders: actualOrders,
        deliveredCount: deliveredCount,
        ratio: ratio
      };
    }).filter(item => item !== null) : []; // Remove null entries (invalid pincodes/products)

    logger.info(`Processed ${allPincodes.length} valid pincodes (after filtering invalid). Sample: ${JSON.stringify(allPincodes.slice(0, 3))}`);

    // Calculate median of actual orders per product
    const productMedians = {};
    const productPincodes = {};
    
    // Group by product
    allPincodes.forEach(item => {
      if (!productPincodes[item.product]) {
        productPincodes[item.product] = [];
      }
      productPincodes[item.product].push(item.actualOrders);
    });

    // Calculate median for each product
    Object.keys(productPincodes).forEach(product => {
      const orders = productPincodes[product].filter(o => o > 0).sort((a, b) => a - b);
      if (orders.length > 0) {
        const mid = Math.floor(orders.length / 2);
        productMedians[product] = orders.length % 2 === 0
          ? (orders[mid - 1] + orders[mid]) / 2
          : orders[mid];
        logger.info(`Product: ${product}, Median actual orders: ${productMedians[product]}, Total pincodes: ${orders.length}, Orders: [${orders.slice(0, 10).join(', ')}${orders.length > 10 ? '...' : ''}]`);
      } else {
        productMedians[product] = 0;
        logger.warn(`Product: ${product} has no pincodes with actual orders > 0`);
      }
    });

    // Filter: Only include pincodes where actual orders > median for that product
    // If median is 0, include all pincodes with actualOrders > 0
    const filteredPincodes = allPincodes.filter(item => {
      const median = productMedians[item.product] || 0;
      // If median is 0, include all pincodes with actual orders > 0
      // Otherwise, include only those above median
      const passes = median === 0 ? item.actualOrders > 0 : item.actualOrders > median;
      if (passes && item.ratio > 60) {
        logger.debug(`✅ Good candidate: Pincode ${item.pincode} (${item.product}): actualOrders=${item.actualOrders}, median=${median}, ratio=${item.ratio}%`);
      }
      return passes;
    });

    logger.info(`Good/Bad Pincodes: Total=${allPincodes.length}, After median filter=${filteredPincodes.length}, Good=${filteredPincodes.filter(i => i.ratio > 60).length}, Bad=${filteredPincodes.filter(i => i.ratio < 20).length}`);
    
    // Debug: Log some sample data if no results after filtering
    if (filteredPincodes.length === 0 && allPincodes.length > 0) {
      logger.warn(`⚠️ Median filter removed all pincodes. Total before filter: ${allPincodes.length}`);
      logger.warn(`⚠️ Sample data (first 10): ${JSON.stringify(allPincodes.slice(0, 10).map(p => ({ 
        product: p.product, 
        pincode: p.pincode, 
        actualOrders: p.actualOrders, 
        ratio: p.ratio.toFixed(2),
        median: productMedians[p.product] || 0
      })))}`);
      logger.warn(`⚠️ Product medians: ${JSON.stringify(productMedians)}`);
      
      // Show how many would pass if we used >= instead of >
      const withGreaterEqual = allPincodes.filter(item => {
        const median = productMedians[item.product] || 0;
        return median === 0 ? item.actualOrders > 0 : item.actualOrders >= median;
      });
      logger.warn(`⚠️ If using >= median: ${withGreaterEqual.length} pincodes would pass`);
    }

    // Separate into good (> 60%) and bad (< 20%)
    const good = filteredPincodes
      .filter(item => item.ratio > 60)
      .sort((a, b) => b.ratio - a.ratio);

    const bad = filteredPincodes
      .filter(item => item.ratio < 20)
      .sort((a, b) => a.ratio - b.ratio);
    
    logger.info(`Final results: Good=${good.length}, Bad=${bad.length}`);

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
    const { startDate, endDate, product, products, pincode, limit = 10 } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (startDate) {
      // Optimize: Avoid DATE() function on column for better index usage
      whereClause += ' AND order_date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      // Optimize: Use < next day for better index usage
      const nextDay = new Date(endDate);
      nextDay.setDate(nextDay.getDate() + 1);
      whereClause += ' AND order_date < ?';
      params.push(nextDay.toISOString().split('T')[0]);
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
    // Handle pincode filter - if a specific pincode is selected, show only that pincode's data
    if (pincode && pincode !== 'All' && pincode !== '') {
      whereClause += ' AND pincode = ?';
      params.push(pincode);
    }

    // Get Top Pincodes by absolute NDR count
    // Improved NDR status matching to handle variations like "NDR", "Ndr", "ndr", etc.
    const sql = `
      SELECT 
        pincode,
        COUNT(*) as totalOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'cancelled' OR LOWER(TRIM(order_status)) LIKE '%cancel%' THEN 1 ELSE 0 END) as cancelledOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'ndr' OR LOWER(TRIM(order_status)) LIKE '%ndr%' THEN 1 ELSE 0 END) as ndrCount,
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
            SUM(CASE WHEN LOWER(TRIM(order_status)) = 'ndr' OR LOWER(TRIM(order_status)) LIKE '%ndr%' THEN 1 ELSE 0 END) * 100.0 / 
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
      AND pincode != ''
      GROUP BY pincode
      HAVING SUM(CASE WHEN LOWER(TRIM(order_status)) = 'ndr' OR LOWER(TRIM(order_status)) LIKE '%ndr%' THEN 1 ELSE 0 END) > 0
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
      ndrRatio: (() => {
        const ndrRatioNum = parseFloat(item.ndrRatio) || 0;
        return parseFloat(ndrRatioNum.toFixed(2));
      })()
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

