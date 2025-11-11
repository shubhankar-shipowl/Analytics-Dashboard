import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// Normalize column names - Enhanced to match your Excel file structure
export const normalizeColumnName = (colName) => {
  if (!colName) return colName;
  const lower = colName.toLowerCase().trim();
  
  // Order ID variations
  if ((lower.includes('order') && lower.includes('id')) || 
      lower.includes('orderid') || 
      lower.includes('order number') ||
      lower.includes('ordernumber')) return 'order_id';
  
  // Date variations
  if (lower.includes('date') || lower.includes('order date') || lower.includes('orderdate')) return 'order_date';
  
  // Amount/Revenue variations
  if (lower.includes('amount') || lower.includes('price') || 
      lower.includes('revenue') || lower.includes('value') || 
      lower.includes('total') || lower.includes('order value') ||
      lower.includes('order_value')) return 'amount';
  
  // Status variations
  if (lower.includes('status') || lower.includes('state') || 
      lower.includes('order status') || lower.includes('orderstatus')) return 'status';
  
  // Payment method variations
  if (lower.includes('payment') || lower.includes('cod') || 
      lower.includes('ppd') || lower.includes('payment method') ||
      lower.includes('paymentmethod') || lower.includes('payment type')) return 'payment_method';
  
  // City variations
  if (lower.includes('city') || lower.includes('ship city') || 
      lower.includes('delivery city')) return 'city';
  
  // Pincode variations
  if (lower.includes('pin') || lower.includes('zip') || 
      lower.includes('pincode') || lower.includes('pin code') ||
      lower.includes('postal')) return 'pincode';
  
  // Product variations - ONLY match "Product Name" column exactly
  // Do NOT match quantity, qty, amount, price, or other product-related columns
  if (lower === 'product name' || lower.trim() === 'product name') {
    return 'product';
  }
  // Check for "Product Name" variations (must include both "product" AND "name")
  if ((lower.includes('product') && lower.includes('name')) || lower.includes('productname')) {
    // Exclude quantity, qty, amount, price, cost, etc.
    if (!lower.includes('quantity') && !lower.includes('qty') && 
        !lower.includes('amount') && !lower.includes('price') && 
        !lower.includes('cost') && !lower.includes('value')) {
      return 'product';
    }
  }
  // SKU should be separate, not used for product name
  if (lower.includes('sku') || lower === 'sku') {
    return 'sku';
  }
  
  // Fulfillment partner variations - prioritize "fulfilled by"
  if (lower.includes('fulfilled by') || lower === 'fulfilled by' || lower.includes('fulfilledby')) {
    return 'fulfillment_partner';
  }
  if (lower.includes('fulfillment') || lower.includes('partner') || 
      lower.includes('vendor') || lower.includes('fulfillment partner') ||
      lower.includes('fulfillmentpartner') || lower.includes('carrier') ||
      lower.includes('shipping partner') || lower.includes('fulfilled')) {
    return 'fulfillment_partner';
  }
  
  return colName;
};

