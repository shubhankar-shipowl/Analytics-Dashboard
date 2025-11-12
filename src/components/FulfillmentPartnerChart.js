import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const FulfillmentPartnerChart = ({ data }) => {
  const chartData = (data && Array.isArray(data)) ? data.filter(item => item && item.partner) : [];

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Fulfillment Partner Analysis</h3>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No fulfillment partner data available
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Fulfillment Partner Analysis</h3>
      <div className="chart-grid">
        <div className="chart-item">
          <h4>Orders by Partner</h4>
          <div style={{ width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partner" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value.toLocaleString('en-IN'), 'Orders']}
                  labelFormatter={(label) => `Partner: ${label}`}
                />
                <Legend />
                <Bar dataKey="orders" fill="var(--primary-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-item">
          <h4>Revenue by Partner</h4>
          <div style={{ width: '100%', minHeight: '300px' }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="partner" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [`₹${parseFloat(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Revenue']}
                  labelFormatter={(label) => `Partner: ${label}`}
                />
                <Legend />
                <Bar dataKey="revenue" fill="var(--accent-color)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FulfillmentPartnerChart;