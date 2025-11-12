import React, { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';
import './Chart.css';

const COLORS = ['#ff8b42', '#ffd7a8', '#FFBB28', '#FF8042', '#ff8b42', '#ffd7a8', '#fffdfc'];

const OrderStatusChart = ({ data, deliveryRatio, deliveryRatioByPartner, filteredData = [] }) => {
  // Helper function to get status from row (handles multiple field name variations)
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

  // Function to export data to Excel
  const exportToExcel = (status) => {
    // Filter data by status
    const statusData = filteredData.filter(row => {
      const rowStatus = String(getStatus(row)).trim();
      const filterStatus = String(status).trim();
      return rowStatus.toLowerCase() === filterStatus.toLowerCase();
    });

    if (statusData.length === 0) {
      alert(`No data found for status: ${status}`);
      return;
    }

    // Get all unique keys from all rows to include all columns
    const allKeys = new Set();
    statusData.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    // Convert Set to Array and sort for consistent column order
    const sortedKeys = Array.from(allKeys).sort();

    // Prepare data for Excel export - include ALL columns
    const excelData = statusData.map(row => {
      const excelRow = {};
      sortedKeys.forEach(key => {
        let value = row[key];
        
        // Handle Date objects
        if (value instanceof Date) {
          value = value.toLocaleDateString();
        }
        // Handle null/undefined
        else if (value === null || value === undefined) {
          value = '';
        }
        // Keep other values as-is
        excelRow[key] = value;
      });
      return excelRow;
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');

    // Set column widths dynamically based on column names and content
    const colWidths = sortedKeys.map(key => {
      // Calculate max width based on header and content
      const headerWidth = key.length;
      const contentWidths = excelData.slice(0, 100).map(row => {
        const cellValue = String(row[key] || '');
        return cellValue.length;
      });
      const maxContentWidth = contentWidths.length > 0 ? Math.max(...contentWidths) : 0;
      // Set width with some padding, max 50 characters, min 10
      return { wch: Math.min(Math.max(headerWidth, maxContentWidth, 10) + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // Generate filename with status and current date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Orders_${status.replace(/[^a-zA-Z0-9]/g, '_')}_${dateStr}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

  // Force re-render when data changes
  useEffect(() => {
    // This ensures the component re-renders when props change
  }, [data, deliveryRatio, deliveryRatioByPartner]);
  
  return (
    <div className="chart-container">
      <h3 className="chart-title">Order Status Distribution</h3>
      <div className="chart-grid">
        <div className="chart-item">
          <h4>Delivery Ratio by Fulfilled By</h4>
          {deliveryRatio && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              background: 'var(--background-color)',
              borderRadius: '8px',
              textAlign: 'center',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600', 
                color: 'var(--text-secondary)',
                marginBottom: '5px'
              }}>
                Overall Delivery Ratio
              </div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: 'var(--primary-color)',
                marginBottom: '5px',
                wordBreak: 'break-word'
              }}>
                {deliveryRatio.ratio}%
              </div>
              <div style={{ 
                color: 'var(--text-muted)',
                fontSize: '0.85rem',
                wordBreak: 'break-word'
              }}>
                {deliveryRatio.deliveredCount.toLocaleString()} out of {deliveryRatio.totalOrders.toLocaleString()} orders
              </div>
            </div>
          )}
          <div style={{ width: '100%', minHeight: '400px' }}>
            {deliveryRatioByPartner && deliveryRatioByPartner.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  key={`delivery-ratio-${deliveryRatioByPartner?.length || 0}-${deliveryRatioByPartner?.map(p => `${p.partner}-${p.ratio}`).join(',') || ''}`}
                  data={deliveryRatioByPartner || []}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="partner" type="category" width={100} />
                  <Tooltip 
                    formatter={(value, name, props) => {
                      if (name === 'ratioValue') {
                        return [`${value.toFixed(2)}%`, 'Delivery Ratio'];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Partner: ${label}`}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div style={{
                            background: 'white',
                            padding: '10px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                          }}>
                            <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.partner}</p>
                            <p>Delivery Ratio: <strong>{data.ratio}%</strong></p>
                            <p>Delivered: {data.deliveredCount.toLocaleString()}</p>
                            <p>Total Orders: {data.totalOrders.toLocaleString()}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="ratioValue" 
                    fill="var(--primary-color)"
                    name="Delivery Ratio (%)"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No delivery ratio data available
              </div>
            )}
          </div>
        </div>
        <div className="chart-item">
          <h4>By Percentage</h4>
          {data && data.length > 0 ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.filter(item => item && (item.status || item.method))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => {
                      const status = entry?.status || entry?.payload?.status || 'Unknown';
                      const percentage = entry?.percentage || entry?.payload?.percentage || 0;
                      const percent = parseFloat(percentage) || 0;
                      return percent > 2 ? `${status}: ${percent.toFixed(1)}%` : '';
                    }}
                    outerRadius={100}
                    innerRadius={40}
                    fill="#8884d8"
                    dataKey="count"
                    paddingAngle={2}
                  >
                    {data.filter(item => item && (item.status || item.method)).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const { status, percentage } = props.payload;
                      return [
                        `${value} (${parseFloat(percentage || 0).toFixed(2)}%)`,
                        status
                      ];
                    }}
                  />
                  <Legend 
                    formatter={(value, entry) => {
                      const status = entry.payload?.status || entry.payload?.method || 'Unknown';
                      const percent = parseFloat(entry.payload?.percentage || 0);
                      return `${status} (${percent.toFixed(1)}%)`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderStatusChart;