import React, { useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Chart.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffd7a8'];

const OrderStatusChart = ({ data, deliveryRatio, deliveryRatioByPartner }) => {
  // Force re-render when data changes
  useEffect(() => {
    // This ensures the component re-renders when props change
  }, [data, deliveryRatio, deliveryRatioByPartner]);
  return (
    <div className="chart-container">
      <h3 className="chart-title">Order Status Distribution</h3>
      <div className="chart-grid">
        <div className="chart-item">
          <h4>Delivery Ratio by Fulfilled By</h4>
          {deliveryRatio && (
            <div style={{ 
              marginBottom: '20px',
              padding: '15px',
              background: '#f7fafc',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: '600', 
                color: '#4a5568',
                marginBottom: '5px'
              }}>
                Overall Delivery Ratio
              </div>
              <div style={{ 
                fontSize: '2rem', 
                fontWeight: 'bold', 
                color: '#667eea',
                marginBottom: '5px'
              }}>
                {deliveryRatio.ratio}%
              </div>
              <div style={{ 
                color: '#718096',
                fontSize: '0.85rem'
              }}>
                {deliveryRatio.deliveredCount.toLocaleString()} out of {deliveryRatio.totalOrders.toLocaleString()} orders
              </div>
            </div>
          )}
          <ResponsiveContainer width="100%" height={400}>
            <BarChart 
              key={`delivery-ratio-${deliveryRatioByPartner?.length || 0}`}
              data={deliveryRatioByPartner || []}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis dataKey="partner" type="category" width={100} />
              <Tooltip 
                formatter={(value, name, props) => {
                  if (name === 'ratioValue') {
                    return [`${value.toFixed(2)}%`, 'Delivery Ratio'];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `Partner: ${label}`}
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
                        <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>{data.partner}</p>
                        <p>Delivery Ratio: <strong>{data.ratio}%</strong></p>
                        <p>Delivered: {data.deliveredCount.toLocaleString()}</p>
                        <p>Total Orders: {data.totalOrders.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar 
                dataKey="ratioValue" 
                fill="#667eea"
                name="Delivery Ratio (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="chart-item">
          <h4>By Percentage</h4>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ status, percentage }) => `${status}: ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="chart-table">
        <table>
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.status}</td>
                <td>{item.count.toLocaleString()}</td>
                <td>{item.percentage}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderStatusChart;