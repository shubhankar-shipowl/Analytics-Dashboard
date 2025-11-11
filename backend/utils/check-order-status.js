require('dotenv').config();
const { query } = require('../config/database');

(async () => {
  try {
    console.log('Checking order status values in database...\n');
    
    // Get distinct order statuses with counts
    const statusQuery = `
      SELECT 
        order_status,
        COUNT(*) as count,
        MIN(order_date) as first_date,
        MAX(order_date) as last_date
      FROM orders
      GROUP BY order_status
      ORDER BY count DESC
      LIMIT 20
    `;
    
    const statuses = await query(statusQuery);
    console.log('All Order Statuses:');
    console.log('==================');
    statuses.forEach(s => {
      console.log(`  "${s.order_status}" - Count: ${s.count}, Date Range: ${s.first_date} to ${s.last_date}`);
    });
    
    // Check for delivered orders in last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dateStr = thirtyDaysAgo.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`\nToday: ${todayStr}`);
    console.log(`Checking delivered orders in last 30 days (since ${dateStr}):`);
    console.log('==========================================================');
    
    // Check some sample delivered orders with their dates
    const sampleDeliveredQuery = `
      SELECT order_date, order_status, COUNT(*) as count
      FROM orders
      WHERE LOWER(TRIM(order_status)) = 'delivered'
      GROUP BY order_date, order_status
      ORDER BY order_date DESC
      LIMIT 10
    `;
    
    const sampleDelivered = await query(sampleDeliveredQuery);
    console.log('\nSample Delivered Orders (most recent dates):');
    sampleDelivered.forEach(s => {
      console.log(`  Date: ${s.order_date}, Status: "${s.order_status}", Count: ${s.count}`);
    });
    
    const deliveredQuery = `
      SELECT 
        order_status,
        COUNT(*) as count
      FROM orders
      WHERE order_date >= ?
      GROUP BY order_status
      ORDER BY count DESC
    `;
    
    const recentStatuses = await query(deliveredQuery, [dateStr]);
    recentStatuses.forEach(s => {
      const isDelivered = s.order_status && s.order_status.toLowerCase().trim() === 'delivered';
      console.log(`  "${s.order_status}" - Count: ${s.count} ${isDelivered ? '✓ DELIVERED MATCH' : ''}`);
    });
    
    // Check exact delivered count
    const exactDeliveredQuery = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE order_date >= ?
      AND LOWER(TRIM(order_status)) = 'delivered'
    `;
    
    const exactDelivered = await query(exactDeliveredQuery, [dateStr]);
    console.log(`\nExact "delivered" match (LOWER(TRIM) = 'delivered'): ${exactDelivered[0].count}`);
    
    // Check with LIKE
    const likeDeliveredQuery = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE order_date >= ?
      AND LOWER(order_status) LIKE '%delivered%'
    `;
    
    const likeDelivered = await query(likeDeliveredQuery, [dateStr]);
    console.log(`LIKE '%delivered%' match: ${likeDelivered[0].count}`);
    
    // Check total orders (non-cancelled) in last 30 days
    const totalOrdersQuery = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE order_date >= ?
      AND LOWER(TRIM(order_status)) NOT LIKE '%cancel%'
    `;
    
    const totalOrders = await query(totalOrdersQuery, [dateStr]);
    console.log(`Total orders (non-cancelled) in last 30 days: ${totalOrders[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

