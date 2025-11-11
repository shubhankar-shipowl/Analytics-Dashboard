import React, { useState, useEffect, useMemo } from 'react';
import './app.css';
import { 
    loadExcelData, 
    filterByDateRange, 
    calculateKPIs, 
    getOrderStatusDistribution,
    getDeliveryRatio,
    getDeliveryRatioByPartner,
    getPaymentMethodDistribution,
    getFulfillmentPartnerAnalysis,
    getPriceRangeDistribution,
    getDailyTrend,
    getTopProducts,
    getTopCities,
    getTopProductsByPincode,
    getTopPincodeByDelivery
  } from './utils/dataProcessor';
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
  getDeliveryRatio as fetchDeliveryRatio
} from './utils/dataService';
import KPISection from './components/KPISection';
import Filters from './components/Filters';
import FileUpload from './components/FileUpload';
import OrderStatusChart from './components/OrderStatusChart';
import PaymentMethodChart from './components/PaymentMethodChart';
import FulfillmentPartnerChart from './components/FulfillmentPartnerChart';
import PriceRangeChart from './components/PriceRangeChart';
import TrendChart from './components/TrendChart';
import TopProductsChart from './components/TopProductsChart';
import TopCitiesChart from './components/TopCitiesChart';

function App() {
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filters
  const [dateFilter, setDateFilter] = useState('Lifetime');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [productFilter, setProductFilter] = useState('All');
  const [pincodeFilter, setPincodeFilter] = useState('All');
  const [trendViewType, setTrendViewType] = useState('orders');
  const [productViewType, setProductViewType] = useState('orders');
  const [cityViewType, setCityViewType] = useState('orders');
  
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
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [fulfillmentPartnerData, setFulfillmentPartnerData] = useState([]);
  const [priceRangeData, setPriceRangeData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [topProductsData, setTopProductsData] = useState([]);
  const [topCitiesData, setTopCitiesData] = useState([]);
  const [topProductsByPincodeData, setTopProductsByPincodeData] = useState([]);

  useEffect(() => {
    // Load data from backend API or local Excel file
    const fetchData = async () => {
      try {
        setLoading(true);
        const loadedData = await loadData();
        setData(loadedData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error('Error loading data:', err);
      }
    };
    
    fetchData();
  }, []);

  // Handle file upload success
  const handleUploadSuccess = async (result) => {
    try {
      setLoading(true);
      setError(null);
      
      // Force refresh backend check and reload data after successful upload
      // Add a small delay to ensure database has finished processing all batches
      console.log('🔄 Refreshing dashboard with new data...');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      refreshBackendCheck();
      const loadedData = await loadData(true);
      
      if (loadedData && loadedData.length > 0) {
        setData(loadedData);
        console.log(`✅ Dashboard refreshed with ${loadedData.length} records`);
      } else {
        console.warn('⚠️ No data loaded after upload');
        // Still set empty array to clear old data
        setData([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error reloading data after upload:', err);
      setError('Failed to refresh dashboard. Please reload the page.');
      setLoading(false);
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

    let filtered = [...data];

    // Apply date filter first (if not Lifetime)
    if (dateFilter !== 'Lifetime') {
      filtered = filterByDateRange(filtered, dateFilter, customStartDate, customEndDate);
    }

    // Apply product filter (works on date-filtered data)
    if (productFilter !== 'All' && productFilter !== '') {
      filtered = filtered.filter(row => {
        const rowProduct = row.product || row['Product Name'] || '';
        const productStr = String(rowProduct).trim();
        const filterStr = String(productFilter).trim();
        return productStr === filterStr;
      });
    }

    // Apply pincode filter (works on date and product filtered data)
    if (pincodeFilter !== 'All' && pincodeFilter !== '') {
      filtered = filtered.filter(row => {
        const rowPincode = row.pincode || row['Pincode'] || '';
        return String(rowPincode).trim() === String(pincodeFilter).trim();
      });
    }

    setFilteredData(filtered);
  }, [data, dateFilter, customStartDate, customEndDate, productFilter, pincodeFilter]);

  // Helper function to build filter object for API calls
  const buildFilters = () => {
    const filters = {};
    
    // Date filters
    if (dateFilter !== 'Lifetime') {
      if (dateFilter === 'Custom' && customStartDate && customEndDate) {
        filters.startDate = customStartDate;
        filters.endDate = customEndDate;
      } else {
        // Calculate date range for other filters
        const today = new Date();
        let startDate = new Date();
        
        switch (dateFilter) {
          case 'Today':
            startDate.setHours(0, 0, 0, 0);
            filters.startDate = startDate.toISOString().split('T')[0];
            filters.endDate = today.toISOString().split('T')[0];
            break;
          case 'Last 7 Days':
            startDate.setDate(today.getDate() - 7);
            filters.startDate = startDate.toISOString().split('T')[0];
            filters.endDate = today.toISOString().split('T')[0];
            break;
          case 'Last 30 Days':
            startDate.setDate(today.getDate() - 30);
            filters.startDate = startDate.toISOString().split('T')[0];
            filters.endDate = today.toISOString().split('T')[0];
            break;
          case 'Last 90 Days':
            startDate.setDate(today.getDate() - 90);
            filters.startDate = startDate.toISOString().split('T')[0];
            filters.endDate = today.toISOString().split('T')[0];
            break;
          case 'This Month':
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            filters.startDate = startDate.toISOString().split('T')[0];
            filters.endDate = today.toISOString().split('T')[0];
            break;
          case 'Last Month':
            startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
            filters.startDate = startDate.toISOString().split('T')[0];
            filters.endDate = endDate.toISOString().split('T')[0];
            break;
          case 'This Year':
            startDate = new Date(today.getFullYear(), 0, 1);
            filters.startDate = startDate.toISOString().split('T')[0];
            filters.endDate = today.toISOString().split('T')[0];
            break;
          default:
            break;
        }
      }
    }
    
    // Product filter
    if (productFilter !== 'All' && productFilter !== '') {
      filters.product = productFilter;
    }
    
    // Pincode filter
    if (pincodeFilter !== 'All' && pincodeFilter !== '') {
      filters.pincode = pincodeFilter;
    }
    
    return filters;
  };

  // Fetch analytics data from backend when filters change
  useEffect(() => {
    const fetchAnalytics = async () => {
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
        setPaymentMethodData(getPaymentMethodDistribution(filteredData));
        setFulfillmentPartnerData(getFulfillmentPartnerAnalysis(filteredData));
        setPriceRangeData(getPriceRangeDistribution(filteredData));
        setTrendData(getDailyTrend(filteredData, trendViewType));
        setTopProductsData(getTopProducts(filteredData, productViewType));
        setTopCitiesData(getTopCities(filteredData, cityViewType));
        setTopProductsByPincodeData(pincodeFilter !== 'All' ? getTopProductsByPincode(filteredData, pincodeFilter) : []);
        return;
      }

      // Fetch from backend APIs
      try {
        const filters = buildFilters();
        
        // Fetch KPIs
        const kpisData = await fetchKPIs(filters);
        if (kpisData) {
          setKpis(kpisData);
        } else if (filteredData.length > 0) {
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

        // Fetch order status
        const orderStatus = await fetchOrderStatus(filters);
        if (orderStatus && Array.isArray(orderStatus) && orderStatus.length > 0) {
          setOrderStatusData(orderStatus);
        } else if (filteredData.length > 0) {
          setOrderStatusData(getOrderStatusDistribution(filteredData));
        } else {
          setOrderStatusData([]);
        }

        // Fetch delivery ratio
        const deliveryRatio = await fetchDeliveryRatio(filters);
        if (deliveryRatio && Array.isArray(deliveryRatio) && deliveryRatio.length > 0) {
          // Backend returns array of partners with ratios
          setDeliveryRatioByPartnerData(deliveryRatio);
          
          // Calculate overall delivery ratio
          const totalOrders = deliveryRatio.reduce((sum, item) => sum + (item.totalOrders || 0), 0);
          const deliveredCount = deliveryRatio.reduce((sum, item) => sum + (item.deliveredCount || 0), 0);
          const overallRatio = totalOrders > 0 ? (deliveredCount / totalOrders) * 100 : 0;
          setDeliveryRatioData({ 
            ratio: parseFloat(overallRatio.toFixed(2)), 
            deliveredCount, 
            totalOrders 
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

        // Fetch payment methods
        const paymentMethods = await fetchPaymentMethods(filters);
        if (paymentMethods) {
          setPaymentMethodData(paymentMethods);
        } else if (filteredData.length > 0) {
          setPaymentMethodData(getPaymentMethodDistribution(filteredData));
        }

        // Fetch fulfillment partners
        const fulfillmentPartners = await fetchFulfillmentPartners(filters);
        if (fulfillmentPartners) {
          setFulfillmentPartnerData(fulfillmentPartners);
        } else if (filteredData.length > 0) {
          setFulfillmentPartnerData(getFulfillmentPartnerAnalysis(filteredData));
        }

        // Fetch trends
        const trends = await fetchTrends({ ...filters, view: trendViewType });
        if (trends) {
          setTrendData(trends);
        } else if (filteredData.length > 0) {
          setTrendData(getDailyTrend(filteredData, trendViewType));
        }

        // Fetch top products
        const topProducts = await fetchTopProducts({ ...filters, by: productViewType, limit: 10 });
        if (topProducts) {
          setTopProductsData(topProducts);
        } else if (filteredData.length > 0) {
          setTopProductsData(getTopProducts(filteredData, productViewType));
        }

        // Fetch top cities
        const topCities = await fetchTopCities({ ...filters, by: cityViewType, limit: 10 });
        if (topCities) {
          setTopCitiesData(topCities);
        } else if (filteredData.length > 0) {
          setTopCitiesData(getTopCities(filteredData, cityViewType));
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
          setPaymentMethodData(getPaymentMethodDistribution(filteredData));
          setFulfillmentPartnerData(getFulfillmentPartnerAnalysis(filteredData));
          setPriceRangeData(getPriceRangeDistribution(filteredData));
          setTrendData(getDailyTrend(filteredData, trendViewType));
          setTopProductsData(getTopProducts(filteredData, productViewType));
          setTopCitiesData(getTopCities(filteredData, cityViewType));
          setTopProductsByPincodeData(pincodeFilter !== 'All' ? getTopProductsByPincode(filteredData, pincodeFilter) : []);
        }
      }
    };

    fetchAnalytics();
  }, [filteredData, dateFilter, customStartDate, customEndDate, productFilter, pincodeFilter, trendViewType, productViewType, cityViewType]);

  // Get filtered data for extracting unique values (based on date and product filters)
  const dataForFilterOptions = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let filtered = [...data];
    
    // Apply date filter (if not Lifetime)
    if (dateFilter !== 'Lifetime') {
      filtered = filterByDateRange(filtered, dateFilter, customStartDate, customEndDate);
    }
    
    // Apply product filter (if selected)
    if (productFilter !== 'All' && productFilter !== '') {
      filtered = filtered.filter(row => {
        const rowProduct = row.product || row['Product Name'] || '';
        const productStr = String(rowProduct).trim();
        const filterStr = String(productFilter).trim();
        return productStr === filterStr;
      });
    }
    
    return filtered;
  }, [data, dateFilter, customStartDate, customEndDate, productFilter]);

  // Get unique products for filter dropdown (filtered by date only, not by product)
  const uniqueProducts = React.useMemo(() => {
    const products = new Set();
    let dataForProducts = [...data];
    
    // Apply date filter only (not product filter, since we want all products for the selected period)
    if (dateFilter !== 'Lifetime') {
      dataForProducts = filterByDateRange(dataForProducts, dateFilter, customStartDate, customEndDate);
    }
    
    dataForProducts.forEach(row => {
      // Extract product from multiple possible field names
      const product = row.product || row['Product Name'] || '';
      if (product && String(product).trim()) {
        products.add(String(product).trim());
      }
    });
    return Array.from(products).sort();
  }, [data, dateFilter, customStartDate, customEndDate]);

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

  if (error) {
    const isBackendError = error.includes('database') || error.includes('MySQL') || error.includes('backend');
    
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p style={{ whiteSpace: 'pre-line', textAlign: 'left', maxWidth: '600px', margin: '0 auto' }}>{error}</p>
        
        {isBackendError ? (
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '4px', maxWidth: '600px', margin: '20px auto' }}>
            <h3 style={{ marginTop: 0, color: '#856404' }}>Troubleshooting Steps:</h3>
            <ol style={{ textAlign: 'left', color: '#856404' }}>
              <li>Check if backend server is running: <code>npm run dev</code> or <code>cd backend && npm start</code></li>
              <li>Verify backend is accessible at: <code>http://localhost:5000/api/health</code></li>
              <li>Check database connection in <code>backend/.env</code></li>
              <li>Ensure MySQL database is running and accessible</li>
              <li>If database is empty, upload data using the upload section</li>
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
    const usingBackend = isUsingBackend();
    return (
      <div className="error-container">
        <h2>No Data Available</h2>
        <p>No data found in {usingBackend ? 'MySQL database' : 'local file'}.</p>
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#d1ecf1', borderRadius: '4px', maxWidth: '600px', margin: '20px auto' }}>
          <h3 style={{ marginTop: 0, color: '#0c5460' }}>To load data:</h3>
          {usingBackend ? (
            <ol style={{ textAlign: 'left', color: '#0c5460' }}>
              <li>Upload an Excel file using the upload section in the sidebar</li>
              <li>Or use the import script: <code>npm run import:excel</code></li>
              <li>Or ensure data exists in the MySQL database</li>
            </ol>
          ) : (
            <ol style={{ textAlign: 'left', color: '#0c5460' }}>
              <li>Start the backend server: <code>npm run dev</code></li>
              <li>Upload an Excel file using the upload section</li>
              <li>Or ensure the Excel file exists at <code>/public/data/ForwardOrders-1762582722-21819 (1).xlsx</code></li>
            </ol>
          )}
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
          backgroundColor: isUsingBackend() ? 'rgba(40, 167, 69, 0.1)' : 'rgba(255, 193, 7, 0.1)',
          border: `1px solid ${isUsingBackend() ? 'rgba(40, 167, 69, 0.3)' : 'rgba(255, 193, 7, 0.3)'}`,
          borderRadius: '4px',
          display: 'inline-block',
          color: isUsingBackend() ? '#28a745' : '#ffc107'
        }}>
          {isUsingBackend() ? (
            <>📡 <strong>Data Source:</strong> Database (MySQL) - {data.length.toLocaleString()} records</>
          ) : (
            <>📂 <strong>Data Source:</strong> Local Excel File - {data.length.toLocaleString()} records</>
          )}
        </div>
      </header>

      <div className="app-container">
        <aside className="sidebar">
          <FileUpload 
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
            backendConnected={isUsingBackend()}
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

          <OrderStatusChart 
            key={`order-status-${filteredData.length}-${dateFilter}-${customStartDate}-${customEndDate}-${productFilter}-${pincodeFilter}`}
            data={orderStatusData} 
            deliveryRatio={deliveryRatioData}
            deliveryRatioByPartner={deliveryRatioByPartnerData}
          />

          <PaymentMethodChart data={paymentMethodData} />

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
            <TopCitiesChart data={topCitiesData} by={cityViewType} />
          </div>

          {pincodeFilter !== 'All' && (
            <div className="chart-container">
              <h3 className="chart-title">Top 10 Products in Pincode: {pincodeFilter}</h3>
              <TopProductsChart 
                data={topProductsByPincodeData} 
                by="orders" 
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;