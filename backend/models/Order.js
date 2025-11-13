const { query } = require('../config/database');
const logger = require('../utils/logger');

class Order {
  constructor(data) {
    // All 34 fields from Excel file
    this.order_account = data.order_account || null;
    this.order_id = data.order_id || null;
    this.channel_order_number = data.channel_order_number || null;
    this.channel_order_date = data.channel_order_date || null;
    this.waybill_number = data.waybill_number || null;
    this.pre_generated_waybill = data.pre_generated_waybill || null;
    this.order_date = data.order_date || null;
    this.ref_invoice_number = data.ref_invoice_number || null;
    this.payment_method = data.payment_method || data.mode || null;
    this.express = data.express || null;
    this.pickup_warehouse = data.pickup_warehouse || null;
    this.consignee_name = data.consignee_name || null;
    this.consignee_contact = data.consignee_contact || null;
    this.alternate_number = data.alternate_number || null;
    this.address = data.address || null;
    this.city = data.city || null;
    this.state = data.state || null;
    this.pincode = data.pincode || null;
    this.product_name = data.product_name || data.product || null;
    this.quantity = data.quantity || 1;
    this.product_value = data.product_value || null;
    this.sku = data.sku || null;
    this.order_value = data.order_value || data.amount || null;
    this.extra_charges = data.extra_charges || null;
    this.total_amount = data.total_amount || null;
    this.cod_amount = data.cod_amount || null;
    this.dimensions = data.dimensions || null;
    this.weight = data.weight || null;
    this.fulfillment_partner = data.fulfillment_partner || null;
    this.order_status = data.order_status || data.status || null;
    this.added_on = data.added_on || null;
    this.delivered_date = data.delivered_date || null;
    this.rts_date = data.rts_date || null;
    this.client_order_id = data.client_order_id || null;
  }

