// Data service to handle data loading from backend API (database only)
import { analyticsAPI, ordersAPI, importAPI, healthCheck, getAPIBaseURLWithoutPath } from './api';

// Check if backend is available
let useBackend = false;
let backendChecked = false;

const checkBackend = async (forceRefresh = false) => {
  if (backendChecked && !forceRefresh) return useBackend;
  
  try {
    // Try health check with shorter timeout and retries
    const response = await healthCheck();
    // Backend returns {status: "OK", ...} or {success: true, ...}
    // Accept either format
    if (response && (response.success === true || response.status === 'OK')) {
      useBackend = true;
      const apiUrl = getAPIBaseURLWithoutPath();
      console.log(`✅ Backend API connected at ${apiUrl} - using MySQL database`);
      backendChecked = true;
      return true;
    } else {
      useBackend = false;
      console.warn('⚠️ Backend health check failed - unexpected response:', response);
      backendChecked = true;
      return false;
    }
  } catch (error) {
    useBackend = false;
    const baseUrl = getAPIBaseURLWithoutPath();
    console.warn(`⚠️ Backend API not available at ${baseUrl}:`, error.message);
    console.warn('💡 Make sure backend is running. Check with: pm2 status or ./show-ports.sh');
    backendChecked = true;
    return false;
  }
};

// Force refresh backend check (useful after uploads)
export const refreshBackendCheck = () => {
  backendChecked = false;
  useBackend = false;
};

// Load data from database only (no local storage or Excel fallback)
// Accepts optional date range filters: { startDate, endDate, product, pincode }
export const loadData = async (forceRefresh = false, filters = {}) => {
  console.log('🔄 Starting data load from database...', filters);
  
  // Check backend availability - database is required
  const isBackendAvailable = await checkBackend(forceRefresh);
  
  if (!isBackendAvailable) {
    const baseUrl = getAPIBaseURLWithoutPath();
    throw new Error(
      `Backend server is not available at ${baseUrl}.\n\n` +
      `Please ensure:\n` +
      `1. Backend server is running:\n` +
      `   - With PM2: ./start.sh or pm2 start ecosystem.config.js --only dashboard\n` +
      `   - With npm: cd backend && npm start\n` +
      `   - Check status: pm2 status or ./show-ports.sh\n` +
      `2. Backend is accessible at: ${baseUrl}/api/health\n` +
      `3. Database connection is configured correctly in backend/.env\n` +
      `4. If using Nginx, ensure Nginx is running and configured properly`
    );
  }
  
  try {
    console.log('📡 Fetching data from MySQL database with filters:', filters);
    // Build query parameters for date filtering
    const queryParams = { limit: 1000000 };
    
    // Add date filters if provided (only if not empty)
    if (filters.startDate && filters.startDate.trim() !== '') {
      queryParams.startDate = filters.startDate;
      console.log('  ✓ startDate filter:', filters.startDate, '(type:', typeof filters.startDate, ')');
    } else {
      console.log('  ⚠️ No startDate filter provided');
    }
    if (filters.endDate && filters.endDate.trim() !== '') {
      queryParams.endDate = filters.endDate;
      console.log('  ✓ endDate filter:', filters.endDate, '(type:', typeof filters.endDate, ')');
    } else {
      console.log('  ⚠️ No endDate filter provided');
    }
    if (filters.product && filters.product.trim() !== '') {
      queryParams.product = filters.product;
      console.log('  ✓ product filter:', filters.product);
    }
    if (filters.products && filters.products.trim() !== '') {
      queryParams.products = filters.products;
      console.log('  ✓ products filter (multiple):', filters.products);
    }
    if (filters.pincode && filters.pincode.trim() !== '') {
      queryParams.pincode = filters.pincode;
      console.log('  ✓ pincode filter:', filters.pincode);
    }
    
    if (Object.keys(queryParams).length === 1) {
      console.log('  ℹ️  No filters applied - fetching all data (Lifetime)');
    }
    
    // Load from backend API with date range filters
    const response = await ordersAPI.getAll(queryParams);
    
    if (response && response.success && response.data) {
      if (Array.isArray(response.data) && response.data.length > 0) {
        // Transform backend data to match frontend format
        console.log(`📊 Transforming ${response.data.length} records from database...`);
        const transformedData = response.data.map(order => ({
          order_id: order.order_id,
          order_date: order.order_date ? new Date(order.order_date) : null,
          order_status: order.order_status || order.status,
          product: order.product_name || order.product,
          'Product Name': order.product_name || order.product,
          sku: order.sku,
          pincode: order.pincode,
          'Pincode': order.pincode,
          city: order.city,
          amount: order.order_value || order.amount,
          order_value: order.order_value || order.amount,
          payment_method: order.payment_method,
          fulfillment_partner: order.fulfillment_partner,
          'Fulfilled By': order.fulfillment_partner,
          quantity: order.quantity || 1
        }));
        
        console.log(`✅ Successfully loaded ${transformedData.length} orders from MySQL database`);
        return transformedData;
      } else {
        console.log('⚠️ Database is empty (0 records). Please upload data through the upload section.');
        // Return empty array if database is empty
        return [];
      }
    } else {
      console.warn('⚠️ Backend response format unexpected:', response);
      throw new Error('Invalid response format from backend');
    }
  } catch (error) {
    console.error('❌ Error loading from database:', error.message);
    const baseUrl = getAPIBaseURLWithoutPath();
    
    // Database is the single source of truth - no fallbacks
    let errorMessage = `Failed to fetch data from MySQL database: ${error.message}.\n\n`;
    errorMessage += `Please ensure:\n`;
    errorMessage += `1. Backend server is running at ${baseUrl}\n`;
    errorMessage += `   - Check with: pm2 status or ./show-ports.sh\n`;
    errorMessage += `   - Start with: ./start.sh or cd backend && npm start\n`;
    errorMessage += `2. Backend is accessible: ${baseUrl}/api/health\n`;
    errorMessage += `3. Database connection is configured correctly in backend/.env\n`;
    errorMessage += `4. Database has data (upload Excel file if needed)\n`;
    errorMessage += `5. If using Nginx, check Nginx configuration and status`;
    
    throw new Error(errorMessage);
  }
};

