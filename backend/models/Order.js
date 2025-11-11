const { query } = require('../config/database');
const logger = require('../utils/logger');

class Order {
  constructor(data) {
    this.order_id = data.order_id || null;
    this.order_date = data.order_date || null;
    this.order_status = data.order_status || data.status || null;
    this.product_name = data.product_name || data.product || null;
    this.sku = data.sku || null;
    this.pincode = data.pincode || null;
    this.city = data.city || null;
    this.order_value = data.order_value || data.amount || null;
    this.payment_method = data.payment_method || null;
    this.fulfillment_partner = data.fulfillment_partner || null;
    this.quantity = data.quantity || 1;
  }

  // Create a new order
  static async create(orderData) {
    try {
      const order = new Order(orderData);
      const sql = `INSERT INTO orders (
        order_id, order_date, order_status, product_name, sku, 
        pincode, city, order_value, payment_method, fulfillment_partner, quantity
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

      const result = await query(sql, [
        order.order_id,
        order.order_date,
        order.order_status,
        order.product_name,
        order.sku,
        order.pincode,
        order.city,
        order.order_value,
        order.payment_method,
        order.fulfillment_partner,
        order.quantity
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

  // Bulk insert orders
  static async bulkCreate(ordersData) {
    try {
      if (!ordersData || ordersData.length === 0) {
        return { inserted: 0, errors: [] };
      }

      const sql = `INSERT INTO orders (
        order_id, order_date, order_status, product_name, sku, 
        pincode, city, order_value, payment_method, fulfillment_partner, quantity
      ) VALUES ?`;

      const values = ordersData.map(order => {
        const o = new Order(order);
        return [
          o.order_id,
          o.order_date,
          o.order_status,
          o.product_name,
          o.sku,
          o.pincode,
          o.city,
          o.order_value,
          o.payment_method,
          o.fulfillment_partner,
          o.quantity
        ];
      });

      // Use connection pool for bulk insert
      const { pool } = require('../config/database');
      const connection = await pool.getConnection();
      
      try {
        await connection.query('START TRANSACTION');
        const [result] = await connection.query(sql, [values]);
        await connection.query('COMMIT');
        
        const affectedRows = result && result.affectedRows ? result.affectedRows : 0;
        logger.info(`Bulk inserted ${affectedRows} orders`);
        return { inserted: affectedRows, errors: [] };
      } catch (error) {
        await connection.query('ROLLBACK');
        throw error;
      } finally {
        connection.release();
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
        // Use DATE() function to compare Order Date column with today's date
        sql += ' AND DATE(order_date) >= DATE(?)';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        // Use DATE() function to compare Order Date column with today's date
        sql += ' AND DATE(order_date) <= DATE(?)';
        params.push(filters.endDate);
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

      const orders = await query(sql, params);
      logger.info(`Found ${orders.length} orders with filters`);
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
        // Use DATE() function to compare Order Date column with today's date
        sql += ' AND DATE(order_date) >= DATE(?)';
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        // Use DATE() function to compare Order Date column with today's date
        sql += ' AND DATE(order_date) <= DATE(?)';
        params.push(filters.endDate);
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

  // Clear all orders (use with caution)
  static async clearAll() {
    try {
      // First get count for logging
      const countResult = await query('SELECT COUNT(*) as count FROM orders');
      const count = countResult && countResult.length > 0 ? countResult[0].count : 0;
      
      // Use DELETE instead of TRUNCATE to avoid foreign key issues
      // TRUNCATE resets AUTO_INCREMENT, DELETE doesn't
      const sql = 'DELETE FROM orders';
      const result = await query(sql);
      
      const deletedRows = result && result.affectedRows ? result.affectedRows : 0;
      logger.warn(`All orders cleared from database. Deleted ${deletedRows} rows (count was ${count})`);
      return { deleted: deletedRows };
    } catch (error) {
      logger.error('Error clearing orders:', error);
      throw error;
    }
  }
}

module.exports = Order;

