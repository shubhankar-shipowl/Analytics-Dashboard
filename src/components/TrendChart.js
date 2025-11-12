import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TrendChart = ({ data, viewType = 'orders' }) => {
  const chartData = (data && Array.isArray(data) ? data : [])
    .filter(item => item && item.date)
    .map(item => ({
      ...item,
      date: item.date,
      orders: parseInt(item.orders || 0),
      revenue: parseFloat(item.revenue || 0)
    }));

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
          <XAxis dataKey="date" />
          <YAxis />
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
            stroke="var(--primary-color)" 
            strokeWidth={2}
            name={viewType === 'revenue' ? 'Revenue' : 'Orders'}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;