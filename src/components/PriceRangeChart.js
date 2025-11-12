import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const PriceRangeChart = ({ data }) => {
  const chartData = (data && Array.isArray(data) ? data : [])
    .filter(item => item && item.label)
    .map(item => ({
      ...item,
      count: parseInt(item.count || 0)
    }));

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Price Range Distribution</h3>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No price range data available
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Price Range Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" angle={-45} textAnchor="end" height={100} />
          <YAxis />
          <Tooltip 
            formatter={(value) => [parseInt(value || 0).toLocaleString('en-IN'), 'Count']}
            labelFormatter={(label) => `Range: ${label}`}
          />
          <Legend />
          <Bar dataKey="count" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceRangeChart;