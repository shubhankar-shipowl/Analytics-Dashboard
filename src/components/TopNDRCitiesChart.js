import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TopNDRCitiesChart = ({ data }) => {
  // Limit to exactly 10 pincodes
  const formattedData = (data && Array.isArray(data) ? data : [])
    .filter(item => item && item.pincode)
    .slice(0, 10)
    .map(item => ({
      ...item,
      ndrCount: parseInt(item.ndrCount || 0),
      totalOrders: parseInt(item.totalOrders || 0),
      cancelledOrders: parseInt(item.cancelledOrders || 0),
      nonCancelledOrders: parseInt(item.nonCancelledOrders || 0),
      ndrRatio: parseFloat(item.ndrRatio || 0)
    }));

  if (!formattedData || formattedData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Top 10 NDR by Pincode</h3>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No NDR data available
        </div>
      </div>
    );
  }

  return (
    <div className="chart-container">
      <h3 className="chart-title">Top 10 NDR by Pincode</h3>
      <ResponsiveContainer width="100%" height={450}>
        <BarChart 
          data={formattedData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis 
            dataKey="pincode" 
            type="category" 
            width={130}
            tick={{ fontSize: 12 }}
            interval={0}
          />
          <Tooltip 
            formatter={(value, name) => {
              if (name === 'ndrCount') {
                return [parseInt(value || 0).toLocaleString('en-IN'), 'NDR Count'];
              }
              return [value, name];
            }}
            labelFormatter={(label) => `Pincode: ${label}`}
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
                    <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Pincode: {data.pincode || 'N/A'}</p>
                    <p>NDR Count: <strong>{parseInt(data.ndrCount || 0).toLocaleString('en-IN')}</strong></p>
                    <p>Total Orders: {parseInt(data.totalOrders || 0).toLocaleString('en-IN')}</p>
                    <p>Cancelled Orders: {parseInt(data.cancelledOrders || 0).toLocaleString('en-IN')}</p>
                    <p>Non-Cancelled Orders: {parseInt(data.nonCancelledOrders || 0).toLocaleString('en-IN')}</p>
                    <p>NDR Ratio: {parseFloat(data.ndrRatio || 0).toFixed(2)}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Legend />
          <Bar 
            dataKey="ndrCount" 
            fill="var(--primary-color)"
            radius={[0, 4, 4, 0]}
            name="NDR Count"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopNDRCitiesChart;

