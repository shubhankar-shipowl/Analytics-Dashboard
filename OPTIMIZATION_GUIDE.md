# Database & Performance Optimization Guide

This document outlines all optimizations made to ensure the application runs smoothly on VPS using PM2.

## 🚀 Quick Start

### 1. Run Database Optimization
```bash
cd backend
npm run optimize:db
```

This will:
- Add composite indexes for common query patterns
- Update table statistics
- Show index usage summary

### 2. Start with PM2 (Production)
```bash
./start.sh
# or
pm2 start ecosystem.config.js --only dashboard --env production
```

## 📊 Database Optimizations

### Indexes Added

The following composite indexes have been added for optimal query performance:

1. **`idx_date_status_value`** - For date + status + value queries
2. **`idx_date_product`** - For date + product filtering
3. **`idx_date_pincode`** - For date + pincode filtering
4. **`idx_product_status`** - For product + status queries
5. **`idx_date_product_status`** - For complex analytics queries
6. **`idx_date_pincode_status`** - For pincode analytics
7. **`idx_partner_status_date`** - For fulfillment partner queries
8. **`idx_payment_date_status`** - For payment method analytics
9. **`idx_city_date`** - For city-based queries
10. **`idx_state_date`** - For state-based queries

### Query Optimizations

1. **Date Filtering**: Uses range comparisons (`>=` and `<`) instead of `DATE()` function for better index usage
2. **Status Matching**: Optimized status condition building
3. **Product Filtering**: Uses `IN` clause for multiple products instead of multiple `LIKE` queries
4. **Query Timeout**: All queries have 30-second timeout to prevent hanging
5. **Slow Query Logging**: Queries taking > 1 second are automatically logged

### Connection Pool Optimization

- **Connection Limit**: Increased to 30 (from 20) for VPS production
- **Connection Reuse**: Enabled for better performance
- **Query Timeout**: 30 seconds per query
- **Compression**: Enabled for large queries
- **Keep-Alive**: Enabled to maintain connections

## 🔧 Filter Logic Optimizations

### New Query Builder Utility

Created `backend/utils/queryBuilder.js` with reusable functions:

- `buildWhereClause()` - Optimized WHERE clause building
- `buildStatusCondition()` - Efficient status matching
- `buildGroupBy()` - GROUP BY clause builder
- `buildOrderBy()` - ORDER BY clause builder
- `buildLimit()` - LIMIT/OFFSET builder
- `extractFilters()` - Extract filters from request query

### Benefits

- Consistent query building across all routes
- Better index usage
- Reduced code duplication
- Easier maintenance

## 📈 Performance Monitoring

### Query Performance Tracking

- Automatic slow query detection (> 1 second)
- Query execution time logging
- Performance statistics tracking
- Automatic performance summary logging (every 5 minutes in production)

### Monitoring Tools

```bash
# View PM2 logs
pm2 logs dashboard

# Monitor PM2 processes
pm2 monit

# Check database pool stats (in code)
const { getPoolStats } = require('./config/database');
console.log(getPoolStats());
```

## 🖥️ PM2 Configuration for VPS

### Optimizations Applied

1. **Memory Management**:
   - Max memory restart: 2GB
   - Node memory limit: 2048MB
   - Optimize for size enabled

2. **Process Stability**:
   - Min uptime: 60 seconds (increased from 30s)
   - Max restarts: 10 (reduced to prevent loops)
   - Restart delay: 5 seconds (increased from 4s)
   - Exponential backoff enabled

3. **Performance**:
   - Source maps disabled
   - Tracing disabled
   - Connection reuse enabled
   - Optimized Node.js flags

4. **Logging**:
   - Structured logging with timestamps
   - Separate log files for out/error
   - Log rotation support

## 📝 Usage Examples

### Running Database Optimization

```bash
# From project root
cd backend
npm run optimize:db

# Or directly
node backend/scripts/optimize-database.js
```

### Checking Query Performance

```javascript
// In your code
const { getPoolStats } = require('./config/database');
const stats = getPoolStats();
console.log('Pool Stats:', stats);
```

### Using Query Builder

```javascript
const { buildWhereClause, extractFilters } = require('./utils/queryBuilder');

// Extract filters from request
const filters = extractFilters(req.query);

// Build WHERE clause
const params = [];
const whereClause = buildWhereClause(filters, params);

// Use in query
const sql = `SELECT * FROM orders ${whereClause} LIMIT 100`;
const results = await query(sql, params);
```

## 🎯 Best Practices

### Query Optimization

1. **Always use indexes**: Filter by indexed columns when possible
2. **Avoid functions on columns**: Use `order_date >= ?` instead of `DATE(order_date) = ?`
3. **Use IN for multiple values**: Prefer `IN (?, ?, ?)` over multiple `OR` conditions
4. **Limit result sets**: Always use `LIMIT` for large queries
5. **Monitor slow queries**: Check logs regularly for queries > 1 second

### PM2 Best Practices

1. **Use production mode**: `--env production` for VPS
2. **Monitor memory**: Check `pm2 monit` regularly
3. **Check logs**: Review logs for errors and slow queries
4. **Graceful restarts**: Use `pm2 reload` instead of `pm2 restart` when possible
5. **Save configuration**: Always run `pm2 save` after changes

### Database Best Practices

1. **Run optimization script**: After major data imports
2. **Update statistics**: Run `ANALYZE TABLE orders` periodically
3. **Monitor connections**: Check connection pool usage
4. **Index maintenance**: Review index usage with `EXPLAIN SELECT`
5. **Query timeout**: All queries have 30-second timeout

## 🔍 Troubleshooting

### Slow Queries

If you see slow query warnings:

1. Check the query in logs
2. Run `EXPLAIN SELECT ...` to see index usage
3. Verify indexes exist: `SHOW INDEX FROM orders`
4. Consider adding composite indexes for common patterns

### High Memory Usage

1. Check PM2 memory: `pm2 monit`
2. Review query results - are you fetching too much data?
3. Check for memory leaks in code
4. Consider increasing `max_memory_restart` if needed

### Connection Pool Exhaustion

1. Check pool stats: `getPoolStats()`
2. Review connection limit in `database.js`
3. Check for connection leaks (not releasing connections)
4. Increase `connectionLimit` if needed

## 📚 Additional Resources

- [MySQL Index Optimization](https://dev.mysql.com/doc/refman/8.0/en/optimization-indexes.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)

## ✅ Verification Checklist

Before deploying to VPS:

- [ ] Database optimization script run successfully
- [ ] All indexes created (check with `SHOW INDEX FROM orders`)
- [ ] PM2 configuration tested locally
- [ ] Query performance acceptable (< 1 second for most queries)
- [ ] Memory usage within limits
- [ ] Connection pool properly configured
- [ ] Logs are being written correctly
- [ ] Slow query logging working

---

**Last Updated**: 2024
**Version**: 1.0.0

