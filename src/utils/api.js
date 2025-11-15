// API configuration
// For VPS: Use environment variable, fallback to VPS URL if on VPS
const getAPIBaseURL = () => {
  // First, check environment variable (set by PM2 or build process)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if we're on VPS (window.location will be available in browser)
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If accessing via VPS domain, use VPS backend URL
    if (hostname.includes('srv512766.hstgr.cloud') || hostname.includes('hstgr.cloud')) {
      return 'http://srv512766.hstgr.cloud:5009/api';
    }
    // If accessing via IP address (89.116.21.112), use that IP for backend
    if (hostname === '89.116.21.112' || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `http://${hostname}:5009/api`;
    }
  }
  // Fallback to localhost for local development
  return 'http://localhost:5009/api';
};

const API_BASE_URL = getAPIBaseURL();

// Export function to get base URL without /api
export const getAPIBaseURLWithoutPath = () => {
  return API_BASE_URL.replace('/api', '');
};

// Log API URL for debugging (always log in browser)
if (typeof window !== 'undefined') {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('🌐 Current Hostname:', window.location.hostname);
  console.log('📋 Environment:', process.env.NODE_ENV);
  console.log('🔧 REACT_APP_API_URL:', process.env.REACT_APP_API_URL || 'not set');
}

// Create a fetch with timeout
const fetchWithTimeout = (url, options = {}, timeout = 10000) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout)
    )
  ]);
};

// Helper function for API calls with retry logic
const apiCall = async (endpoint, options = {}, retries = 2) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  // Use longer timeout for health checks
  const timeout = endpoint === '/health' ? 5000 : 10000;

  for (let attempt = 0; attempt <= retries; attempt++) {
  try {
      const response = await fetchWithTimeout(url, config, timeout);
    
    // Check if response is ok before trying to parse JSON
    if (!response.ok) {
      // Try to get error message from response
      let errorMessage = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.error || errorMessage;
      } catch (e) {
        // If JSON parsing fails, use status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    // Enhanced error logging
      if (error.name === 'TypeError' && error.message.includes('fetch') || 
          error.message.includes('timeout') ||
          error.message.includes('Failed to fetch')) {
        
        // Only retry on network errors, not on last attempt
        if (attempt < retries) {
          console.warn(`⚠️ Connection attempt ${attempt + 1} failed, retrying... (${retries - attempt} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Exponential backoff
          continue;
        }
        
        const apiUrl = API_BASE_URL.replace('/api', '');
        console.error('API Error: Network error - Backend server may not be running');
        console.error(`Attempted URL: ${url}`);
        console.error(`Backend should be running at: ${apiUrl}`);
        
        throw new Error(
          `Cannot connect to backend server at ${apiUrl}.\n\n` +
          `Please ensure:\n` +
          `1. Backend server is running (check with: pm2 status or ./show-ports.sh)\n` +
          `2. Backend is accessible at: ${apiUrl}\n` +
          `3. If using Nginx, check Nginx is running and configured correctly\n` +
          `4. Check firewall settings if accessing remotely`
        );
    }
      
      // For other errors, don't retry
    console.error('API Error:', error);
    throw error;
    }
  }
};

// Orders API
export const ordersAPI = {
  // Get all orders with filters
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/orders${queryString ? '?' + queryString : ''}`);
  },

  // Get single order
  getById: (id) => apiCall(`/orders/${id}`),

  // Create order
  create: (orderData) => apiCall('/orders', {
    method: 'POST',
    body: orderData
  }),

  // Update order
  update: (id, orderData) => apiCall(`/orders/${id}`, {
    method: 'PUT',
    body: orderData
  }),

  // Delete order
  delete: (id) => apiCall(`/orders/${id}`, {
    method: 'DELETE'
  })
};

// Analytics API
export const analyticsAPI = {
  // Get KPIs
  getKPIs: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/kpis${queryString ? '?' + queryString : ''}`);
  },

  // Get order status distribution
  getOrderStatus: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/order-status${queryString ? '?' + queryString : ''}`);
  },

  // Get payment methods
  getPaymentMethods: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/payment-methods${queryString ? '?' + queryString : ''}`);
  },

  // Get fulfillment partners
  getFulfillmentPartners: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/fulfillment-partners${queryString ? '?' + queryString : ''}`);
  },

  // Get top products
  getTopProducts: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/top-products${queryString ? '?' + queryString : ''}`);
  },

  // Get top cities
  getTopCities: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/top-cities${queryString ? '?' + queryString : ''}`);
  },

  // Get trends
  getTrends: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/trends${queryString ? '?' + queryString : ''}`);
  },

  // Get delivery ratio
  getDeliveryRatio: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/delivery-ratio${queryString ? '?' + queryString : ''}`);
  },

  // Get top NDR cities
  getTopNDRCities: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/top-ndr-cities${queryString ? '?' + queryString : ''}`);
  },

  // Get good and bad pincodes by product
  getGoodBadPincodes: (filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    });
    const queryString = params.toString();
    return apiCall(`/analytics/good-bad-pincodes${queryString ? '?' + queryString : ''}`);
  }
};

// Import API
export const importAPI = {
  // Import Excel file
  importExcel: async (file, clearExisting = false) => {
    const formData = new FormData();
    formData.append('file', file);
    // Send as string to ensure it's properly parsed
    formData.append('clearExisting', clearExisting ? 'true' : 'false');

    const response = await fetch(`${API_BASE_URL}/import/excel`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'Import failed');
    }

    return data;
  },

  // Delete all orders
  clearAll: () => apiCall('/import/clear', {
    method: 'DELETE'
  }),

  // Get import history
  getHistory: (limit = 20, offset = 0) => {
    return apiCall(`/import/history?limit=${limit}&offset=${offset}`);
  },

  // Get import log by ID
  getHistoryById: (id) => apiCall(`/import/history/${id}`)
};

// Health check with shorter timeout (to fail fast)
export const healthCheck = async () => {
  const url = `${API_BASE_URL}/health`;
  try {
    // Use shorter timeout for health checks (3 seconds) - no retries
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Health check timeout - backend may be slow or not responding');
    }
    throw error;
  }
};

export default {
  ordersAPI,
  analyticsAPI,
  importAPI,
  healthCheck
};

