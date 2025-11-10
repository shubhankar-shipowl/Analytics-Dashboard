// Data service to handle data loading from backend API or local Excel file
import { loadExcelData } from './dataProcessor';
import { analyticsAPI, ordersAPI, importAPI, healthCheck } from './api';

// Check if backend is available
let useBackend = false;
let backendChecked = false;

const checkBackend = async () => {
  if (backendChecked) return useBackend;
  
  try {
    await healthCheck();
    useBackend = true;
    console.log('✅ Backend API connected - using server data');
  } catch (error) {
    useBackend = false;
    console.log('⚠️ Backend API not available - using local Excel file');
  }
  backendChecked = true;
  return useBackend;
};

// Load data from backend or local file
export const loadData = async () => {
  const isBackendAvailable = await checkBackend();
  
  if (isBackendAvailable) {
    try {
      // Load from backend API
      const response = await ordersAPI.getAll({ limit: 10000 });
      if (response.success && response.data && Array.isArray(response.data) && response.data.length > 0) {
        // Transform backend data to match frontend format
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
        
        if (transformedData.length > 0) {
          console.log(`✅ Loaded ${transformedData.length} orders from backend`);
          return transformedData;
        }
      } else {
        console.log('⚠️ Backend returned empty data, falling back to local Excel file');
      }
    } catch (error) {
      console.error('Error loading from backend, falling back to local file:', error);
      useBackend = false;
    }
  }
  
  // Fallback to local Excel file
  console.log('📂 Loading data from local Excel file...');
  try {
    const excelData = await loadExcelData('/data/ForwardOrders-1762582722-21819 (1).xlsx');
    console.log(`✅ Loaded ${excelData.length} orders from Excel file`);
    return excelData;
  } catch (error) {
    console.error('Error loading Excel file:', error);
    // Try alternative path
    try {
      const excelData = await loadExcelData('/ForwardOrders-1762582722-21819 (1).xlsx');
      console.log(`✅ Loaded ${excelData.length} orders from Excel file (alternative path)`);
      return excelData;
    } catch (altError) {
      throw new Error(`Failed to load data: ${error.message}. Please ensure the Excel file exists in the public/data folder or upload it through the upload section.`);
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
          totalCOD: response.data.totalCOD || 0,
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

