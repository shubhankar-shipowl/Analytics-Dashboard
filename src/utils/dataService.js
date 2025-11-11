// Data service to handle data loading from backend API or local Excel file
import { loadExcelData } from './dataProcessor';
import { analyticsAPI, ordersAPI, importAPI, healthCheck } from './api';

// Check if backend is available
let useBackend = false;
let backendChecked = false;

const checkBackend = async (forceRefresh = false) => {
  if (backendChecked && !forceRefresh) return useBackend;
  
  try {
    const response = await healthCheck();
    if (response && response.success) {
      useBackend = true;
      console.log('✅ Backend API connected - using MySQL database');
      backendChecked = true;
      return true;
    } else {
      useBackend = false;
      console.log('⚠️ Backend health check failed');
      backendChecked = true;
      return false;
    }
  } catch (error) {
    useBackend = false;
    console.log('⚠️ Backend API not available:', error.message);
    backendChecked = true;
    return false;
  }
};

// Force refresh backend check (useful after uploads)
export const refreshBackendCheck = () => {
  backendChecked = false;
  useBackend = false;
};

// Load data from backend or local file
export const loadData = async (forceRefresh = false) => {
  console.log('🔄 Starting data load...');
  
  // Always try backend first - database is the primary source
  const isBackendAvailable = await checkBackend(forceRefresh);
  
  if (isBackendAvailable) {
    try {
      console.log('📡 Fetching data from MySQL database...');
      // Load from backend API - use a large limit to get all data
      // For very large datasets, consider implementing pagination
      const response = await ordersAPI.getAll({ limit: 1000000 });
      
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
      // NEVER fall back to Excel if backend is available
      // Database is the single source of truth
      throw new Error(
        `Failed to fetch data from MySQL database: ${error.message}. ` +
        `Please ensure:\n` +
        `1. Backend server is running (http://localhost:5000)\n` +
        `2. Database connection is configured correctly\n` +
        `3. Database has data (upload Excel file if needed)`
      );
    }
  }
  
  // Only fallback to local Excel file if backend is completely unavailable
  // This is for development/testing when backend is not running
  console.log('📂 Backend not available, loading data from local Excel file (fallback mode)...');
  console.log('⚠️ Note: For production, always use the backend with MySQL database.');
  try {
    const excelData = await loadExcelData('/data/ForwardOrders-1762582722-21819 (1).xlsx');
    console.log(`✅ Loaded ${excelData.length} orders from Excel file (fallback)`);
    return excelData;
  } catch (error) {
    console.error('Error loading Excel file:', error);
    // Try alternative path
    try {
      const excelData = await loadExcelData('/ForwardOrders-1762582722-21819 (1).xlsx');
      console.log(`✅ Loaded ${excelData.length} orders from Excel file (alternative path)`);
      return excelData;
    } catch (altError) {
      throw new Error(
        `Unable to load data:\n` +
        `- Backend is not available\n` +
        `- Excel file not found\n\n` +
        `Please:\n` +
        `1. Start the backend server: npm run dev\n` +
        `2. Or upload an Excel file through the upload section\n` +
        `3. Or ensure the Excel file exists in public/data/ folder`
      );
    }
  }
};

// Get KPIs from backend or calculate locally
export const getKPIs = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getKPIs(filters);
      if (response.success && response.data) {
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
      }
    } catch (error) {
      console.error('Error fetching KPIs from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Get order status distribution from backend or calculate locally
export const getOrderStatus = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getOrderStatus(filters);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching order status from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Get payment methods from backend or calculate locally
export const getPaymentMethods = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getPaymentMethods(filters);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching payment methods from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Get fulfillment partners from backend or calculate locally
export const getFulfillmentPartners = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getFulfillmentPartners(filters);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching fulfillment partners from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Get top products from backend or calculate locally
export const getTopProducts = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getTopProducts(filters);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching top products from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Get top cities from backend or calculate locally
export const getTopCities = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getTopCities(filters);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching top cities from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Get trends from backend or calculate locally
export const getTrends = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getTrends(filters);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching trends from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Get delivery ratio from backend or calculate locally
export const getDeliveryRatio = async (filters = {}) => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      const response = await analyticsAPI.getDeliveryRatio(filters);
      if (response.success && response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching delivery ratio from backend:', error);
    }
  }
  
  return null; // Will be calculated locally
};

// Upload Excel file to backend
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

