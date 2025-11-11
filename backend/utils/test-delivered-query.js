require('dotenv').config();
const { query } = require('../config/database');

(async () => {
  try {
    console.log('Testing Delivered Status Queries...\n');
    
    // Test 1: Check exact status values
    const exactStatusQuery = `
      SELECT 
        order_status,
        COUNT(*) as count
      FROM orders
      WHERE order_status IN ('Delivered', 'delivered', 'DELIVERED', ' Delivered ', 'Delivered ')
      GROUP BY order_status
      ORDER BY count DESC
    `;
    
    const exactStatuses = await query(exactStatusQuery);
    console.log('Orders with exact "Delivered" variations:');
    exactStatuses.forEach(s => {
      console.log(`  "${s.order_status}" - Count: ${s.count}`);
    });
    
    // Test 2: Check with LOWER(TRIM)
    const lowerTrimQuery = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE LOWER(TRIM(order_status)) = 'delivered'
    `;
    
    const lowerTrimResult = await query(lowerTrimQuery);
    console.log(`\nTotal with LOWER(TRIM) = 'delivered': ${lowerTrimResult[0].count}`);
    
    // Test 3: Check with LIKE
    const likeQuery = `
      SELECT COUNT(*) as count
      FROM orders
      WHERE LOWER(order_status) LIKE '%delivered%'
    `;
    
    const likeResult = await query(likeQuery);
    console.log(`Total with LIKE '%delivered%': ${likeResult[0].count}`);
    
    // Test 4: Check yearly filter (last year)
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const yearStart = oneYearAgo.toISOString().split('T')[0];
    const yearEnd = today.toISOString().split('T')[0];
    
    console.log(`\nTesting Yearly Filter (${yearStart} to ${yearEnd}):`);
    
    const yearlyQuery = `
      SELECT 
        COUNT(*) as totalOrders,
        SUM(CASE WHEN LOWER(TRIM(order_status)) = 'delivered' THEN 1 ELSE 0 END) as deliveredCount
      FROM orders
      WHERE DATE(order_date) >= DATE(?)
      AND DATE(order_date) <= DATE(?)
      AND LOWER(TRIM(order_status)) NOT LIKE '%cancel%'
    `;
    
    const yearlyResult = await query(yearlyQuery, [yearStart, yearEnd]);
    console.log(`  Total Orders (non-cancelled): ${yearlyResult[0].totalOrders}`);
    console.log(`  Delivered Orders: ${yearlyResult[0].deliveredCount}`);
    console.log(`  Delivery Ratio: ${yearlyResult[0].totalOrders > 0 ? ((yearlyResult[0].deliveredCount / yearlyResult[0].totalOrders) * 100).toFixed(2) : 0}%`);
    
    // Test 5: Sample some order statuses to see what we have
    const sampleQuery = `
      SELECT DISTINCT order_status
      FROM orders
      WHERE LOWER(order_status) LIKE '%deliver%'
      LIMIT 10
    `;
    
    const samples = await query(sampleQuery);
    console.log('\nSample statuses containing "deliver":');
    samples.forEach(s => {
      console.log(`  "${s.order_status}"`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();