// Load and process Excel data
export const loadExcelData = async (filePath) => {
  try {
    const response = await fetch(filePath);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get the first sheet
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Convert to JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      defval: '', // Default value for empty cells
      raw: false // Get formatted values
    });
    
    if (jsonData.length === 0) {
      throw new Error('No data found in Excel file');
    }
    
    // Normalize column names
    const normalizedData = jsonData.map(row => {
      const normalized = {};
      Object.keys(row).forEach(key => {
        // Check for exact column name matches first (case-insensitive)
        // Only map "Product Name" to product, exclude quantity, qty, etc.
        let normalizedKey;
        const keyLower = key.toLowerCase().trim();
        
        // Exact "Product Name" match
        if (keyLower === 'product name') {
          normalizedKey = 'product';
        } 
        // Exact "Pincode" match
        else if (keyLower === 'pincode' || keyLower === 'pin code') {
          normalizedKey = 'pincode';
        }
        // Product Name variations (must include both "product" AND "name")
        else if (keyLower.includes('product') && keyLower.includes('name') && 
                   !keyLower.includes('quantity') && !keyLower.includes('qty') &&
                   !keyLower.includes('amount') && !keyLower.includes('price')) {
          // Only match if it's a product name variation, not quantity/price
          normalizedKey = 'product';
        } 
        // Use normalization function for other columns
        else {
          normalizedKey = normalizeColumnName(key);
        }
        normalized[normalizedKey] = row[key];
      });
      return normalized;
    });
    
    // Convert date strings to Date objects and parse numbers
    normalizedData.forEach(row => {
      // Handle date conversion
      if (row.order_date) {
        let dateValue = null;
        
        // Try to parse as date string first
        if (typeof row.order_date === 'string') {
          dateValue = new Date(row.order_date);
          // If invalid, try parsing Excel date format
          if (isNaN(dateValue.getTime())) {
            // Try common date formats
            const dateStr = row.order_date.trim();
            // Try DD/MM/YYYY or MM/DD/YYYY
            const parts = dateStr.split(/[/-]/);
            if (parts.length === 3) {
              // Assume DD/MM/YYYY format (common in India)
              dateValue = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
            }
          }
        } else if (typeof row.order_date === 'number') {
          // Excel date serial number (days since 1900-01-01)
          // Excel epoch starts on 1900-01-01, but Excel incorrectly treats 1900 as a leap year
          const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
          dateValue = new Date(excelEpoch.getTime() + row.order_date * 86400000);
        }
        
        if (dateValue && !isNaN(dateValue.getTime())) {
          row.order_date = dateValue;
        } else {
          // If still can't parse, set to null
          row.order_date = null;
        }
      }
      
      // Handle amount conversion
      if (row.amount) {
        // Remove currency symbols and commas
        const cleanAmount = String(row.amount).replace(/[₹,$,\s]/g, '');
        row.amount = parseFloat(cleanAmount) || 0;
      }
    });
    
    return normalizedData;
  } catch (error) {
    console.error('Error loading Excel:', error);
    throw error;
  }
};

// Load and process CSV data (keep for backward compatibility)
export const loadCSVData = async (filePath) => {
  try {
    const response = await fetch(filePath);
    const text = await response.text();
    
    return new Promise((resolve, reject) => {
      Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          let data = results.data;
          
          // Normalize column names
          if (data.length > 0) {
            const normalizedData = data.map(row => {
              const normalized = {};
              Object.keys(row).forEach(key => {
                const normalizedKey = normalizeColumnName(key);
                normalized[normalizedKey] = row[key];
              });
              return normalized;
            });
            
            // Convert date strings to Date objects
            normalizedData.forEach(row => {
              if (row.order_date) {
                row.order_date = new Date(row.order_date);
              }
              if (row.amount) {
                // Remove currency symbols and commas
                const cleanAmount = String(row.amount).replace(/[₹,$,\s]/g, '');
                row.amount = parseFloat(cleanAmount) || 0;
              }
            });
            
            resolve(normalizedData);
          } else {
            reject(new Error('No data found in CSV'));
          }
        },
        error: (error) => reject(error)
      });
    });
  } catch (error) {
    console.error('Error loading CSV:', error);
    throw error;
  }
};

// Filter data by date range
export const filterByDateRange = (data, range, customStartDate = null, customEndDate = null) => {
  if (!data || data.length === 0) return [];
  if (range === 'Lifetime') return data;

  const now = new Date();
  let startDate = new Date();
  let endDate = now;

  // Handle custom date range
  if (range === 'Custom' && customStartDate && customEndDate) {
    startDate = new Date(customStartDate);
    endDate = new Date(customEndDate);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
  } else {
    switch (range) {
      case 'Last 7 Days':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'Last 30 Days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'Yearly':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data;
    }
  }

  return data.filter(row => {
    if (!row.order_date) return false;
    
    let orderDate;
    if (row.order_date instanceof Date) {
      orderDate = row.order_date;
    } else {
      orderDate = new Date(row.order_date);
      // If date parsing fails, exclude the row
      if (isNaN(orderDate.getTime())) {
        return false;
      }
    }
    
    // Compare dates (ignore time for date-only comparisons)
    const orderDateOnly = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());
    const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
    return orderDateOnly >= startDateOnly && orderDateOnly <= endDateOnly;
  });
};

// Helper function to get status from row (handles both 'status' and 'order_status' fields)
const getStatus = (row) => {
  return row.status || row.order_status || '';
};

// Helper function to check if status counts as "delivered" (exactly "delivered" status, case-insensitive)
const isDeliveredStatus = (status) => {
  const statusLower = String(status || '').toLowerCase().trim();
  // Only match exact "delivered" status, not partial matches like "not delivered" or "undelivered"
  return statusLower === 'delivered';
};

// Helper function to check if an order is cancelled
const isCancelledStatus = (status) => {
  const statusLower = String(status || '').toLowerCase().trim();
  return statusLower === 'cancelled' || statusLower.includes('cancel');
};

