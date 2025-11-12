import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TopProductsChart = ({ data, by = 'orders' }) => {
  // Limit to exactly 10 products and format product names
  const formattedData = (data && Array.isArray(data) ? data : [])
    .filter(item => item && item.product)
    .slice(0, 10)
    .map(item => ({
      ...item,
      product: item.product && item.product.length > 30 
        ? item.product.substring(0, 30) + '...' 
        : item.product,
      orders: item.orders || 0,
      revenue: parseFloat(item.revenue || 0)
    }));

  if (!formattedData || formattedData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Top 10 Products {by === 'orders' ? 'by Orders' : 'by Revenue'}</h3>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No product data available
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Top 10 Products {by === 'orders' ? 'by Orders' : 'by Revenue'}</h3>
      <ResponsiveContainer width="100%" height={450}>
        <BarChart 
          data={formattedData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            dataKey="product" 
            type="category" 
            width={180}
            tick={{ fontSize: 12 }}
            interval={0}
          />
          <Tooltip 
            formatter={(value, name) => {
              if (by === 'revenue') {
                return [`₹${parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue'];
              }
              return [parseInt(value || 0).toLocaleString('en-IN'), 'Orders'];
            }}
            labelFormatter={(label) => `Product: ${label}`}
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
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.product}</p>
                    {by === 'revenue' ? (
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
          <Legend 
            formatter={(value) => by === 'revenue' ? 'Revenue' : 'Orders'}
          />
          <Bar 
            dataKey={by === 'orders' ? 'orders' : 'revenue'} 
            fill="var(--primary-color)"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopProductsChart;