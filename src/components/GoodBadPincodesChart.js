import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import './Chart.css';

const GoodBadPincodesChart = ({ data, filteredData = [] }) => {
  // Debug logging
  React.useEffect(() => {
    console.log('📊 GoodBadPincodesChart received data:', {
      hasData: !!data,
      goodCount: data?.good?.length || 0,
      badCount: data?.bad?.length || 0,
      good: data?.good?.slice(0, 3) || [],
      bad: data?.bad?.slice(0, 3) || []
    });
  }, [data]);

  const good = (data && Array.isArray(data.good)) ? data.good : [];
  const bad = (data && Array.isArray(data.bad)) ? data.bad : [];

  // Helper function to get status from row
  const getStatus = (row) => {
    return row.status || 
           row.order_status || 
           row.Status || 
           row['Status'] || 
           row['Order Status'] || 
           row['order status'] ||
           row.orderStatus ||
           '';
  };

  // Helper function to check if status is counted in delivery ratio
  const isCountedInDeliveryRatio = (status) => {
    const statusLower = String(status || '').toLowerCase().trim();
    if (statusLower === 'booked') return true;
    if (statusLower === 'delivered') return true;
    if (statusLower === 'dispatched') return true;
    if (statusLower === 'in transit' || statusLower === 'in-transit' || statusLower === 'intransit') return true;
    if (statusLower === 'lost') return true;
    if (statusLower === 'manifested') return true;
    if (statusLower === 'ndr') return true;
    if (statusLower === 'picked') return true;
    if (statusLower === 'pickup pending' || statusLower === 'pickup-pending' || statusLower === 'pickuppending') return true;
    if (statusLower === 'rto') return true;
    if (statusLower === 'rts') return true;
    if (statusLower.includes('rto-dispatched') || statusLower.includes('rto dispatched')) return true;
    if (statusLower.includes('rto-it') || statusLower.includes('rto it')) return true;
    if (statusLower.includes('rto pending') || statusLower.includes('rto-pending')) return true;
    return false;
  };

  // Function to export good/bad pincodes to Excel with all original columns
  const exportToExcel = (pincodes, type) => {
    if (!pincodes || pincodes.length === 0) {
      alert(`No ${type} pincodes data available to export.`);
      return;
    }

    if (!filteredData || filteredData.length === 0) {
      alert('No order data available to export. Please ensure data is loaded.');
      return;
    }

    // Create a map of product-pincode combinations to their delivery ratios
    const pincodeRatioMap = new Map();
    pincodes.forEach(item => {
      const key = `${String(item.product || 'Unknown').trim()}::${String(item.pincode || 'Unknown').trim()}`;
      pincodeRatioMap.set(key, parseFloat((item.ratio || 0).toFixed(2)));
    });

    // Filter orders that match the good/bad pincodes
    // Only include orders that are counted in delivery ratio and match the product-pincode combination
    const filteredOrders = filteredData.filter(row => {
      const status = getStatus(row);
      if (!isCountedInDeliveryRatio(status)) {
        return false;
      }

      const rowProduct = String(row.product || row['Product Name'] || 'Unknown').trim();
      const rowPincode = String(row.pincode || row['Pincode'] || 'Unknown').trim();
      const key = `${rowProduct}::${rowPincode}`;
      
      return pincodeRatioMap.has(key);
    });

    if (filteredOrders.length === 0) {
      alert(`No order data found for ${type} pincodes.`);
      return;
    }

    // Get all unique keys from all rows to include all columns
    const allKeys = new Set();
    filteredOrders.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    // Convert Set to Array and sort for consistent column order
    const sortedKeys = Array.from(allKeys).sort();

    // Prepare data for Excel export - include ALL columns plus Delivery Ratio
    const excelData = filteredOrders.map(row => {
      const excelRow = {};
      
      // Add all original columns
      sortedKeys.forEach(key => {
        let value = row[key];
        
        // Handle Date objects
        if (value instanceof Date) {
          value = value.toISOString().split('T')[0];
        }
        // Handle null/undefined
        else if (value === null || value === undefined) {
          value = '';
        }
        // Convert to string for other types
        else {
          value = String(value);
        }
        
        excelRow[key] = value;
      });
      
      // Add Delivery Ratio (%) column
      const rowProduct = String(row.product || row['Product Name'] || 'Unknown').trim();
      const rowPincode = String(row.pincode || row['Pincode'] || 'Unknown').trim();
      const key = `${rowProduct}::${rowPincode}`;
      const deliveryRatio = pincodeRatioMap.get(key) || 0;
      excelRow['Delivery Ratio (%)'] = deliveryRatio;
      
      return excelRow;
    });

    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Get all column keys including the new Delivery Ratio column
    const allColumnKeys = [...sortedKeys, 'Delivery Ratio (%)'];
    
    // Set dynamic column widths based on content
    const colWidths = allColumnKeys.map(key => {
      // Calculate max width based on header and data
      const headerWidth = key.length;
      const maxDataWidth = Math.max(
        ...excelData.map(row => String(row[key] || '').length),
        0
      );
      return { wch: Math.min(Math.max(headerWidth, maxDataWidth, 10), 50) };
    });
    ws['!cols'] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${type} Pincodes`);

    // Generate filename with current date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${type}_Pincodes_${dateStr}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
  };

  // Format data for charts (limit to top 20 each)
  // Truncate product name if too long for better display
  const truncateProductName = (name, maxLength = 30) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Sort good pincodes by order count (totalOrders) in descending order
  const sortedGood = [...good].sort((a, b) => {
    const aOrders = parseInt(a.totalOrders || a.actualOrders || 0, 10);
    const bOrders = parseInt(b.totalOrders || b.actualOrders || 0, 10);
    return bOrders - aOrders; // Descending order (highest first)
  });

  // Sort bad pincodes by order count (totalOrders) in descending order
  const sortedBad = [...bad].sort((a, b) => {
    const aOrders = parseInt(a.totalOrders || a.actualOrders || 0, 10);
    const bOrders = parseInt(b.totalOrders || b.actualOrders || 0, 10);
    return bOrders - aOrders; // Descending order (highest first)
  });

  const goodData = sortedGood.slice(0, 20).map(item => ({
    name: `${item.pincode}`,
    fullName: `${item.product} - ${item.pincode}`,
    product: item.product,
    productShort: truncateProductName(item.product, 25),
    pincode: item.pincode,
    ratio: item.ratio,
    deliveredCount: item.deliveredCount,
    totalOrders: item.totalOrders || item.actualOrders || 0
  }));

  const badData = sortedBad.slice(0, 20).map(item => ({
    name: `${item.pincode}`,
    fullName: `${item.product} - ${item.pincode}`,
    product: item.product,
    productShort: truncateProductName(item.product, 25),
    pincode: item.pincode,
    ratio: item.ratio,
    deliveredCount: item.deliveredCount,
    totalOrders: item.totalOrders || item.actualOrders || 0
  }));

  return (
    <div className="chart-container">
      <h3 className="chart-title">Good & Bad Pincodes by Product</h3>
      <div className="chart-grid" style={{ 
        gridTemplateColumns: '1fr 1fr', 
        gap: '20px',
        alignItems: 'flex-start'
      }}>
        {/* Good Pincodes */}
        <div className="chart-item" style={{ background: 'var(--background-color)', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ 
              color: '#22c55e', 
              fontSize: '1.1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0
            }}>
              <span style={{ fontSize: '1.3rem' }}>✅</span>
              <span>Good Pincodes (Delivery Ratio &gt; 60%)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                ({good.length.toLocaleString()} pincodes)
              </span>
            </h4>
            {good.length > 0 && (
              <button
                onClick={() => exportToExcel(good, 'Good')}
                className="download-btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#16a34a'}
                onMouseLeave={(e) => e.target.style.background = '#22c55e'}
              >
                📥 Download
              </button>
            )}
          </div>
          {goodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(400, goodData.length * 25)}>
              <BarChart 
                data={goodData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  label={{ value: 'Delivery Ratio (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  tick={{ fontSize: 12, fill: '#333' }}
                  interval={0}
                  label={{ value: 'Pincode', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'ratio') {
                      return [`${value.toFixed(2)}%`, 'Delivery Ratio'];
                    }
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{
                          background: 'white',
                          padding: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          minWidth: '200px'
                        }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#22c55e' }}>
                            {data.productShort}
                          </p>
                          <p style={{ marginBottom: '4px', fontSize: '12px' }}>
                            <strong>Pincode:</strong> {data.pincode}
                          </p>
                          <p style={{ marginBottom: '4px', fontSize: '12px' }}>
                            <strong>Delivery Ratio:</strong> <span style={{ color: '#22c55e', fontWeight: 'bold' }}>{data.ratio}%</span>
                          </p>
                          <p style={{ marginBottom: '4px', fontSize: '12px' }}>
                            <strong>Delivered:</strong> {data.deliveredCount.toLocaleString()}
                          </p>
                          <p style={{ marginBottom: '0', fontSize: '12px' }}>
                            <strong>Total Orders:</strong> {data.totalOrders.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="ratio" 
                  fill="#22c55e"
                  radius={[0, 4, 4, 0]}
                  name="Delivery Ratio (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No good pincodes found (delivery ratio &gt; 60%)
            </div>
          )}
        </div>

        {/* Bad Pincodes */}
        <div className="chart-item" style={{ background: 'var(--background-color)', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h4 style={{ 
              color: '#ef4444', 
              fontSize: '1.1rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0
            }}>
              <span style={{ fontSize: '1.3rem' }}>❌</span>
              <span>Bad Pincodes (Delivery Ratio &lt; 20%)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                ({bad.length.toLocaleString()} pincodes)
              </span>
            </h4>
            {bad.length > 0 && (
              <button
                onClick={() => exportToExcel(bad, 'Bad')}
                className="download-btn"
                style={{
                  padding: '6px 12px',
                  fontSize: '0.85rem',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#dc2626'}
                onMouseLeave={(e) => e.target.style.background = '#ef4444'}
              >
                📥 Download
              </button>
            )}
          </div>
          {badData.length > 0 ? (
            <ResponsiveContainer width="100%" height={Math.max(400, badData.length * 25)}>
              <BarChart 
                data={badData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  domain={[0, 100]}
                  label={{ value: 'Delivery Ratio (%)', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  width={100}
                  tick={{ fontSize: 12, fill: '#333' }}
                  interval={0}
                  label={{ value: 'Pincode', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'ratio') {
                      return [`${value.toFixed(2)}%`, 'Delivery Ratio'];
                    }
                    return [value, name];
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div style={{
                          background: 'white',
                          padding: '12px',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          minWidth: '200px'
                        }}>
                          <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '13px', color: '#ef4444' }}>
                            {data.productShort}
                          </p>
                          <p style={{ marginBottom: '4px', fontSize: '12px' }}>
                            <strong>Pincode:</strong> {data.pincode}
                          </p>
                          <p style={{ marginBottom: '4px', fontSize: '12px' }}>
                            <strong>Delivery Ratio:</strong> <span style={{ color: '#ef4444', fontWeight: 'bold' }}>{data.ratio}%</span>
                          </p>
                          <p style={{ marginBottom: '4px', fontSize: '12px' }}>
                            <strong>Delivered:</strong> {data.deliveredCount.toLocaleString()}
                          </p>
                          <p style={{ marginBottom: '0', fontSize: '12px' }}>
                            <strong>Total Orders:</strong> {data.totalOrders.toLocaleString()}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Bar 
                  dataKey="ratio" 
                  fill="#ef4444"
                  radius={[0, 4, 4, 0]}
                  name="Delivery Ratio (%)"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No bad pincodes found (delivery ratio &lt; 20%)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoodBadPincodesChart;

