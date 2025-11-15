import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './app.css';
import { 
    loadExcelData, 
    filterByDateRange, 
    calculateKPIs, 
    getOrderStatusDistribution,
    getDeliveryRatio,
    getDeliveryRatioByPartner,
    getFulfillmentPartnerAnalysis,
    getPriceRangeDistribution,
    getDailyTrend,
    getTopProducts,
    getTopCities,
    getTopProductsByPincode,
    getTopPincodeByDelivery,
    getTopNDRCities,
    getGoodBadPincodesByProduct,
    getPaymentMethodDistribution
  } from './utils/dataProcessor';
import { debounce } from './utils/debounce';
import { 
  loadData, 
  isUsingBackend, 
  refreshBackendCheck,
  getKPIs as fetchKPIs,
  getOrderStatus as fetchOrderStatus,
  getPaymentMethods as fetchPaymentMethods,
  getFulfillmentPartners as fetchFulfillmentPartners,
  getTopProducts as fetchTopProducts,
  getTopCities as fetchTopCities,
  getTrends as fetchTrends,
  getDeliveryRatio as fetchDeliveryRatio,
  getTopNDRCities as fetchTopNDRCities,
  getGoodBadPincodes as fetchGoodBadPincodes
} from './utils/dataService';
import { getAPIBaseURLWithoutPath } from './utils/api';
import KPISection from './components/KPISection';
import Filters from './components/Filters';
import FileUpload from './components/FileUpload';
// Lazy load chart components for code splitting and better performance
const OrderStatusChart = React.lazy(() => import('./components/OrderStatusChart'));
const FulfillmentPartnerChart = React.lazy(() => import('./components/FulfillmentPartnerChart'));
const PriceRangeChart = React.lazy(() => import('./components/PriceRangeChart'));
const TrendChart = React.lazy(() => import('./components/TrendChart'));
const TopProductsChart = React.lazy(() => import('./components/TopProductsChart'));
const TopCitiesChart = React.lazy(() => import('./components/TopCitiesChart'));
const TopNDRCitiesChart = React.lazy(() => import('./components/TopNDRCitiesChart'));
const GoodBadPincodesChart = React.lazy(() => import('./components/GoodBadPincodesChart'));
const PaymentMethodChart = React.lazy(() => import('./components/PaymentMethodChart'));