// Helper function to check if status counts in total orders
// Total orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-I + RTO-II + RTO-Dispatched + RTO Pending + Lost + Delivered
const isCountedInTotalOrders = (status) => {
  const statusLower = String(status || '').toLowerCase().trim();
  
  // Exact matches
  if (statusLower === 'rts') return true;
  if (statusLower === 'rto') return true;
  if (statusLower === 'delivered') return true;
  if (statusLower === 'lost') return true;
  if (statusLower === 'ndr') return true;
  if (statusLower === 'dispatched') return true;
  
  // Partial matches for compound statuses
  if (statusLower.includes('rto-it') || statusLower.includes('rto it')) return true;
  if (statusLower.includes('rto-i') && !statusLower.includes('rto-it')) return true; // RTO-I (but not RTO-IT)
  if (statusLower.includes('rto-ii') || statusLower.includes('rto ii')) return true;
  if (statusLower.includes('rto-dispatched') || statusLower.includes('rto dispatched')) return true;
  if (statusLower.includes('rto pending') || statusLower.includes('rto-pending')) return true;
  
  // Exclude all other statuses (cancelled, booked, manifested, picked, in-transit, out for delivery, etc.)
  return false;
};

// Calculate KPIs
export const calculateKPIs = (data) => {
  if (!data || data.length === 0) {
    return {
      totalOrders: 0,
      totalRevenue: 0,
      avgOrderValue: 0,
      topPincode: 'N/A',
      topPincodeRatio: 0,
      totalRTO: 0,
      totalRTS: 0
    };
  }

  // Total orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-I + RTO-II + RTO-Dispatched + RTO Pending + Lost + Delivered
  const validOrders = data.filter(row => isCountedInTotalOrders(getStatus(row)));
  const totalOrders = validOrders.length;
  const totalRevenue = validOrders.reduce((sum, row) => sum + (parseFloat(row.amount) || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Get Top Pincode by Delivery Ratio
  const topPincodeData = getTopPincodeByDelivery(data);

  // Count RTO (Return to Origin) orders
  const totalRTO = data.filter(row => {
    const status = String(getStatus(row)).toLowerCase();
    return status.includes('rto') || status.includes('return') || status === 'rto';
  }).length;

  // Count RTS (Return to Sender) orders - only exact "RTS" status
  const totalRTS = data.filter(row => {
    const status = String(getStatus(row)).toLowerCase().trim();
    return status === 'rts';
  }).length;

  return {
    totalOrders,
    totalRevenue,
    avgOrderValue,
    topPincode: topPincodeData.pincode,
    topPincodeRatio: topPincodeData.ratio,
    topPincodeDeliveredCount: topPincodeData.deliveredCount,
    totalRTO,
    totalRTS
  };
};

// Calculate Delivery Ratio
// Delivery ratio = (delivered / total orders) * 100
// Total orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-Dispatched + RTO Pending + Lost + Delivered
export const getDeliveryRatio = (data) => {
  if (!data || data.length === 0) return { ratio: 0, deliveredCount: 0, totalOrders: 0 };

  // Total orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-I + RTO-II + RTO-Dispatched + RTO Pending + Lost + Delivered
  const totalOrders = data.filter(row => isCountedInTotalOrders(getStatus(row))).length;
  
  // Count only "delivered" status from valid orders
  const deliveredCount = data.filter(row => {
    const status = getStatus(row);
    return isCountedInTotalOrders(status) && isDeliveredStatus(status);
  }).length;

  const ratio = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;

  return {
    ratio: parseFloat(ratio.toFixed(2)),
    deliveredCount,
    totalOrders,
    percentage: parseFloat(ratio.toFixed(2))
  };
};

// Calculate Delivery Ratio by Fulfillment Partner
// Delivery ratio = (delivered / total orders) * 100 per partner
// Total orders = RTS + RTO + Dispatched + NDR + RTO-IT + RTO-Dispatched + RTO Pending + Lost + Delivered per partner
export const getDeliveryRatioByPartner = (data) => {
  if (!data || data.length === 0) return [];

  const partnerStats = {};
  
  data.forEach(row => {
    const status = getStatus(row);
    
    // Only count valid order statuses
    if (!isCountedInTotalOrders(status)) {
      return;
    }
    
    // Try multiple possible field names for fulfillment partner
    const partner = String(
      row.fulfillment_partner || 
      row['fulfilled by'] || 
      row.fulfilled_by ||
      row.fulfillmentPartner ||
      'Unknown'
    ).trim();
    
    if (!partnerStats[partner]) {
      partnerStats[partner] = {
        partner,
        totalOrders: 0,
        deliveredCount: 0,
        ratio: 0
      };
    }
    
    // Count all non-cancelled orders for this partner
    partnerStats[partner].totalOrders++;
    
    // Count delivered orders for this partner
    if (isDeliveredStatus(status)) {
      partnerStats[partner].deliveredCount++;
    }
  });

  // Calculate ratio for each partner
  return Object.values(partnerStats)
    .map(stat => ({
      ...stat,
      ratio: stat.totalOrders > 0 ? parseFloat(((stat.deliveredCount / stat.totalOrders) * 100).toFixed(2)) : 0,
      ratioValue: stat.totalOrders > 0 ? (stat.deliveredCount / stat.totalOrders) * 100 : 0
    }))
    .sort((a, b) => parseFloat(b.ratio) - parseFloat(a.ratio));
};

// Get Order Status Distribution
export const getOrderStatusDistribution = (data) => {
  if (!data || data.length === 0) return [];

  const statusCount = {};
  data.forEach(row => {
    const status = String(getStatus(row) || 'Unknown').trim();
    statusCount[status] = (statusCount[status] || 0) + 1;
  });

  const total = data.length;
  return Object.entries(statusCount)
    .map(([status, count]) => ({
      status,
      count,
      percentage: ((count / total) * 100).toFixed(2)
    }))
    .sort((a, b) => b.count - a.count);
};

// Get Payment Method Distribution (COD and PPD)
export const getPaymentMethodDistribution = (data) => {
  if (!data || data.length === 0) return [];

  const methodCount = { COD: 0, PPD: 0, Other: 0 };
  
  data.forEach(row => {
    const paymentMethod = String(row.payment_method || '').toLowerCase().trim();
    if (paymentMethod.includes('cod') || paymentMethod === 'cod') {
      methodCount.COD++;
    } else if (paymentMethod.includes('ppd') || paymentMethod === 'ppd' || paymentMethod.includes('prepaid')) {
      methodCount.PPD++;
    } else {
      methodCount.Other++;
    }
  });

  const total = data.length;
  return Object.entries(methodCount)
    .filter(([_, count]) => count > 0)
    .map(([method, count]) => ({
      method,
      count,
      percentage: ((count / total) * 100).toFixed(2)
    }))
    .sort((a, b) => b.count - a.count);
};

// Get Fulfillment Partner Analysis
export const getFulfillmentPartnerAnalysis = (data) => {
  if (!data || data.length === 0) return [];

  const partnerStats = {};
  
  data.forEach(row => {
    // Try multiple possible field names for fulfillment partner
    const partner = String(
      row.fulfillment_partner || 
      row['fulfilled by'] || 
      row.fulfilled_by ||
      row.fulfillmentPartner ||
      'Unknown'
    ).trim();
    if (!partnerStats[partner]) {
      partnerStats[partner] = { orders: 0, revenue: 0 };
    }
    partnerStats[partner].orders++;
    partnerStats[partner].revenue += parseFloat(row.amount) || 0;
  });

  return Object.entries(partnerStats)
    .map(([partner, stats]) => ({
      partner,
      orders: stats.orders,
      revenue: stats.revenue
    }))
    .sort((a, b) => b.orders - a.orders);
};

// Get Price Range Distribution
export const getPriceRangeDistribution = (data) => {
  if (!data || data.length === 0) return [];

  const ranges = [
    { label: '0-500', min: 0, max: 500, count: 0 },
    { label: '500-1000', min: 500, max: 1000, count: 0 },
    { label: '1000-2000', min: 1000, max: 2000, count: 0 },
    { label: '2000-5000', min: 2000, max: 5000, count: 0 },
    { label: '5000-10000', min: 5000, max: 10000, count: 0 },
    { label: '10000+', min: 10000, max: Infinity, count: 0 }
  ];

  data.forEach(row => {
    const amount = parseFloat(row.amount) || 0;
    for (const range of ranges) {
      if (amount >= range.min && amount < range.max) {
        range.count++;
        break;
      }
    }
  });

  return ranges.filter(range => range.count > 0);
};

// Get Daily Trend
export const getDailyTrend = (data, viewType = 'orders') => {
  if (!data || data.length === 0) return [];

  const dailyData = {};
  
  data.forEach(row => {
    if (!row.order_date) return;
    
    const date = row.order_date instanceof Date ? row.order_date : new Date(row.order_date);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = { date: dateKey, orders: 0, revenue: 0 };
    }
    
    dailyData[dateKey].orders++;
    dailyData[dateKey].revenue += parseFloat(row.amount) || 0;
  });

  return Object.values(dailyData)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      orders: item.orders,
      revenue: item.revenue
    }));
};

