/**
 * Optimized Query Builder Utility
 * 
 * Provides reusable functions for building efficient database queries
 * with proper index usage and parameter binding
 */

/**
 * Build optimized WHERE clause with filters
 * @param {Object} filters - Filter object with startDate, endDate, product, products, pincode, status
 * @param {Array} params - Array to push parameters to
 * @returns {string} WHERE clause string
 */
function buildWhereClause(filters = {}, params = []) {
  let whereClause = 'WHERE 1=1';

  // Date filters - optimized for index usage (no DATE() function)
  if (filters.startDate) {
    whereClause += ' AND order_date >= ?';
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    // Use < next day for better index usage instead of DATE() function
    const nextDay = new Date(filters.endDate);
    nextDay.setDate(nextDay.getDate() + 1);
    whereClause += ' AND order_date < ?';
    params.push(nextDay.toISOString().split('T')[0]);
  }

  // Product filters - prefer IN over LIKE for exact matches
  if (filters.products) {
    // Multiple products (comma-separated) - use IN for better performance
    const productList = filters.products.split(',').map(p => p.trim()).filter(p => p);
    if (productList.length > 0) {
      const placeholders = productList.map(() => '?').join(',');
      whereClause += ` AND product_name IN (${placeholders})`;
      params.push(...productList);
    }
  } else if (filters.product) {
    // Single product - use LIKE for partial match
    whereClause += ' AND product_name LIKE ?';
    params.push(`%${filters.product}%`);
  }

  // Pincode filter - exact match uses index
  if (filters.pincode) {
    whereClause += ' AND pincode = ?';
    params.push(filters.pincode);
  }

  // Status filter - exact match uses index
  if (filters.status) {
    whereClause += ' AND order_status = ?';
    params.push(filters.status);
  }

  // Order ID filter
  if (filters.order_id) {
    whereClause += ' AND order_id = ?';
    params.push(filters.order_id);
  }

  return whereClause;
}

/**
 * Build optimized status condition for order status matching
 * Uses normalized status column if available, otherwise falls back to LOWER(TRIM())
 * @param {string} statusType - Type of status filter ('delivered', 'rto', 'rts', etc.)
 * @returns {string} SQL condition
 */
function buildStatusCondition(statusType) {
  // For now, use optimized pattern matching
  // TODO: Add normalized_status column with generated column for better performance
  const conditions = {
    delivered: "order_status = 'delivered'",
    rto: "order_status LIKE '%rto%' AND order_status NOT LIKE '%rto-it%'",
    rts: "order_status = 'rts'",
    ndr: "order_status = 'ndr'",
    dispatched: "order_status = 'dispatched'",
    lost: "order_status = 'lost'",
    cancelled: "order_status LIKE '%cancel%'",
    // Combined valid order statuses
    validOrders: `(
      order_status = 'rts' OR
      order_status = 'rto' OR
      order_status = 'delivered' OR
      order_status = 'lost' OR
      order_status = 'ndr' OR
      order_status = 'dispatched' OR
      order_status LIKE '%rto-it%' OR
      order_status LIKE '%rto it%' OR
      (order_status LIKE '%rto-i%' AND order_status NOT LIKE '%rto-it%') OR
      order_status LIKE '%rto-ii%' OR
      order_status LIKE '%rto ii%' OR
      order_status LIKE '%rto-dispatched%' OR
      order_status LIKE '%rto dispatched%' OR
      order_status LIKE '%rto pending%' OR
      order_status LIKE '%rto-pending%'
    )`
  };

  return conditions[statusType] || `order_status = '${statusType}'`;
}

/**
 * Build optimized GROUP BY clause
 * @param {string|Array} fields - Field(s) to group by
 * @returns {string} GROUP BY clause
 */
function buildGroupBy(fields) {
  if (Array.isArray(fields)) {
    return `GROUP BY ${fields.join(', ')}`;
  }
  return `GROUP BY ${fields}`;
}

/**
 * Build optimized ORDER BY clause
 * @param {string} field - Field to order by
 * @param {string} direction - ASC or DESC
 * @returns {string} ORDER BY clause
 */
function buildOrderBy(field, direction = 'DESC') {
  return `ORDER BY ${field} ${direction.toUpperCase()}`;
}

/**
 * Build LIMIT and OFFSET clause
 * @param {number} limit - Number of records
 * @param {number} offset - Starting position
 * @returns {string} LIMIT clause
 */
function buildLimit(limit, offset = 0) {
  if (offset > 0) {
    return `LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`;
  }
  return `LIMIT ${parseInt(limit)}`;
}

/**
 * Extract filters from request query
 * @param {Object} query - Express request query object
 * @returns {Object} Normalized filters object
 */
function extractFilters(query) {
  const filters = {};
  
  if (query.startDate) filters.startDate = query.startDate;
  if (query.endDate) filters.endDate = query.endDate;
  if (query.product) filters.product = query.product;
  if (query.products) filters.products = query.products;
  if (query.pincode) filters.pincode = query.pincode;
  if (query.status) filters.status = query.status;
  if (query.order_id) filters.order_id = query.order_id;

  return filters;
}

module.exports = {
  buildWhereClause,
  buildStatusCondition,
  buildGroupBy,
  buildOrderBy,
  buildLimit,
  extractFilters
};

