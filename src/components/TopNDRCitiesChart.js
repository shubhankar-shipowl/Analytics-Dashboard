import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './Chart.css';

const TopNDRCitiesChart = ({ data }) => {
  // Validate and format data
  const formattedData = React.useMemo(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }

    return data
      .filter(item => {
        // Ensure item exists and has required fields
        if (!item || !item.pincode) return false;
        // Ensure pincode is not empty
        const pincode = String(item.pincode || '').trim();
        return pincode !== '' && pincode !== 'null' && pincode !== 'undefined';
      })
      .slice(0, 10) // Limit to top 10
      .map(item => {
        // Parse all numeric fields to ensure they're numbers
        const ndrCount = parseInt(item.ndrCount || 0, 10);
        const totalOrders = parseInt(item.totalOrders || 0, 10);
        const cancelledOrders = parseInt(item.cancelledOrders || 0, 10);
        const nonCancelledOrders = parseInt(item.nonCancelledOrders || 0, 10);
        const ndrRatio = parseFloat(item.ndrRatio || 0);

        return {
          pincode: String(item.pincode || '').trim(),
          totalOrders: isNaN(totalOrders) ? 0 : totalOrders,
          cancelledOrders: isNaN(cancelledOrders) ? 0 : cancelledOrders,
          ndrCount: isNaN(ndrCount) ? 0 : ndrCount,
          nonCancelledOrders: isNaN(nonCancelledOrders) ? 0 : nonCancelledOrders,
          ndrRatio: isNaN(ndrRatio) ? 0 : ndrRatio
        };
      })
      .filter(item => item.ndrCount > 0); // Only show pincodes with NDR orders
  }, [data]);

  if (!formattedData || formattedData.length === 0) {
    return (
      <div className="chart-container">
        <h3 className="chart-title">Top 10 NDR by Pincode</h3>
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No NDR data available for the selected filters
        </div>
      </div>
    );
  }

  const chartTitle = formattedData.length === 1 
    ? `NDR Data for Pincode: ${formattedData[0].pincode}`
    : `Top ${Math.min(formattedData.length, 10)} NDR by Pincode`;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{chartTitle}</h3>
      <ResponsiveContainer width="100%" height={450} minHeight={300}>
        <BarChart 
          data={formattedData} 
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            type="number" 
            label={{ value: 'NDR Count', position: 'insideBottom', offset: -5 }}
          />
          <YAxis 
            dataKey="pincode" 
            type="category" 
            width={130}
            tick={{ fontSize: 12 }}
            interval={0}
            label={{ value: 'Pincode', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip 
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div style={{
                    background: 'white',
                    padding: '12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}>
                    <p style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>
                      Pincode: {data.pincode || 'N/A'}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '13px' }}>
                      NDR Count: <strong style={{ color: 'var(--primary-color)' }}>
                        {parseInt(data.ndrCount || 0).toLocaleString('en-IN')}
                      </strong>
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '13px' }}>
                      Total Orders: {parseInt(data.totalOrders || 0).toLocaleString('en-IN')}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '13px' }}>
                      Cancelled Orders: {parseInt(data.cancelledOrders || 0).toLocaleString('en-IN')}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '13px' }}>
                      Non-Cancelled Orders: {parseInt(data.nonCancelledOrders || 0).toLocaleString('en-IN')}
                    </p>
                    <p style={{ margin: '4px 0', fontSize: '13px' }}>
                      NDR Ratio: <strong>{parseFloat(data.ndrRatio || 0).toFixed(2)}%</strong>
                    </p>
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

