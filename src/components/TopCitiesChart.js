import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TopCitiesChart = ({ data, by = 'orders' }) => {
  return (
    <div className="chart-container">
      <h3 className="chart-title">Top 10 Cities {by === 'orders' ? 'by Orders' : 'by Revenue'}</h3>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis dataKey="city" type="category" width={80} />
          <Tooltip 
            formatter={(value) => by === 'revenue' ? `₹${value.toLocaleString('en-IN')}` : value}
          />
          <Legend />
          <Bar 
            dataKey={by === 'orders' ? 'orders' : 'revenue'} 
            fill="#00C49F" 
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopCitiesChart;
