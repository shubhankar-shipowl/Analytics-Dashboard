import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TrendChart = ({ data, viewType = 'orders' }) => {
  // Format date for display (YYYY-MM-DD to readable format)
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      // Handle different date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If parsing fails, try to extract YYYY-MM-DD format
        const match = String(dateStr).match(/(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const [year, month, day] = match[1].split('-');
          return `${day}/${month}/${year}`;
        }
        return dateStr;
      }
      // Format as DD/MM/YYYY
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const chartData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log('TrendChart: No data provided');
      return [];
    }

    console.log('TrendChart: Processing data:', data.length, 'items, viewType:', viewType);
    console.log('TrendChart: Sample data:', data.slice(0, 3));

    const processed = data
      .filter(item => {
        if (!item || !item.date) {
          return false;
        }
        // Ensure we have valid numeric values for both orders and revenue
        const orders = parseInt(item.orders || item.value || 0, 10);
        const revenue = parseFloat(item.revenue || item.value || 0);
        // Accept items even if one value is 0, as long as it's a valid number
        return !isNaN(orders) && !isNaN(revenue);
      })
      .map((item, index) => {
        const dateStr = item.date;
        const formattedDate = formatDate(dateStr);
        // Handle both 'orders'/'revenue' format and 'value' format from backend
        const orders = parseInt(item.orders || item.value || 0, 10);
        const revenue = parseFloat(item.revenue || item.value || 0);
        
        const processedItem = {
          ...item,
          date: formattedDate, // Display formatted date
          dateValue: dateStr, // Keep original for sorting
          orders: isNaN(orders) ? 0 : orders,
          revenue: isNaN(revenue) ? 0 : revenue
        };
        
        // Log the first few processed items for debugging
        if (index < 3) {
          console.log('TrendChart: Processed item', index, ':', processedItem);
        }
        
        return processedItem;
      })
      .sort((a, b) => {
        // Sort by original date value
        if (a.dateValue && b.dateValue) {
          return new Date(a.dateValue) - new Date(b.dateValue);
        }
        return 0;
      });

    console.log('TrendChart: Processed data:', processed.length, 'items');
    console.log('TrendChart: Sample processed:', processed.slice(0, 3));
    console.log('TrendChart: ViewType:', viewType, 'DataKey will be:', viewType === 'revenue' ? 'revenue' : 'orders');
    
    return processed;
  }, [data, viewType]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Order and Revenue Trend</h3>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No trend data available
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Order and Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            angle={-45}
            textAnchor="end"
            height={80}
            interval={chartData.length > 15 ? Math.floor(chartData.length / 10) : 0}
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            label={{ value: viewType === 'revenue' ? 'Revenue (₹)' : 'Orders', angle: -90, position: 'insideLeft' }}
            domain={viewType === 'revenue' 
              ? ['auto', 'auto'] 
              : [0, 'auto']}
            allowDataOverflow={false}
          />
          <Tooltip 
            formatter={(value) => {
              if (viewType === 'revenue') {
                return `₹${parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
              return parseInt(value || 0).toLocaleString('en-IN');
            }}
            labelFormatter={(label) => `Date: ${label}`}
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
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Date: {data.date}</p>
                    {viewType === 'revenue' ? (
                      <p>Revenue: <strong>₹{parseFloat(data.revenue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                    ) : (
                      <p>Orders: <strong>{parseInt(data.orders || 0).toLocaleString('en-IN')}</strong></p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={viewType === 'revenue' ? 'revenue' : 'orders'} 
            stroke={viewType === 'revenue' ? 'var(--success-color)' : 'var(--primary-color)'} 
            strokeWidth={2.5}
            name={viewType === 'revenue' ? 'Revenue' : 'Orders'}
            dot={{ r: 4, fill: viewType === 'revenue' ? 'var(--success-color)' : 'var(--primary-color)' }}
            activeDot={{ r: 6, fill: viewType === 'revenue' ? 'var(--success-color)' : 'var(--primary-color)' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;