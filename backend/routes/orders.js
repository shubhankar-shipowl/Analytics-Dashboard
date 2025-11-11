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

// Get all orders with optional filters
router.get('/', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      product, 
      pincode, 
      status,
      order_id,
      limit = 100,
      offset = 0 
    } = req.query;

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (product) filters.product = product;
    if (pincode) filters.pincode = pincode;
    if (status) filters.status = status;
    if (order_id) filters.order_id = order_id;

    const orders = await Order.find(filters, { limit, offset });
    const total = await Order.count(filters);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single order by ID
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

// Create new order
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

// Update order
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

// Delete order
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

