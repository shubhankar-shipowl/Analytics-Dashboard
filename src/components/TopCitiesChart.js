import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TopCitiesChart = ({ data, by = 'orders', sortDirection = 'top' }) => {
  // Limit to exactly 10 cities
  const formattedData = (data || []).slice(0, 10);
  
  const chartTitle = sortDirection === 'bottom' 
    ? `Bottom 10 Cities ${by === 'orders' ? 'by Orders' : 'by Revenue'}`
    : `Top 10 Cities ${by === 'orders' ? 'by Orders' : 'by Revenue'}`;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      <ResponsiveContainer width="100%" height={450}>
        <BarChart 
          data={formattedData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            dataKey="city" 
            type="category" 
            width={130}
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
            labelFormatter={(label) => `City: ${label}`}
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

export default TopCitiesChart;