  // Create a new order
  static async create(orderData) {
    try {
      const order = new Order(orderData);
      const sql = `INSERT INTO orders (
        order_account, order_id, channel_order_number, channel_order_date, waybill_number,
        pre_generated_waybill, order_date, ref_invoice_number, payment_method, express,
        pickup_warehouse, consignee_name, consignee_contact, alternate_number, address,
        city, state, pincode, product_name, quantity, product_value, sku, order_value,
        extra_charges, total_amount, cod_amount, dimensions, weight, fulfillment_partner,
        order_status, added_on, delivered_date, rts_date, client_order_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const result = await query(sql, [
        order.order_account, order.order_id, order.channel_order_number, order.channel_order_date, order.waybill_number,
        order.pre_generated_waybill, order.order_date, order.ref_invoice_number, order.payment_method, order.express,
        order.pickup_warehouse, order.consignee_name, order.consignee_contact, order.alternate_number, order.address,
        order.city, order.state, order.pincode, order.product_name, order.quantity, order.product_value, order.sku, order.order_value,
        order.extra_charges, order.total_amount, order.cod_amount, order.dimensions, order.weight, order.fulfillment_partner,
        order.order_status, order.added_on, order.delivered_date, order.rts_date, order.client_order_id
      ]);

      // For INSERT queries, mysql2 returns result with insertId
      const insertId = result && result.insertId ? result.insertId : null;
      logger.info(`Order created with ID: ${insertId}`);
      return { id: insertId, ...order };
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  // Bulk insert orders (optimized)
  static async bulkCreate(ordersData, providedConnection = null) {
    try {
      if (!ordersData || ordersData.length === 0) {
        return { inserted: 0, errors: [] };
      }

      // Optimize: Use INSERT IGNORE or ON DUPLICATE KEY UPDATE for better performance
      // For now, use standard INSERT with optimized batch size
      // Include all 34 fields from Excel file
      const sql = `INSERT INTO orders (
        order_account, order_id, channel_order_number, channel_order_date, waybill_number,
        pre_generated_waybill, order_date, ref_invoice_number, payment_method, express,
        pickup_warehouse, consignee_name, consignee_contact, alternate_number, address,
        city, state, pincode, product_name, quantity, product_value, sku, order_value,
        extra_charges, total_amount, cod_amount, dimensions, weight, fulfillment_partner,
        order_status, added_on, delivered_date, rts_date, client_order_id
      ) VALUES ?`;

      // Pre-process all orders at once for better performance
      const values = ordersData.map(order => {
        const o = new Order(order);
        return [
          o.order_account || null, o.order_id || null, o.channel_order_number || null, o.channel_order_date || null, o.waybill_number || null,
          o.pre_generated_waybill || null, o.order_date || null, o.ref_invoice_number || null, o.payment_method || null, o.express || null,
          o.pickup_warehouse || null, o.consignee_name || null, o.consignee_contact || null, o.alternate_number || null, o.address || null,
          o.city || null, o.state || null, o.pincode || null, o.product_name || null, o.quantity || 1, o.product_value || null, o.sku || null, o.order_value || null,
          o.extra_charges || null, o.total_amount || null, o.cod_amount || null, o.dimensions || null, o.weight || null, o.fulfillment_partner || null,
          o.order_status || null, o.added_on || null, o.delivered_date || null, o.rts_date || null, o.client_order_id || null
        ];
      });

      // Use provided connection or get new one
      const { pool } = require('../config/database');
      const connection = providedConnection || await pool.getConnection();
      const shouldRelease = !providedConnection;
      
      try {
        // Only start transaction if we're managing the connection
        if (shouldRelease) {
          await connection.query('START TRANSACTION');
        }
        
        // Use query() for bulk inserts with VALUES ? syntax (execute() doesn't work with VALUES ?)
        // For bulk inserts, query() is more appropriate than execute()
        const [result] = await connection.query(sql, [values]);
        
        if (shouldRelease) {
          await connection.query('COMMIT');
        }
        
        const affectedRows = result && result.affectedRows ? result.affectedRows : 0;
        return { inserted: affectedRows, errors: [] };
      } catch (error) {
        if (shouldRelease) {
          await connection.query('ROLLBACK');
        }
        throw error;
      } finally {
        if (shouldRelease) {
          connection.release();
        }
      }
    } catch (error) {
      logger.error('Error in bulk create:', error);
      throw error;
    }
  }

  // Find order by ID
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM orders WHERE id = ?';
      const orders = await query(sql, [id]);
      return orders && orders.length > 0 ? orders[0] : null;
    } catch (error) {
      logger.error(`Error finding order by ID ${id}:`, error);
      throw error;
    }
  }

  // Find orders with filters
  static async find(filters = {}, pagination = {}) {
    try {
      let sql = 'SELECT * FROM orders WHERE 1=1';
      const params = [];

      if (filters.startDate) {
        // Optimize: Avoid DATE() function on column - use range comparison instead
        // DATE(order_date) prevents index usage, so use direct comparison
        sql += ' AND order_date >= ?';
        params.push(filters.startDate);
        logger.info(`Applying startDate filter: ${filters.startDate}`);
      }

      if (filters.endDate) {
        // Optimize: Use < next day instead of DATE() function for better index usage
        // This allows MySQL to use the index on order_date
        const nextDay = new Date(filters.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        sql += ' AND order_date < ?';
        params.push(nextDay.toISOString().split('T')[0]);
        logger.info(`Applying endDate filter: ${filters.endDate} (optimized to < ${nextDay.toISOString().split('T')[0]})`);
      }

      if (filters.product) {
        sql += ' AND product_name LIKE ?';
        params.push(`%${filters.product}%`);
      }
      if (filters.products) {
        // Handle multiple products (comma-separated)
        const productList = filters.products.split(',').map(p => p.trim()).filter(p => p);
        if (productList.length > 0) {
          const placeholders = productList.map(() => '?').join(',');
          sql += ` AND product_name IN (${placeholders})`;
          params.push(...productList);
        }
      }

      if (filters.pincode) {
        sql += ' AND pincode = ?';
        params.push(filters.pincode);
      }

      if (filters.status) {
        sql += ' AND order_status = ?';
        params.push(filters.status);
      }

      if (filters.order_id) {
        sql += ' AND order_id = ?';
        params.push(filters.order_id);
      }

      sql += ' ORDER BY order_date DESC';

      if (pagination.limit) {
        sql += ' LIMIT ?';
        params.push(parseInt(pagination.limit));
      }

      if (pagination.offset) {
        sql += ' OFFSET ?';
        params.push(parseInt(pagination.offset));
      }

      logger.info(`🔍 Executing SQL query: ${sql}`);
      logger.info(`🔍 SQL parameters: ${JSON.stringify(params)}`);
      const orders = await query(sql, params);
      logger.info(`✅ Found ${orders.length} orders with filters`);
      if (filters.startDate || filters.endDate) {
        logger.info(`📅 Date filter applied - startDate: ${filters.startDate || 'none'}, endDate: ${filters.endDate || 'none'}`);
        if (orders.length > 0) {
          const sampleDates = orders.slice(0, 5).map(o => o.order_date);
          logger.info(`📅 Sample order dates from results: ${JSON.stringify(sampleDates)}`);
        }
      }
      return orders;
    } catch (error) {
      logger.error('Error finding orders:', error);
      throw error;
    }
  }

  // Count orders with filters
  static async count(filters = {}) {
    try {
      let sql = 'SELECT COUNT(*) as total FROM orders WHERE 1=1';
      const params = [];

      if (filters.startDate) {
        // Optimize: Avoid DATE() function on column for better index usage
        sql += ' AND order_date >= ?';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        // Optimize: Use < next day for better index usage
        const nextDay = new Date(filters.endDate);
        nextDay.setDate(nextDay.getDate() + 1);
        sql += ' AND order_date < ?';
        params.push(nextDay.toISOString().split('T')[0]);
      }

      if (filters.product) {
        sql += ' AND product_name LIKE ?';
        params.push(`%${filters.product}%`);
      }
      if (filters.products) {
        // Handle multiple products (comma-separated)
        const productList = filters.products.split(',').map(p => p.trim()).filter(p => p);
        if (productList.length > 0) {
          const placeholders = productList.map(() => '?').join(',');
          sql += ` AND product_name IN (${placeholders})`;
          params.push(...productList);
        }
      }

      if (filters.pincode) {
        sql += ' AND pincode = ?';
        params.push(filters.pincode);
      }

      if (filters.status) {
        sql += ' AND order_status = ?';
        params.push(filters.status);
      }

      const result = await query(sql, params);
      return result && result.length > 0 ? result[0].total : 0;
    } catch (error) {
      logger.error('Error counting orders:', error);
      throw error;
    }
  }

  // Update order
  static async update(id, updateData) {
    try {
      const updateFields = [];
      const values = [];

      const allowedFields = [
        'order_id', 'order_date', 'order_status', 'product_name', 'sku',
        'pincode', 'city', 'order_value', 'payment_method', 
        'fulfillment_partner', 'quantity'
      ];

      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      }

      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }

      values.push(id);
      const sql = `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;
      await query(sql, values);

      logger.info(`Order ${id} updated successfully`);
      return true;
    } catch (error) {
      logger.error(`Error updating order ${id}:`, error);
      throw error;
    }
  }

