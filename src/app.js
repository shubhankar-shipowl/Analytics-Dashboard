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
    getTopProductsByPincode
  } from './utils/dataProcessor';
import { loadData, isUsingBackend } from './utils/dataService';
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
    totalCOD: 0,
    totalRTO: 0,
    totalRTS: 0
  });

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
      // Reload data after successful upload
      const loadedData = await loadData();
      setData(loadedData);
      setLoading(false);
    } catch (err) {
      console.error('Error reloading data after upload:', err);
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

  useEffect(() => {
    if (filteredData.length === 0) return;

    const calculatedKPIs = calculateKPIs(filteredData);
    setKpis(calculatedKPIs);
  }, [filteredData]);

  // Get unique products and pincodes for filters
  const uniqueProducts = React.useMemo(() => {
    const products = new Set();
    data.forEach(row => {
      // Extract product from multiple possible field names
      const product = row.product || row['Product Name'] || '';
      if (product && String(product).trim()) {
        products.add(String(product).trim());
      }
    });
    return Array.from(products).sort();
  }, [data]);

  const uniquePincodes = React.useMemo(() => {
    const pincodes = new Set();
    data.forEach(row => {
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
  }, [data]);

  // Memoize chart data calculations before early returns
  const orderStatusData = useMemo(() => 
    filteredData.length > 0 ? getOrderStatusDistribution(filteredData) : [], 
    [filteredData]
  );
  const deliveryRatioData = useMemo(() => 
    filteredData.length > 0 ? getDeliveryRatio(filteredData) : { ratio: 0, deliveredCount: 0, totalOrders: 0 }, 
    [filteredData]
  );
  const deliveryRatioByPartnerData = useMemo(() => 
    filteredData.length > 0 ? getDeliveryRatioByPartner(filteredData) : [], 
    [filteredData]
  );

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Data</h2>
        <p>{error}</p>
        <p>Please ensure the Excel file is located at /public/data/ForwardOrders-1762582722-21819 (1).xlsx</p>
        <p style={{ marginTop: '15px' }}>
          <strong>Or:</strong> Upload an Excel file using the upload section in the sidebar.
        </p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="error-container">
        <h2>No Data Available</h2>
        <p>No data found. Please:</p>
        <ul style={{ textAlign: 'left', display: 'inline-block', marginTop: '10px' }}>
          <li>Ensure the Excel file exists at <code>/public/data/ForwardOrders-1762582722-21819 (1).xlsx</code></li>
          <li>Or upload an Excel file using the upload section in the sidebar</li>
          <li>Or ensure the backend has data imported</li>
        </ul>
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
        {isUsingBackend() && (
          <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: '5px' }}>
            Connected to Backend API
          </p>
        )}
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
            onPincodeFilterChange={setPincodeFilter}
            products={uniqueProducts}
            pincodes={uniquePincodes}
            viewType={trendViewType}
            onViewTypeChange={setTrendViewType}
          />
        </aside>

        <main className="main-content">
          <KPISection kpis={kpis} />

          <OrderStatusChart 
            key={`order-status-${filteredData.length}-${dateFilter}-${customStartDate}-${customEndDate}`}
            data={orderStatusData} 
            deliveryRatio={deliveryRatioData}
            deliveryRatioByPartner={deliveryRatioByPartnerData}
          />

          <PaymentMethodChart data={getPaymentMethodDistribution(filteredData)} />

          <FulfillmentPartnerChart data={getFulfillmentPartnerAnalysis(filteredData)} />

          <PriceRangeChart data={getPriceRangeDistribution(filteredData)} />

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
            <TrendChart data={getDailyTrend(filteredData, trendViewType)} viewType={trendViewType} />
          </div>

          <div className="chart-container">
            <div style={{ marginBottom: '10px' }}>
              <label style={{ marginRight: '10px' }}>
                <input 
                  type="radio" 
                  value="orders" 
                  checked={productViewType === 'orders'} 
                  onChange={() => setProductViewType('orders')} 
                />
                By Orders
              </label>
              <label>
                <input 
                  type="radio" 
                  value="revenue" 
                  checked={productViewType === 'revenue'} 
                  onChange={() => setProductViewType('revenue')} 
                />
                By Revenue
              </label>
            </div>
            <TopProductsChart data={getTopProducts(filteredData, productViewType)} by={productViewType} />
          </div>

          <div className="chart-container">
            <div style={{ marginBottom: '10px' }}>
              <label style={{ marginRight: '10px' }}>
                <input 
                  type="radio" 
                  value="orders" 
                  checked={cityViewType === 'orders'} 
                  onChange={() => setCityViewType('orders')} 
                />
                By Orders
              </label>
              <label>
                <input 
                  type="radio" 
                  value="revenue" 
                  checked={cityViewType === 'revenue'} 
                  onChange={() => setCityViewType('revenue')} 
                />
                By Revenue
              </label>
            </div>
            <TopCitiesChart data={getTopCities(filteredData, cityViewType)} by={cityViewType} />
          </div>

          {pincodeFilter !== 'All' && (
            <div className="chart-container">
              <h3 className="chart-title">Top 10 Products in Pincode: {pincodeFilter}</h3>
              <TopProductsChart 
                data={getTopProductsByPincode(filteredData, pincodeFilter)} 
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