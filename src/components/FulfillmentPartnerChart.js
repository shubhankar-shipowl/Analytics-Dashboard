import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const FulfillmentPartnerChart = ({ data }) => {
  return (
    <div className="chart-container">
      <h3 className="chart-title">Fulfillment Partner Analysis</h3>
      <div className="chart-grid">
        <div className="chart-item">
          <h4>Orders by Partner</h4>
          <div style={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partner" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="orders" fill="var(--primary-color)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-item">
          <h4>Revenue by Partner</h4>
          <div style={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partner" />
                <YAxis />
                <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                <Legend />
                <Bar dataKey="revenue" fill="var(--accent-color)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentPartnerChart;