import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TopProductsChart = ({ data, by }) => {
  // Limit to exactly 10 products and format product names
  const formattedData = (data || []).slice(0, 10).map(item => ({
    ...item,
    product: item.product && item.product.length > 30 
      ? item.product.substring(0, 30) + '...' 
      : item.product
  }));

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
                return [`₹${value.toLocaleString('en-IN')}`, 'Revenue'];
              }
              return [value, 'Orders'];
            }}
            labelFormatter={(label) => `Product: ${label}`}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #ccc',
              borderRadius: '4px',
              padding: '8px'
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