function App() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [backendConnected, setBackendConnected] = useState(false);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('Lifetime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [productFilter, setProductFilter] = useState([]); // Changed to array for multi-select
  const [pincodeFilter, setPincodeFilter] = useState('All');
  const [trendViewType, setTrendViewType] = useState('orders');
  const [productViewType, setProductViewType] = useState('orders');
  const [cityViewType, setCityViewType] = useState('orders');
  const [citySortDirection, setCitySortDirection] = useState('top'); // 'top' or 'bottom'
  
  // KPIs and Charts Data
  const [kpis, setKpis] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    topPincode: 'N/A',
    topPincodeRatio: 0,
    topPincodeDeliveredCount: 0,
    totalRTO: 0,
    totalRTS: 0
  });

  // Chart data states
  const [orderStatusData, setOrderStatusData] = useState([]);
  const [deliveryRatioData, setDeliveryRatioData] = useState({ ratio: 0, deliveredCount: 0, totalOrders: 0 });
  const [deliveryRatioByPartnerData, setDeliveryRatioByPartnerData] = useState([]);
  const [fulfillmentPartnerData, setFulfillmentPartnerData] = useState([]);
  const [priceRangeData, setPriceRangeData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [topCitiesData, setTopCitiesData] = useState([]);
  const [topProductsByPincodeData, setTopProductsByPincodeData] = useState([]);
  const [topNDRCitiesData, setTopNDRCitiesData] = useState([]);
  const [goodBadPincodesData, setGoodBadPincodesData] = useState({ good: [], bad: [] });
  const [paymentMethodData, setPaymentMethodData] = useState([]);

  // Helper function to format date as YYYY-MM-DD for SQL (using local time, not UTC)
  const formatDateForSQL = React.useCallback((date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Build date filters for data loading - memoized to prevent unnecessary recalculations
  const getDateFilters = React.useCallback(() => {
    const filters = {};
    
    if (dateFilter !== 'Lifetime') {
      if (dateFilter === 'Custom' && customStartDate && customEndDate) {
        // Ensure custom dates are in YYYY-MM-DD format
        filters.startDate = customStartDate.includes('T') ? customStartDate.split('T')[0] : customStartDate;
        filters.endDate = customEndDate.includes('T') ? customEndDate.split('T')[0] : customEndDate;
      } else {
        // Calculate date range for other filters
        const today = new Date();
        // Set to local midnight to avoid timezone issues
        today.setHours(0, 0, 0, 0);
        let startDate = new Date();
        
        switch (dateFilter) {
          case 'Today':
            startDate = new Date(today);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Last 7 Days':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6); // -6 to get 7 days including today
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Last 30 Days':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 29); // -29 to get 30 days including today
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Last 90 Days':
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 89); // -89 to get 90 days including today
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'This Month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Last Month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            endDate.setHours(23, 59, 59, 999);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(endDate);
            break;
          case 'This Year':
            startDate = new Date(today.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Yearly':
            startDate = new Date(today);
            startDate.setFullYear(today.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          default:
            break;
        }
      }
    }
    
    const todayForLog = new Date();
    todayForLog.setHours(0, 0, 0, 0);
    console.log('📅 Date filters calculated:', { 
      dateFilter, 
      TODAY: formatDateForSQL(todayForLog),
      filters, 
      timestamp: new Date().toISOString() 
    });
    return filters;
  }, [dateFilter, customStartDate, customEndDate, formatDateForSQL]);

  // Track if this is the initial load
  const isInitialLoadRef = React.useRef(true);

  useEffect(() => {
    // Load data from backend API or local Excel file with date filters
    const fetchData = async () => {
      try {
        // Only show full-page loader on initial load, use refreshing state for filter changes
        if (isInitialLoadRef.current) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }
        setError(null); // Clear any previous errors
        const dateFilters = getDateFilters();
        console.log('📅 Loading data with date filters:', { dateFilter, dateFilters });
        
        // Check backend status before loading
        const wasBackendAvailable = isUsingBackend();
        const loadedData = await loadData(false, dateFilters);
        const isBackendAvailable = isUsingBackend();
        
        // Update backend connection status
        setBackendConnected(isBackendAvailable);
        
        // Log if backend status changed
        if (wasBackendAvailable !== isBackendAvailable) {
          console.log(`🔄 Backend status changed: ${wasBackendAvailable} → ${isBackendAvailable}`);
        }
        
        console.log(`✅ Loaded ${loadedData.length} records with date filter: ${dateFilter}`);
        setData(loadedData);
        if (isInitialLoadRef.current) {
          setLoading(false);
          isInitialLoadRef.current = false;
        } else {
          setRefreshing(false);
        }
      } catch (err) {
        // Check backend status even on error
        const isBackendAvailable = isUsingBackend();
        setBackendConnected(isBackendAvailable);
        
        setError(err.message);
        setLoading(false);
        setRefreshing(false);
        isInitialLoadRef.current = false;
        console.error('❌ Error loading data:', err);
      }
    };
    
    fetchData();
  }, [dateFilter, customStartDate, customEndDate, getDateFilters]);

  // Handle file upload success
  const handleUploadSuccess = async (result) => {
    try {
      setRefreshing(true);
      setError(null);
      
      // Force refresh backend check and reload data after successful upload
      // Add a small delay to ensure database has finished processing all batches
      console.log('🔄 Refreshing dashboard with new data...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      refreshBackendCheck();
      // Reload with current date filters
      const dateFilters = getDateFilters();
      const loadedData = await loadData(true, dateFilters);
      
      // Update backend connection status after reload
      const isBackendAvailable = isUsingBackend();
      setBackendConnected(isBackendAvailable);
      
      if (loadedData && loadedData.length > 0) {
        setData(loadedData);
        console.log(`✅ Dashboard refreshed with ${loadedData.length} records`);
        isInitialLoadRef.current = false; // Mark as no longer initial load
      } else {
        console.warn('⚠️ No data loaded after upload');
        // Still set empty array to clear old data
        setData([]);
      }
      
      setRefreshing(false);
    } catch (err) {
      // Update backend status even on error
      const isBackendAvailable = isUsingBackend();
      setBackendConnected(isBackendAvailable);
      
      console.error('Error reloading data after upload:', err);
      setError('Failed to refresh dashboard. Please reload the page.');
      setRefreshing(false);
    }
  };

  const handleUploadError = (error) => {
    console.error('Upload error:', error);
  };

  useEffect(() => {
    if (!data || data.length === 0) {
      setFilteredData([]);
      return;
    }

    // Data is already filtered by date range from backend API
    // Only apply product and pincode filters locally
    let filtered = [...data];

    // Apply product filter (supports multiple products)
    if (productFilter && productFilter.length > 0) {
      filtered = filtered.filter(row => {
        const rowProduct = row.product || row['Product Name'] || '';
        const productStr = String(rowProduct).trim();
        return productFilter.some(filterProduct => 
          String(filterProduct).trim() === productStr
        );
      });
    }

    // Apply pincode filter
    if (pincodeFilter !== 'All' && pincodeFilter !== '') {
      filtered = filtered.filter(row => {
        const rowPincode = row.pincode || row['Pincode'] || '';
        return String(rowPincode).trim() === String(pincodeFilter).trim();
      });
    }

    console.log(`📊 Filtered data: ${filtered.length} rows (from ${data.length} total after date filter)`);
    
    // Debug: Check status distribution
    const statusCounts = {};
    filtered.forEach(row => {
      const status = row.status || row.order_status || row.Status || row.orderStatus || '';
      if (status) {
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
    });
    console.log('📊 Status distribution in filtered data:', statusCounts);

    setFilteredData(filtered);
  }, [data, productFilter, pincodeFilter]);

  // Helper function to build filter object for API calls - memoized to ensure latest values
  const buildFilters = React.useCallback(() => {
    const filters = {};
    
    // Date filters
    if (dateFilter !== 'Lifetime') {
      if (dateFilter === 'Custom' && customStartDate && customEndDate) {
        // Ensure custom dates are in YYYY-MM-DD format
        filters.startDate = customStartDate.includes('T') ? customStartDate.split('T')[0] : customStartDate;
        filters.endDate = customEndDate.includes('T') ? customEndDate.split('T')[0] : customEndDate;
      } else {
        // Calculate date range for other filters using local time (same as getDateFilters)
        const today = new Date();
        // Set to local midnight to avoid timezone issues
        today.setHours(0, 0, 0, 0);
        let startDate = new Date();
        
        switch (dateFilter) {
          case 'Today':
            startDate = new Date(today);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Last 7 Days':
            // Last 7 Days: 7 days back from today (inclusive of today)
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 6); // -6 to get 7 days including today
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            console.log(`📅 Last 7 Days: Comparing from TODAY (${formatDateForSQL(today)}) back to ${formatDateForSQL(startDate)}`);
            break;
          case 'Last 30 Days':
            // Last 30 Days: 30 days back from today (inclusive of today)
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 29); // -29 to get 30 days including today
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Last 90 Days':
            // Last 90 Days: 90 days back from today (inclusive of today)
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 89); // -89 to get 90 days including today
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'This Month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Last Month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            endDate.setHours(23, 59, 59, 999);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(endDate);
            break;
          case 'This Year':
            startDate = new Date(today.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          case 'Yearly':
            // Yearly means last 12 months
            startDate = new Date(today);
            startDate.setFullYear(today.getFullYear() - 1);
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = formatDateForSQL(startDate);
            filters.endDate = formatDateForSQL(today);
            break;
          default:
            break;
        }
      }
    }
    
    // Product filter (supports multiple products)
    if (productFilter && productFilter.length > 0) {
      // Send as comma-separated string for backend, or handle as array
      filters.products = productFilter.join(','); // Use 'products' for multiple
    }
    
    // Pincode filter
    if (pincodeFilter !== 'All' && pincodeFilter !== '') {
      filters.pincode = pincodeFilter;
    }
    
    const todayForLog = new Date();
    todayForLog.setHours(0, 0, 0, 0);
    console.log('🔍 buildFilters() called with dateFilter:', dateFilter, 'TODAY:', formatDateForSQL(todayForLog), 'result:', filters);
    return filters;
  }, [dateFilter, customStartDate, customEndDate, productFilter, pincodeFilter, formatDateForSQL]);

  // Memoized fetch analytics function
  const fetchAnalytics = useCallback(async () => {
      if (!isUsingBackend()) {
        // Fallback to local calculations
    if (filteredData.length === 0) return;

    const calculatedKPIs = calculateKPIs(filteredData);
        // Ensure all KPIs including topPincodeDeliveredCount are set
        setKpis({
          totalOrders: calculatedKPIs.totalOrders,
          totalRevenue: calculatedKPIs.totalRevenue,
          avgOrderValue: calculatedKPIs.avgOrderValue,
          topPincode: calculatedKPIs.topPincode,
          topPincodeRatio: calculatedKPIs.topPincodeRatio,
          topPincodeDeliveredCount: calculatedKPIs.topPincodeDeliveredCount || 0,
          totalRTO: calculatedKPIs.totalRTO,
          totalRTS: calculatedKPIs.totalRTS,
        });
        setOrderStatusData(getOrderStatusDistribution(filteredData));
        setDeliveryRatioData(getDeliveryRatio(filteredData));
        setDeliveryRatioByPartnerData(getDeliveryRatioByPartner(filteredData));
        setFulfillmentPartnerData(getFulfillmentPartnerAnalysis(filteredData));
        setPriceRangeData(getPriceRangeDistribution(filteredData));
        setTrendData(getDailyTrend(filteredData, trendViewType));
        setTopProductsData(getTopProducts(filteredData, productViewType));
        setTopCitiesData(getTopCities(filteredData, cityViewType, 10, citySortDirection));
        setTopProductsByPincodeData(pincodeFilter !== 'All' ? getTopProductsByPincode(filteredData, pincodeFilter) : []);
        setTopNDRCitiesData(getTopNDRCities(filteredData, 10));
        const localGoodBad = getGoodBadPincodesByProduct(filteredData, productFilter && productFilter.length > 0 ? productFilter[0] : null);
        console.log('✅ Good/Bad Pincodes from local (no backend):', { good: localGoodBad.good?.length || 0, bad: localGoodBad.bad?.length || 0 });
        setGoodBadPincodesData(localGoodBad);
        
        // Local payment method calculation
        const localPaymentMethods = getPaymentMethodDistribution(filteredData);
        setPaymentMethodData(localPaymentMethods);
        return;
      }

      // Fetch from backend APIs
      try {
        const filters = buildFilters();
        console.log('📊 Fetching analytics with filters (dateFilter:', dateFilter, '):', filters);
        
        // Fetch KPIs
        try {
          const kpisData = await fetchKPIs(filters);
          if (kpisData) {
            console.log('✅ Using KPIs from backend:', kpisData);
            setKpis(kpisData);
          } else {
            console.warn('⚠️ Backend returned null, falling back to local calculation');
            if (filteredData.length > 0) {
              const calculatedKPIs = calculateKPIs(filteredData);
              console.log('📊 Using locally calculated KPIs:', calculatedKPIs);
              setKpis({
                totalOrders: calculatedKPIs.totalOrders,
                totalRevenue: calculatedKPIs.totalRevenue,
                avgOrderValue: calculatedKPIs.avgOrderValue,
                topPincode: calculatedKPIs.topPincode,
                topPincodeRatio: calculatedKPIs.topPincodeRatio,
                topPincodeDeliveredCount: calculatedKPIs.topPincodeDeliveredCount || 0,
                totalRTO: calculatedKPIs.totalRTO,
                totalRTS: calculatedKPIs.totalRTS,
              });
            }
          }
        } catch (error) {
          console.error('❌ Error fetching KPIs, using local calculation:', error);
          if (filteredData.length > 0) {
            const calculatedKPIs = calculateKPIs(filteredData);
            setKpis({
              totalOrders: calculatedKPIs.totalOrders,
              totalRevenue: calculatedKPIs.totalRevenue,
              avgOrderValue: calculatedKPIs.avgOrderValue,
              topPincode: calculatedKPIs.topPincode,
              topPincodeRatio: calculatedKPIs.topPincodeRatio,
              topPincodeDeliveredCount: calculatedKPIs.topPincodeDeliveredCount || 0,
              totalRTO: calculatedKPIs.totalRTO,
              totalRTS: calculatedKPIs.totalRTS,
            });
          }
        }

        // Fetch order status
        const orderStatus = await fetchOrderStatus(filters);
        if (orderStatus && Array.isArray(orderStatus) && orderStatus.length > 0) {
          setOrderStatusData(orderStatus);
        } else if (filteredData.length > 0) {
          setOrderStatusData(getOrderStatusDistribution(filteredData));
        } else {
          setOrderStatusData([]);
        }

        // Fetch payment methods
        try {
          const paymentMethods = await fetchPaymentMethods(filters);
          if (paymentMethods && Array.isArray(paymentMethods) && paymentMethods.length > 0) {
            setPaymentMethodData(paymentMethods);
          } else {
            setPaymentMethodData([]);
          }
        } catch (error) {
          console.error('Error fetching payment methods:', error);
          setPaymentMethodData([]);
        }

        // Fetch delivery ratio
        const deliveryRatio = await fetchDeliveryRatio(filters);
        if (deliveryRatio && Array.isArray(deliveryRatio) && deliveryRatio.length > 0) {
          // Backend returns array of partners with ratios
          // Ensure all numeric values are properly parsed
          const formattedDeliveryRatio = deliveryRatio.map(item => ({
            ...item,
            totalOrders: parseInt(item.totalOrders || 0, 10),
            deliveredCount: parseInt(item.deliveredCount || 0, 10),
            ratio: parseFloat(item.ratio || 0)
          }));
          setDeliveryRatioByPartnerData(formattedDeliveryRatio);
          
          // Calculate overall delivery ratio - ensure values are numbers, not strings
          const totalOrders = formattedDeliveryRatio.reduce((sum, item) => {
            const orders = parseInt(item.totalOrders || 0, 10);
            return sum + (isNaN(orders) ? 0 : orders);
          }, 0);
          const deliveredCount = formattedDeliveryRatio.reduce((sum, item) => {
            const delivered = parseInt(item.deliveredCount || 0, 10);
            return sum + (isNaN(delivered) ? 0 : delivered);
          }, 0);
          const overallRatio = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
          setDeliveryRatioData({ 
            ratio: parseFloat(overallRatio.toFixed(2)), 
            deliveredCount: parseInt(deliveredCount, 10), 
            totalOrders: parseInt(totalOrders, 10)
          });
        } else if (filteredData.length > 0) {
          const localDeliveryRatio = getDeliveryRatio(filteredData);
          const localDeliveryRatioByPartner = getDeliveryRatioByPartner(filteredData);
          setDeliveryRatioData(localDeliveryRatio);
          setDeliveryRatioByPartnerData(localDeliveryRatioByPartner);
        } else {
          setDeliveryRatioData({ ratio: 0, deliveredCount: 0, totalOrders: 0 });
          setDeliveryRatioByPartnerData([]);
        }


        // Fetch fulfillment partners
        const fulfillmentPartners = await fetchFulfillmentPartners(filters);
        if (fulfillmentPartners) {
          setFulfillmentPartnerData(fulfillmentPartners);
        } else if (filteredData.length > 0) {
          setFulfillmentPartnerData(getFulfillmentPartnerAnalysis(filteredData));
        }

        // Fetch trends - ensure all filters are applied
        const trendFilters = { 
          ...filters, 
          view: trendViewType 
        };
        console.log('📈 Fetching trends with filters:', trendFilters);
        try {
          const trends = await fetchTrends(trendFilters);
          if (trends && Array.isArray(trends) && trends.length > 0) {
            console.log('✅ Trends from backend:', trends.length, 'data points');
            console.log('Sample trend data:', trends.slice(0, 3));
            setTrendData(trends);
          } else if (filteredData.length > 0) {
            console.log('⚠️ No trends from backend, using local calculation');
            setTrendData(getDailyTrend(filteredData, trendViewType));
          } else {
            console.log('⚠️ No trend data available');
            setTrendData([]);
          }
        } catch (trendError) {
          console.error('❌ Error fetching trends:', trendError);
          // Fallback to local calculation if available
          if (filteredData.length > 0) {
            console.log('📊 Using local trend calculation as fallback');
            setTrendData(getDailyTrend(filteredData, trendViewType));
          } else {
            setTrendData([]);
          }
        }

        // Fetch top products
        const topProducts = await fetchTopProducts({ ...filters, by: productViewType, limit: 10 });
        if (topProducts) {
          setTopProductsData(topProducts);
        } else if (filteredData.length > 0) {
          setTopProductsData(getTopProducts(filteredData, productViewType));
        }

        // Fetch top cities
        const topCities = await fetchTopCities({ ...filters, by: cityViewType, limit: 10, sort: citySortDirection });
        if (topCities) {
          setTopCitiesData(topCities);
        } else if (filteredData.length > 0) {
          setTopCitiesData(getTopCities(filteredData, cityViewType, 10, citySortDirection));
        }

        // Fetch top NDR cities (include pincode filter if selected)
        const topNDRCitiesFilters = { ...filters, limit: 10 };
        if (pincodeFilter !== 'All' && pincodeFilter !== '') {
          topNDRCitiesFilters.pincode = pincodeFilter;
        }
        const topNDRCities = await fetchTopNDRCities(topNDRCitiesFilters);
        if (topNDRCities) {
          setTopNDRCitiesData(topNDRCities);
        } else if (filteredData.length > 0) {
          setTopNDRCitiesData(getTopNDRCities(filteredData, 10));
        }

        // Fetch good/bad pincodes by product
        try {
          const goodBadPincodes = await fetchGoodBadPincodes(filters);
          if (goodBadPincodes && (goodBadPincodes.good || goodBadPincodes.bad)) {
            console.log('✅ Good/Bad Pincodes from backend:', { good: goodBadPincodes.good?.length || 0, bad: goodBadPincodes.bad?.length || 0 });
            setGoodBadPincodesData(goodBadPincodes);
          } else if (filteredData.length > 0) {
            console.log('⚠️ Backend returned no data, using local calculation');
            const localGoodBad = getGoodBadPincodesByProduct(filteredData, productFilter && productFilter.length > 0 ? productFilter[0] : null);
            console.log('✅ Good/Bad Pincodes from local:', { good: localGoodBad.good?.length || 0, bad: localGoodBad.bad?.length || 0 });
            setGoodBadPincodesData(localGoodBad);
          } else {
            console.log('⚠️ No filtered data available for good/bad pincodes');
            setGoodBadPincodesData({ good: [], bad: [] });
          }
        } catch (error) {
          console.error('❌ Error fetching good/bad pincodes:', error);
          if (filteredData.length > 0) {
            console.log('⚠️ Using local calculation as fallback');
            const localGoodBad = getGoodBadPincodesByProduct(filteredData, productFilter && productFilter.length > 0 ? productFilter[0] : null);
            console.log('✅ Good/Bad Pincodes from local fallback:', { good: localGoodBad.good?.length || 0, bad: localGoodBad.bad?.length || 0 });
            setGoodBadPincodesData(localGoodBad);
          } else {
            setGoodBadPincodesData({ good: [], bad: [] });
          }
        }

        // Fetch top products by pincode
        if (pincodeFilter !== 'All') {
          const topProductsByPincode = await fetchTopProducts({ ...filters, limit: 10 });
          if (topProductsByPincode) {
            setTopProductsByPincodeData(topProductsByPincode);
          } else if (filteredData.length > 0) {
            setTopProductsByPincodeData(getTopProductsByPincode(filteredData, pincodeFilter));
          }
        } else {
          setTopProductsByPincodeData([]);
        }

        // Price range is calculated locally (not in backend API)
        if (filteredData.length > 0) {
          setPriceRangeData(getPriceRangeDistribution(filteredData));
        }
      } catch (error) {
        console.error('Error fetching analytics from backend:', error);
        // Fallback to local calculations
        if (filteredData.length > 0) {
          const calculatedKPIs = calculateKPIs(filteredData);
          setKpis({
            totalOrders: calculatedKPIs.totalOrders,
            totalRevenue: calculatedKPIs.totalRevenue,
            avgOrderValue: calculatedKPIs.avgOrderValue,
            topPincode: calculatedKPIs.topPincode,
            topPincodeRatio: calculatedKPIs.topPincodeRatio,
            topPincodeDeliveredCount: calculatedKPIs.topPincodeDeliveredCount || 0,
            totalRTO: calculatedKPIs.totalRTO,
            totalRTS: calculatedKPIs.totalRTS,
          });
          setOrderStatusData(getOrderStatusDistribution(filteredData));
          setDeliveryRatioData(getDeliveryRatio(filteredData));
          setDeliveryRatioByPartnerData(getDeliveryRatioByPartner(filteredData));
          setFulfillmentPartnerData(getFulfillmentPartnerAnalysis(filteredData));
          setPriceRangeData(getPriceRangeDistribution(filteredData));
          setTrendData(getDailyTrend(filteredData, trendViewType));
          setTopProductsData(getTopProducts(filteredData, productViewType));
          setTopCitiesData(getTopCities(filteredData, cityViewType, 10, citySortDirection));
          setTopProductsByPincodeData(pincodeFilter !== 'All' ? getTopProductsByPincode(filteredData, pincodeFilter) : []);
          setTopNDRCitiesData(getTopNDRCities(filteredData, 10));
        }
      }
  }, [filteredData, buildFilters, dateFilter, customStartDate, customEndDate, productFilter, pincodeFilter, trendViewType, productViewType, cityViewType, citySortDirection, isUsingBackend]);

  // Debounced version of fetchAnalytics - delays API calls by 500ms
  const debouncedFetchAnalytics = useMemo(
    () => debounce(() => {
      fetchAnalytics();
    }, 500),
    [fetchAnalytics]
  );

  // Call debounced fetch when filters change
  useEffect(() => {
    debouncedFetchAnalytics();
  }, [debouncedFetchAnalytics]);

  // Get filtered data for extracting unique values (data is already date-filtered from backend)
  const dataForFilterOptions = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    // Apply product filter (if selected) - date filter already applied by backend
    if (productFilter && productFilter.length > 0) {
      filtered = filtered.filter(row => {
        const rowProduct = row.product || row['Product Name'] || '';
        const productStr = String(rowProduct).trim();
        return productFilter.some(filterProduct => 
          String(filterProduct).trim() === productStr
        );
      });
    }
    
    return filtered;
  }, [data, productFilter]);

  // Get unique products for filter dropdown (data is already date-filtered from backend)
  const uniqueProducts = React.useMemo(() => {
    const products = new Set();
    
    // Data is already filtered by date from backend, no need to filter again
    data.forEach(row => {
      // Extract product from multiple possible field names
      const product = row.product || row['Product Name'] || '';
      if (product && String(product).trim()) {
        products.add(String(product).trim());
      }
    });
    return Array.from(products).sort();
  }, [data]);

  // Get unique pincodes for filter dropdown (filtered by date AND product)
  const uniquePincodes = React.useMemo(() => {
    const pincodes = new Set();
    
    // Use the filtered data that respects date and product filters
    dataForFilterOptions.forEach(row => {
      // Extract pincode - handle both string and numeric values
      const pincode = row.pincode || row['Pincode'];
      if (pincode !== null && pincode !== undefined && pincode !== '') {
        // Convert to string and trim whitespace
        const pincodeStr = String(pincode).trim();
        if (pincodeStr) {
          pincodes.add(pincodeStr);
        }
      }
    });
    
    // Sort pincodes numerically if they're all numbers, otherwise alphabetically
    return Array.from(pincodes).sort((a, b) => {
      const numA = Number(a);
      const numB = Number(b);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      return a.localeCompare(b);
    });
  }, [dataForFilterOptions]);

  // Reset pincode filter if current selection is no longer valid after filters change
  useEffect(() => {
    if (pincodeFilter !== 'All' && pincodeFilter !== '' && uniquePincodes.length > 0) {
      if (!uniquePincodes.includes(pincodeFilter)) {
        console.log(`Resetting pincode filter: ${pincodeFilter} is no longer available`);
        setPincodeFilter('All');
      }
    }
  }, [uniquePincodes, pincodeFilter]);

  // Chart data is now fetched from backend APIs in useEffect above

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  // Retry function to reload data
  const handleRetry = async () => {
    setError(null);
    setLoading(true);
    try {
      // Force refresh backend check
      refreshBackendCheck();
      const dateFilters = getDateFilters();
      const loadedData = await loadData(true, dateFilters); // Force refresh
      setData(loadedData);
      setBackendConnected(isUsingBackend());
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setBackendConnected(isUsingBackend());
      setLoading(false);
    }
  };

  if (error) {
    const isBackendError = error.includes('database') || error.includes('MySQL') || error.includes('backend') || error.includes('Cannot connect');
    const baseUrl = getAPIBaseURLWithoutPath();
    
    return (
      <div className="error-container">
        <h2 style={{ color: '#dc3545' }}>Error Loading Data</h2>
        <p style={{ whiteSpace: 'pre-line', textAlign: 'left', maxWidth: '600px', margin: '20px auto', padding: '15px', backgroundColor: '#f8d7da', borderRadius: '4px', color: '#721c24' }}>
          {error}
        </p>
        
        {/* Retry Button */}
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <button
            onClick={handleRetry}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
          >
            🔄 Retry Connection
          </button>
        </div>
        
        {isBackendError ? (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px', maxWidth: '600px', margin: '20px auto' }}>
            <h3 style={{ marginTop: 0, color: '#856404' }}>Troubleshooting Steps:</h3>
            <ol style={{ textAlign: 'left', color: '#856404' }}>
              <li><strong>Check if backend server is running:</strong>
                <ul style={{ marginTop: '5px', marginBottom: '10px' }}>
                  <li>With PM2: <code>./start.sh</code> or <code>pm2 start ecosystem.config.js --only dashboard</code></li>
                  <li>With npm: <code>npm run dev</code> or <code>cd backend && npm start</code></li>
                  <li>Check status: <code>pm2 status</code> or <code>./show-ports.sh</code></li>
                </ul>
              </li>
              <li><strong>Verify backend is accessible:</strong> <code>{baseUrl}/api/health</code></li>
              <li><strong>Check port status:</strong> Run <code>./show-ports.sh</code> on the server</li>
              <li><strong>Check database connection:</strong> Verify <code>backend/.env</code> has correct MySQL credentials</li>
              <li><strong>Ensure MySQL database is running and accessible</strong></li>
              <li><strong>If using Nginx:</strong> Check Nginx is running: <code>sudo systemctl status nginx</code></li>
              <li><strong>If database is empty:</strong> Upload data using the upload section</li>
            </ol>
          </div>
        ) : (
          <div style={{ marginTop: '20px' }}>
            <p>Please ensure the Excel file is located at <code>/public/data/ForwardOrders-1762582722-21819 (1).xlsx</code></p>
            <p style={{ marginTop: '15px' }}>
              <strong>Or:</strong> Start the backend server and upload an Excel file using the upload section in the sidebar.
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="App">
        <header className="app-header">
          <h1>📊 Order Dashboard</h1>
          <div style={{ 
            fontSize: '0.9rem', 
            opacity: 0.9, 
            marginTop: '5px',
            padding: '6px 12px',
            backgroundColor: backendConnected ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
            border: `1px solid ${backendConnected ? 'rgba(40, 167, 69, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
            borderRadius: '4px',
            display: 'inline-block',
            color: backendConnected ? '#28a745' : '#ffc107'
          }}>
            {backendConnected ? (
              <>📡 <strong>Data Source:</strong> Database (MySQL) - 0 records</>
            ) : (
              <>📂 <strong>Data Source:</strong> Local Excel File - 0 records</>
            )}
          </div>
        </header>

        <div className="app-container">
          <aside className="sidebar">
            <FileUpload 
              onUploadSuccess={handleUploadSuccess}
              onUploadError={handleUploadError}
              backendConnected={backendConnected}
            />
            <Filters
              dateFilter={dateFilter}
              onDateFilterChange={setDateFilter}
              customStartDate={customStartDate}
              onCustomStartDateChange={setCustomStartDate}
              customEndDate={customEndDate}
              onCustomEndDateChange={setCustomEndDate}
              productFilter={productFilter}
              onProductFilterChange={setProductFilter}
              pincodeFilter={pincodeFilter}
              onPincodeFilterChange={(value) => {
                if (value !== 'All' && !uniquePincodes.includes(value)) {
                  setPincodeFilter('All');
                } else {
                  setPincodeFilter(value);
                }
              }}
              products={uniqueProducts}
              pincodes={uniquePincodes}
              viewType={trendViewType}
              onViewTypeChange={setTrendViewType}
            />
          </aside>

          <main className="main-content">
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60vh',
              padding: '40px 20px',
              textAlign: 'center'
            }}>
              <h2 style={{ 
                color: 'var(--error-color)', 
                fontSize: '2rem',
                marginBottom: '15px'
              }}>
                No Data Available
              </h2>
              <p style={{ 
                fontSize: '1.1rem', 
                color: 'var(--text-secondary)',
                marginBottom: '30px'
              }}>
                No data found in MySQL database.
              </p>
              <div style={{
                backgroundColor: '#e6f7ff',
                border: '2px solid #91d5ff',
                borderRadius: '8px',
                padding: '25px',
                maxWidth: '600px',
                textAlign: 'left',
                marginTop: '20px'
              }}>
                <p style={{ 
                  fontWeight: 'bold', 
                  color: '#0050b3', 
                  marginBottom: '15px',
                  fontSize: '1.1rem'
                }}>
                  📤 To load data:
                </p>
                <ol style={{ 
                  textAlign: 'left', 
                  color: '#0c5460',
                  fontSize: '1rem',
                  lineHeight: '1.8',
                  paddingLeft: '20px'
                }}>
                  <li style={{ marginBottom: '10px' }}>
                    <strong>Upload an Excel file</strong> using the upload section in the sidebar (on the left)
                  </li>
                  <li style={{ marginBottom: '10px' }}>
                    Or use the import script: <code style={{ 
                      backgroundColor: '#f0f0f0', 
                      padding: '2px 6px', 
                      borderRadius: '3px' 
                    }}>npm run import:excel</code>
                  </li>
                  <li>
                    Or ensure data exists in the MySQL database
                  </li>
                </ol>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (filteredData.length === 0) {
    return (
      <div className="error-container">
        <h2>No Data Matches Filters</h2>
        <p>No data matches the current filters. Please adjust your filters.</p>
        <p style={{ marginTop: '10px', fontSize: '0.9rem', color: '#666' }}>
          Total records available: {data.length}
        </p>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="app-header">
        <h1>📊 Order Dashboard</h1>
        <div style={{ 
          fontSize: '0.9rem', 
          opacity: 0.9, 
          marginTop: '5px',
          padding: '6px 12px',
          backgroundColor: backendConnected ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
          border: `1px solid ${backendConnected ? 'rgba(40, 167, 69, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
          borderRadius: '4px',
          display: 'inline-block',
          color: backendConnected ? '#28a745' : '#ffc107'
        }}>
          {backendConnected ? (
            <>📡 <strong>Data Source:</strong> Database (MySQL) - {data.length.toLocaleString()} records</>
          ) : (
            <>📂 <strong>Data Source:</strong> Local Excel File - {data.length.toLocaleString()} records</>
          )}
        </div>
      </header>

      {refreshing && (
        <div style={{
          position: 'fixed',
          top: '80px',
          right: '20px',
          backgroundColor: 'rgba(255, 139, 66, 0.95)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '6px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: '500'
        }}>
          <div className="spinner" style={{ 
            width: '16px', 
            height: '16px', 
            borderWidth: '2px',
            margin: 0
          }}></div>
          <span>Refreshing data...</span>
        </div>
      )}

      <div className="app-container">
        <aside className="sidebar">
          <FileUpload 
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            backendConnected={backendConnected}
          />
          <Filters
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            customStartDate={customStartDate}
            onCustomStartDateChange={setCustomStartDate}
            customEndDate={customEndDate}
            onCustomEndDateChange={setCustomEndDate}
            productFilter={productFilter}
            onProductFilterChange={setProductFilter}
            pincodeFilter={pincodeFilter}
            onPincodeFilterChange={(value) => {
              // Reset pincode filter if it's no longer in the available list
              if (value !== 'All' && !uniquePincodes.includes(value)) {
                setPincodeFilter('All');
              } else {
                setPincodeFilter(value);
              }
            }}
            products={uniqueProducts}
            pincodes={uniquePincodes}
            viewType={trendViewType}
            onViewTypeChange={setTrendViewType}
          />
        </aside>

        <main className="main-content">
          <KPISection kpis={kpis} />

          <React.Suspense fallback={<div className="chart-container"><div className="loading">Loading chart...</div></div>}>
            <OrderStatusChart 
              key={`order-status-${filteredData.length}-${dateFilter}-${customStartDate}-${customEndDate}-${productFilter}-${pincodeFilter}`}
              data={orderStatusData} 
              deliveryRatio={deliveryRatioData}
              deliveryRatioByPartner={deliveryRatioByPartnerData}
              filteredData={filteredData}
            />

            <PaymentMethodChart 
              key={`payment-method-${filteredData.length}-${dateFilter}-${customStartDate}-${customEndDate}-${productFilter}-${pincodeFilter}`}
              data={paymentMethodData} 
            />

            <FulfillmentPartnerChart data={fulfillmentPartnerData} />

            <PriceRangeChart data={priceRangeData} />

          <div className="chart-container">
            <div style={{ marginBottom: '10px' }}>
              <label style={{ marginRight: '10px' }}>
                <input 
                  type="radio" 
                  value="orders" 
                  checked={trendViewType === 'orders'} 
                  onChange={() => setTrendViewType('orders')} 
                />
                Order View
              </label>
              <label>
                <input 
                  type="radio" 
                  value="revenue" 
                  checked={trendViewType === 'revenue'} 
                  onChange={() => setTrendViewType('revenue')} 
                />
                Revenue View
              </label>
            </div>
            <TrendChart data={trendData} viewType={trendViewType} />
          </div>

          <div className="chart-container">
            <div className="chart-view-toggle">
              <label className={`radio-label ${productViewType === 'orders' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  value="orders" 
                  checked={productViewType === 'orders'} 
                  onChange={() => setProductViewType('orders')} 
                />
                By Orders
              </label>
              <label className={`radio-label ${productViewType === 'revenue' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  value="revenue" 
                  checked={productViewType === 'revenue'} 
                  onChange={() => setProductViewType('revenue')} 
                />
                By Revenue
              </label>
            </div>
            <TopProductsChart data={topProductsData} by={productViewType} />
          </div>

          <div className="chart-container">
            <div className="chart-view-toggle">
              <label className={`radio-label ${cityViewType === 'orders' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  value="orders" 
                  checked={cityViewType === 'orders'} 
                  onChange={() => setCityViewType('orders')} 
                />
                By Orders
              </label>
              <label className={`radio-label ${cityViewType === 'revenue' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  value="revenue" 
                  checked={cityViewType === 'revenue'} 
                  onChange={() => setCityViewType('revenue')} 
                />
                By Revenue
              </label>
            </div>
            <div className="chart-view-toggle" style={{ marginTop: '10px' }}>
              <label className={`radio-label ${citySortDirection === 'top' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  value="top" 
                  checked={citySortDirection === 'top'} 
                  onChange={() => setCitySortDirection('top')} 
                />
                Top 10
              </label>
              <label className={`radio-label ${citySortDirection === 'bottom' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  value="bottom" 
                  checked={citySortDirection === 'bottom'} 
                  onChange={() => setCitySortDirection('bottom')} 
                />
                Bottom 10
              </label>
            </div>
            <TopCitiesChart data={topCitiesData} by={cityViewType} sortDirection={citySortDirection} />
          </div>

          <TopNDRCitiesChart data={topNDRCitiesData} />

          <GoodBadPincodesChart data={goodBadPincodesData} filteredData={filteredData} />

          {pincodeFilter !== 'All' && (
            <div className="chart-container">
              <h3 className="chart-title">Top 10 Products in Pincode: {pincodeFilter}</h3>
              <TopProductsChart 
                data={topProductsByPincodeData} 
                by="orders" 
              />
            </div>
          )}
          </React.Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;