// Get Top Products
export const getTopProducts = (data, by = 'orders', limit = 10) => {
  if (!data || data.length === 0) return [];

  const productStats = {};
  
  data.forEach(row => {
    const product = String(row.product || 'Unknown').trim();
    if (!productStats[product]) {
      productStats[product] = { orders: 0, revenue: 0 };
    }
    productStats[product].orders++;
    productStats[product].revenue += parseFloat(row.amount) || 0;
  });

  return Object.entries(productStats)
    .map(([product, stats]) => ({
      product,
      orders: stats.orders,
      revenue: stats.revenue
    }))
    .sort((a, b) => (by === 'revenue' ? b.revenue - a.revenue : b.orders - a.orders))
    .slice(0, limit);
};

// Get Top Cities
export const getTopCities = (data, by = 'orders', limit = 10) => {
  if (!data || data.length === 0) return [];

  const cityStats = {};
  
  data.forEach(row => {
    const city = String(row.city || 'Unknown').trim();
    if (!cityStats[city]) {
      cityStats[city] = { orders: 0, revenue: 0 };
    }
    cityStats[city].orders++;
    cityStats[city].revenue += parseFloat(row.amount) || 0;
  });

  return Object.entries(cityStats)
    .map(([city, stats]) => ({
      city,
      orders: stats.orders,
      revenue: stats.revenue
    }))
    .sort((a, b) => (by === 'revenue' ? b.revenue - a.revenue : b.orders - a.orders))
    .slice(0, limit);
};

