// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper function for API calls
const apiCall = async (endpoint, options = {}) => {
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

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || data.error || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
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

  // Get import history
  getHistory: (limit = 20, offset = 0) => {
    return apiCall(`/import/history?limit=${limit}&offset=${offset}`);
  },

  // Get import log by ID
  getHistoryById: (id) => apiCall(`/import/history/${id}`)
};

// Health check
export const healthCheck = () => apiCall('/health');

export default {
  ordersAPI,
  analyticsAPI,
  importAPI,
  healthCheck
};

