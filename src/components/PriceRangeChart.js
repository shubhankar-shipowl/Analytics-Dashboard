import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const PriceRangeChart = ({ data }) => {
  return (
    <div className="chart-container">
      <h3 className="chart-title">Price Range Distribution</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="count" fill="var(--primary-color)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PriceRangeChart;