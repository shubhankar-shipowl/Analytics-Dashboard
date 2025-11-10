import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TrendChart = ({ data, viewType }) => {
  return (
    <div className="chart-container">
      <h3 className="chart-title">Order and Revenue Trend</h3>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip 
            formatter={(value) => viewType === 'revenue' ? `₹${value.toLocaleString('en-IN')}` : value}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey={viewType === 'revenue' ? 'revenue' : 'orders'} 
            stroke="#667eea" 
            strokeWidth={2}
            name={viewType === 'revenue' ? 'Revenue' : 'Orders'}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;