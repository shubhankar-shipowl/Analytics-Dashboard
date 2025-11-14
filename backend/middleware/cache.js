/**
 * Response Caching Middleware
 * Caches API responses to reduce database load and improve response times
 */

const NodeCache = require('node-cache');

// Create cache instance with 5 minute TTL by default
const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default TTL
  checkperiod: 60, // Check for expired keys every 60 seconds
  useClones: false, // Don't clone objects for better performance
  maxKeys: 1000 // Maximum number of keys in cache
});

/**
 * Generate cache key from request
 */
const generateCacheKey = (req) => {
  const { method, originalUrl, query } = req;
  const queryString = Object.keys(query)
    .sort()
    .map(key => `${key}=${query[key]}`)
    .join('&');
  return `${method}:${originalUrl}${queryString ? `?${queryString}` : ''}`;
};

/**
 * Cache middleware
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 */
const cacheMiddleware = (ttl = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = generateCacheKey(req);
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      // Set cache headers
      res.set('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      // Cache successful responses (status 200)
      if (res.statusCode === 200 && data) {
        cache.set(key, data, ttl);
        res.set('X-Cache', 'MISS');
      }
      return originalJson(data);
    };

    next();
  };
};

/**
 * Clear cache for specific pattern
 */
const clearCache = (pattern = null) => {
  if (!pattern) {
    cache.flushAll();
    return { cleared: 'all' };
  }

  const keys = cache.keys();
  const matchingKeys = keys.filter(key => key.includes(pattern));
  matchingKeys.forEach(key => cache.del(key));
  
  return { cleared: matchingKeys.length, keys: matchingKeys };
};

/**
 * Get cache statistics
 */
const getCacheStats = () => {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize
  };
};

module.exports = {
  cacheMiddleware,
  clearCache,
  getCacheStats,
  cache
};

