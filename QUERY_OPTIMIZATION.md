# Query Performance Optimization Guide

## Problem: Slow Queries (3-10 seconds)

The orders list endpoint was experiencing slow queries:
```
SELECT * FROM orders WHERE 1=1 ORDER BY order_date DESC LIMIT ?
```

**Root Causes:**
1. Full table scan when no filters provided
2. No covering index for `ORDER BY order_date DESC`
3. Selecting all 34 columns with `SELECT *`
4. Large result sets without proper limits

## Solutions Applied

### 1. Added Covering Index (CRITICAL)

**Index**: `idx_order_date_id_desc` on `(order_date DESC, id DESC)`

This index allows MySQL to:
- Use the index for sorting (no filesort needed)
- Avoid table lookups (covering index)
- Efficiently handle `ORDER BY order_date DESC` queries

**To apply on VPS:**
```bash
cd backend
npm run optimize:db
# or
mysql -u your_user -p dashboard_db < database/fix-slow-queries.sql
```

### 2. Default Date Filter

When no filters are provided, the query now defaults to **last 90 days** to avoid full table scans.

**Before**: `SELECT * FROM orders WHERE 1=1` (scans entire table)
**After**: `SELECT * FROM orders WHERE order_date >= '2024-08-15'` (uses index)

### 3. Query Optimization

- Added `id DESC` to ORDER BY for deterministic sorting
- Enforced maximum limit of 1000 records
- Better index usage with optimized ORDER BY clause

### 4. Limit Enforcement

- Maximum limit: 1000 records per query
- Default limit: 100 records
- Prevents accidentally requesting millions of records

## Performance Improvements

### Expected Results

| Query Type | Before | After | Improvement |
|------------|--------|-------|-------------|
| No filters | 3-10s | <100ms | **30-100x faster** |
| With date filter | 1-3s | <50ms | **20-60x faster** |
| With filters | 500ms-2s | <30ms | **15-65x faster** |

## Running the Fix on VPS

### Option 1: Use the Script (Recommended)
```bash
cd /root/Analytics-Dashboard/backend
npm run optimize:db
```

### Option 2: Run SQL Directly
```bash
mysql -u root -p dashboard_db < /root/Analytics-Dashboard/backend/database/fix-slow-queries.sql
```

### Option 3: Manual SQL
```sql
USE dashboard_db;

-- Critical index for ORDER BY order_date DESC
CREATE INDEX IF NOT EXISTS idx_order_date_id_desc ON orders(order_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_order_date_id_asc ON orders(order_date ASC, id ASC);

-- Update statistics
ANALYZE TABLE orders;
```

## Verification

### Check if Index Exists
```sql
SHOW INDEX FROM orders WHERE Key_name = 'idx_order_date_id_desc';
```

### Test Query Performance
```sql
EXPLAIN SELECT * FROM orders WHERE 1=1 ORDER BY order_date DESC LIMIT 100;
```

Look for:
- `key`: Should show `idx_order_date_id_desc`
- `Extra`: Should NOT show `Using filesort` (index is used for sorting)
- `rows`: Should be much smaller than total table size

### Monitor Slow Queries
```bash
# Check PM2 logs
pm2 logs dashboard | grep "Slow Query"

# Should see much fewer slow query warnings after optimization
```

## Additional Optimizations

### If Still Slow After Index

1. **Check Table Size**:
   ```sql
   SELECT COUNT(*) FROM orders;
   SELECT table_rows, data_length, index_length 
   FROM information_schema.tables 
   WHERE table_name = 'orders';
   ```

2. **Check Index Usage**:
   ```sql
   EXPLAIN SELECT * FROM orders WHERE 1=1 ORDER BY order_date DESC LIMIT 100;
   ```

3. **Update Statistics**:
   ```sql
   ANALYZE TABLE orders;
   OPTIMIZE TABLE orders;  -- Only if table is fragmented
   ```

4. **Consider Partitioning** (for very large tables):
   - Partition by date range
   - Only if table has millions of rows

## Configuration

### Default Date Range

The default 90-day filter can be adjusted in `backend/models/Order.js`:
```javascript
// Line ~258: Change 90 to desired days
defaultStartDate.setDate(defaultStartDate.getDate() - 90);
```

### Maximum Limit

The maximum limit (1000) can be adjusted in `backend/routes/orders.js`:
```javascript
// Line ~86: Change maxLimit
const maxLimit = 1000;
```

## Monitoring

### Enable Query Logging

Check slow query log in MySQL:
```sql
-- Check if slow query log is enabled
SHOW VARIABLES LIKE 'slow_query_log';

-- View slow queries
SELECT * FROM mysql.slow_log ORDER BY start_time DESC LIMIT 10;
```

### PM2 Logs

Monitor query performance:
```bash
pm2 logs dashboard --lines 100 | grep -E "Slow Query|Query executed"
```

## Troubleshooting

### Index Not Being Used

1. **Check MySQL Version**: DESC indexes require MySQL 8.0+
   ```sql
   SELECT VERSION();
   ```

2. **For MySQL < 8.0**: Use ASC index and reverse in application
   ```sql
   CREATE INDEX idx_order_date_id ON orders(order_date, id);
   -- Then use ORDER BY order_date DESC, id DESC in query
   ```

3. **Force Index Usage** (not recommended, but for testing):
   ```sql
   SELECT * FROM orders USE INDEX (idx_order_date_id_desc) 
   WHERE 1=1 ORDER BY order_date DESC LIMIT 100;
   ```

### Still Slow After Optimization

1. **Check for table locks**: `SHOW PROCESSLIST;`
2. **Check disk I/O**: `iostat -x 1`
3. **Check memory**: Ensure `innodb_buffer_pool_size` is adequate
4. **Consider query caching**: Enable MySQL query cache
5. **Add more specific indexes**: Based on actual query patterns

---

**Last Updated**: 2024
**Status**: Critical indexes added, query optimized
**Expected Improvement**: 30-100x faster

