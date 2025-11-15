-- Database Optimization Script
-- Run this script to add additional indexes for better query performance
-- Usage: mysql -u username -p database_name < optimize-indexes.sql

USE dashboard_db;

-- Add composite indexes for common query patterns
-- These indexes significantly improve performance for filtered queries

-- Index for date + status queries (most common pattern)
CREATE INDEX IF NOT EXISTS idx_date_status_value ON orders(order_date, order_status, order_value);

-- Index for date + product queries
CREATE INDEX IF NOT EXISTS idx_date_product ON orders(order_date, product_name);

-- Index for date + pincode queries
CREATE INDEX IF NOT EXISTS idx_date_pincode ON orders(order_date, pincode);

-- Index for product + status queries
CREATE INDEX IF NOT EXISTS idx_product_status ON orders(product_name, order_status);

-- Index for date + product + status (common analytics query)
CREATE INDEX IF NOT EXISTS idx_date_product_status ON orders(order_date, product_name, order_status);

-- Index for date + pincode + status
CREATE INDEX IF NOT EXISTS idx_date_pincode_status ON orders(order_date, pincode, order_status);

-- Index for fulfillment partner + status + date
CREATE INDEX IF NOT EXISTS idx_partner_status_date ON orders(fulfillment_partner, order_status, order_date);

-- Index for payment method + date + status
CREATE INDEX IF NOT EXISTS idx_payment_date_status ON orders(payment_method, order_date, order_status);

-- Index for city + date queries
CREATE INDEX IF NOT EXISTS idx_city_date ON orders(city, order_date);

-- Index for state + date queries
CREATE INDEX IF NOT EXISTS idx_state_date ON orders(state, order_date);

-- Optimize existing indexes - ensure they're being used
-- Analyze tables to update statistics
ANALYZE TABLE orders;

-- Show index usage statistics
-- Run this separately: SHOW INDEX FROM orders;

-- Performance Tips:
-- 1. These composite indexes are most effective when queries filter by the leftmost columns
-- 2. Indexes on order_date are critical for date range queries
-- 3. Composite indexes reduce the need for multiple single-column indexes
-- 4. Monitor query performance with EXPLAIN SELECT ... to verify index usage