  // Delete order
  static async delete(id) {
    try {
      const sql = 'DELETE FROM orders WHERE id = ?';
      await query(sql, [id]);
      logger.info(`Order ${id} deleted successfully`);
      return true;
    } catch (error) {
      logger.error(`Error deleting order ${id}:`, error);
      throw error;
    }
  }

  // Clear all orders (optimized - use TRUNCATE for better performance)
  static async clearAll() {
    const { pool } = require('../config/database');
    const connection = await pool.getConnection();
    
    try {
      // Get count for logging before deletion
      const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM orders');
      const count = countResult && countResult.length > 0 ? countResult[0].count : 0;
      
      if (count === 0) {
        logger.info('No orders to delete');
        return { deleted: 0 };
      }
      
      // Optimize: Use TRUNCATE for faster deletion (much faster than DELETE)
      // TRUNCATE is faster because it drops and recreates the table
      // However, it resets AUTO_INCREMENT, so we'll handle that
      await connection.query('SET FOREIGN_KEY_CHECKS = 0'); // Disable FK checks temporarily
      await connection.query('TRUNCATE TABLE orders');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1'); // Re-enable FK checks
      
      logger.warn(`All orders cleared from database using TRUNCATE. Deleted ${count} rows`);
      return { deleted: count };
    } catch (error) {
      // If TRUNCATE fails (e.g., foreign key constraints), fall back to DELETE
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.message.includes('foreign key')) {
        logger.warn('TRUNCATE failed due to foreign key constraints, using DELETE instead...');
        try {
          await connection.query('SET FOREIGN_KEY_CHECKS = 0');
          const [result] = await connection.execute('DELETE FROM orders');
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
          const deletedRows = result && result.affectedRows ? result.affectedRows : 0;
          logger.warn(`All orders cleared using DELETE. Deleted ${deletedRows} rows`);
          return { deleted: deletedRows };
        } catch (deleteError) {
          await connection.query('SET FOREIGN_KEY_CHECKS = 1');
          throw deleteError;
        }
      }
      logger.error('Error clearing orders:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = Order;

