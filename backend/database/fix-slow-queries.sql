-- Fix Slow Queries - Add Optimized Indexes
-- Run this script to add indexes that will dramatically improve query performance
-- Usage: mysql -u username -p database_name < fix-slow-queries.sql

USE dashboard_db;

-- Critical: Add covering index for ORDER BY order_date DESC queries
-- This index allows MySQL to use the index for both filtering and sorting
-- Without this, MySQL has to do a full table scan and sort in memory
CREATE INDEX IF NOT EXISTS idx_order_date_id_desc ON orders(order_date DESC, id DESC);

-- Alternative covering index for ascending order (if needed)
CREATE INDEX IF NOT EXISTS idx_order_date_id_asc ON orders(order_date ASC, id ASC);

-- Optimize: Add index for common filter combinations
-- This helps when filtering by date and other fields
CREATE INDEX IF NOT EXISTS idx_date_status_id ON orders(order_date DESC, order_status, id DESC);

-- For queries that filter by date and product
CREATE INDEX IF NOT EXISTS idx_date_product_id ON orders(order_date DESC, product_name, id DESC);

-- For queries that filter by date and pincode
CREATE INDEX IF NOT EXISTS idx_date_pincode_id ON orders(order_date DESC, pincode, id DESC);

-- Analyze table to update statistics (critical for query optimizer)
ANALYZE TABLE orders;

-- Show index usage
-- Run separately: SHOW INDEX FROM orders WHERE Key_name LIKE 'idx_order_date%';

-- Performance Notes:
-- 1. The DESC indexes are critical for ORDER BY order_date DESC queries
-- 2. Including 'id' in the index makes it a covering index (avoids table lookups)
-- 3. DESC indexes are available in MySQL 8.0+ (for older versions, use ASC and reverse sort in app)
-- 4. ANALYZE TABLE updates statistics so MySQL can choose the best index

