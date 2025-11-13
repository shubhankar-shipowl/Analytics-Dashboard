import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Chart.css';

const COLORS = ['#ff8b42', '#10b981', '#ff6b1a', '#06b6d4', '#f59e0b'];

const PaymentMethodChart = ({ data }) => {
  return (
    <div className="chart-container">
      <h3 className="chart-title">COD and PPD Distribution</h3>
      <div className="chart-grid">
        <div className="chart-item">
          <h4>By Number</h4>
          <div style={{ width: '100%' }}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="method" />
              <YAxis />
              <Tooltip />
              <Legend />
                <Bar dataKey="count" fill="var(--primary-color)" />
            </BarChart>
          </ResponsiveContainer>
          </div>
        </div>
        <div className="chart-item">
          <h4>By Percentage</h4>
          {data && data.length > 0 ? (
            <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
              <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      const percentage = parseFloat(percent * 100) || 0;
                      const methodName = payload?.method || 'Unknown';
                      const orderCount = parseInt(payload?.count || 0, 10);
                      
                      // For larger segments (> 5%), show method and percentage
                      if (percentage > 5) {
                        return (
                          <text 
                            x={x} 
                            y={y} 
                            fill="black"
                            textAnchor={x > cx ? 'start' : 'end'} 
                            dominantBaseline="central"
                            fontSize={12}
                            fontWeight="bold"
                            style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}
                          >
                            {methodName}
                            <tspan x={x} dy="15" fontSize={11}>
                              {percentage.toFixed(1)}%
                            </tspan>
                          </text>
                        );
                      }
                      // For smaller segments, just show percentage
                      return (
                        <text 
                          x={x} 
                          y={y} 
                          fill="black"
                          textAnchor={x > cx ? 'start' : 'end'} 
                          dominantBaseline="central"
                          fontSize={11}
                          fontWeight="bold"
                          style={{ textShadow: '0 0 2px rgba(255,255,255,0.8)' }}
                        >
                          {percentage.toFixed(1)}%
                        </text>
                      );
                    }}
                    outerRadius={120}
                    innerRadius={50}
                fill="#8884d8"
                dataKey="count"
                    paddingAngle={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
                  <Tooltip 
                    formatter={(value, name, props) => {
                      const { method, percentage } = props.payload;
                      return [
                        `${value} (${parseFloat(percentage || 0).toFixed(2)}%)`,
                        method
                      ];
                    }}
                  />
                  <Legend 
                    formatter={(value, entry) => {
                      if (!entry || !entry.payload) {
                        const dataItem = data.find(item => item.method === value);
                        if (dataItem) {
                          return `${dataItem.method} (${parseFloat(dataItem.percentage || 0).toFixed(1)}%)`;
                        }
                        return value;
                      }
                      const method = entry.payload?.method || entry.payload?.status || 'Unknown';
                      const percent = parseFloat(entry.payload?.percentage || 0);
                      const count = parseInt(entry.payload?.count || 0, 10);
                      
                      // Only show in legend if count > 0
                      if (count > 0) {
                        return `${method} (${percent.toFixed(1)}%)`;
                      }
                      return '';
                    }}
                  />
            </PieChart>
          </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No data available
            </div>
          )}
        </div>
      </div>
      <div className="chart-table">
        <table>
          <thead>
            <tr>
              <th>Payment Method</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                <td>{item.method}</td>
                <td>{parseInt(item.count || 0, 10).toLocaleString('en-IN')}</td>
                <td>{parseFloat(item.percentage || 0).toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentMethodChart;