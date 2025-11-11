import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import './Chart.css';

const COLORS = ['#ff8b42', '#ffd7a8', '#FFBB28', '#FF8042', '#fffdfc'];

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
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ method, percentage }) => percentage > 2 ? `${method}: ${percentage}%` : ''}
                outerRadius={100}
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

export default PaymentMethodChart;