// Get Top Products by Pincode
export const getTopProductsByPincode = (data, pincode, limit = 10) => {
  if (!data || data.length === 0) return [];

  const filteredData = data.filter(row => {
    const rowPincode = row.pincode || row['Pincode'] || '';
    return String(rowPincode).trim() === String(pincode).trim();
  });
  return getTopProducts(filteredData, 'orders', limit);
};

// Get Top Pincode by Number of Delivered Orders
// Returns the pincode with the highest number of delivered orders
export const getTopPincodeByDelivery = (data) => {
  if (!data || data.length === 0) return { pincode: 'N/A', ratio: 0, deliveredCount: 0, totalOrders: 0 };

  const pincodeStats = {};
  
  data.forEach(row => {
    const status = getStatus(row);
    
    // Only count valid order statuses
    if (!isCountedInTotalOrders(status)) {
      return;
    }
    
    const pincode = String(row.pincode || row['Pincode'] || 'Unknown').trim();
    
    if (!pincodeStats[pincode]) {
      pincodeStats[pincode] = {
        pincode,
        totalOrders: 0,
        deliveredCount: 0,
        ratio: 0
      };
    }
    
    // Count all non-cancelled orders for this pincode
    pincodeStats[pincode].totalOrders++;
    
    // Count delivered orders for this pincode
    if (isDeliveredStatus(status)) {
      pincodeStats[pincode].deliveredCount++;
    }
  });

  // Sort by delivered count (highest first), then by total orders as tiebreaker
  const pincodesSorted = Object.values(pincodeStats)
    .filter(stat => stat.totalOrders > 0) // Only include pincodes with orders
    .sort((a, b) => {
      // Primary sort: by delivered count (descending)
      if (b.deliveredCount !== a.deliveredCount) {
        return b.deliveredCount - a.deliveredCount;
      }
      // Secondary sort: by total orders (descending) as tiebreaker
      return b.totalOrders - a.totalOrders;
    });

  if (pincodesSorted.length === 0) {
    return { pincode: 'N/A', ratio: 0, deliveredCount: 0, totalOrders: 0 };
  }

  const topPincode = pincodesSorted[0];
  // Calculate ratio for display
  const ratio = topPincode.totalOrders > 0 ? (topPincode.deliveredCount / topPincode.totalOrders) * 100 : 0;
  
  return {
    pincode: topPincode.pincode,
    ratio: parseFloat(ratio.toFixed(2)),
    deliveredCount: topPincode.deliveredCount,
    totalOrders: topPincode.totalOrders
  };
};