// Get KPIs from database only (no local calculation)
export const getKPIs = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch KPIs from database.');
  }
  
  try {
    console.log('📡 Fetching KPIs from database with filters:', JSON.stringify(filters, null, 2));
    const response = await analyticsAPI.getKPIs(filters);
    if (response && response.success && response.data) {
      console.log('✅ KPIs received from database:', {
        totalOrders: response.data.totalOrders,
        totalRevenue: response.data.totalRevenue,
        avgOrderValue: response.data.averageOrderValue,
        filters: filters
      });
      return {
        totalOrders: response.data.totalOrders || 0,
        totalRevenue: response.data.totalRevenue || 0,
        avgOrderValue: response.data.averageOrderValue || 0,
        topPincode: response.data.topPincode || 'N/A',
        topPincodeRatio: response.data.topPincodeRatio || 0,
        topPincodeDeliveredCount: response.data.topPincodeDeliveredCount || 0,
        totalRTO: response.data.totalRTO || 0,
        totalRTS: response.data.totalRTS || 0
      };
    } else {
      console.warn('⚠️ Backend returned unsuccessful response:', response);
      throw new Error('Invalid response format from backend');
    }
  } catch (error) {
    console.error('❌ Error fetching KPIs from database:', error);
    throw error;
  }
};

// Get order status distribution from database only
export const getOrderStatus = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch order status from database.');
  }
  
  try {
    const response = await analyticsAPI.getOrderStatus(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching order status from database:', error);
    throw error;
  }
};

// Get payment methods from database only
export const getPaymentMethods = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch payment methods from database.');
  }
  
  try {
    const response = await analyticsAPI.getPaymentMethods(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching payment methods from database:', error);
    throw error;
  }
};

// Get fulfillment partners from database only
export const getFulfillmentPartners = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch fulfillment partners from database.');
  }
  
  try {
    const response = await analyticsAPI.getFulfillmentPartners(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching fulfillment partners from database:', error);
    throw error;
  }
};

// Get top products from database only
export const getTopProducts = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch top products from database.');
  }
  
  try {
    const response = await analyticsAPI.getTopProducts(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching top products from database:', error);
    throw error;
  }
};

// Get top cities from database only
export const getTopCities = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch top cities from database.');
  }
  
  try {
    const response = await analyticsAPI.getTopCities(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching top cities from database:', error);
    throw error;
  }
};

// Get trends from database only
export const getTrends = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch trends from database.');
  }
  
  try {
    const response = await analyticsAPI.getTrends(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching trends from database:', error);
    throw error;
  }
};

// Get delivery ratio from database only
export const getDeliveryRatio = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch delivery ratio from database.');
  }
  
  try {
    const response = await analyticsAPI.getDeliveryRatio(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching delivery ratio from database:', error);
    throw error;
  }
};

// Get good and bad pincodes by product from database only
export const getGoodBadPincodes = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch good/bad pincodes from database.');
  }
  
  try {
    const response = await analyticsAPI.getGoodBadPincodes(filters);
    if (response && response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching good/bad pincodes from database:', error);
    throw error;
  }
};

// Get top NDR cities from database only
export const getTopNDRCities = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend server is not available. Cannot fetch top NDR cities from database.');
  }
  
  try {
    const response = await analyticsAPI.getTopNDRCities(filters);
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error('Invalid response format from backend');
  } catch (error) {
    console.error('Error fetching top NDR cities from database:', error);
    throw error;
  }
};

// Upload Excel file to backend
// Delete all orders from database
export const deleteAllOrders = async () => {
  const isBackendAvailable = await checkBackend();
  
  if (!isBackendAvailable) {
    throw new Error('Backend not available. Cannot delete orders.');
  }
  
  try {
    console.log('🗑️ Deleting all orders from database...');
    const response = await importAPI.clearAll();
    
    if (response && response.success) {
      console.log('✅ All orders deleted successfully:', response.message);
      return {
        success: true,
        message: response.message,
        deleted: response.data?.deleted || 0
      };
    } else {
      throw new Error(response?.error || 'Failed to delete orders');
    }
  } catch (error) {
    console.error('❌ Error deleting orders:', error);
    throw error;
  }
};

export const uploadExcelFile = async (file, clearExisting = false) => {
  try {
    const result = await importAPI.importExcel(file, clearExisting);
    if (result.success) {
      // Reset backend check to reload data
      backendChecked = false;
      return result;
    }
    throw new Error(result.error || 'Upload failed');
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Check if backend is being used
export const isUsingBackend = () => useBackend;

export default {
  loadData,
  getKPIs,
  getOrderStatus,
  getPaymentMethods,
  getFulfillmentPartners,
  getTopProducts,
  getTopCities,
  getTrends,
  getDeliveryRatio,
  uploadExcelFile,
  isUsingBackend
};

