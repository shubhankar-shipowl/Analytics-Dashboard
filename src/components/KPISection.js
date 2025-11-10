import React from 'react';
import KPICard from './KPICard';
import './KPISection.css';

const KPISection = ({ kpis }) => {
  return (
    <div className="kpi-section">
      <h2 className="section-title">Key Performance Indicators</h2>
      <div className="kpi-grid">
        <KPICard title="Total Orders" value={kpis.totalOrders} icon="📦" />
        <KPICard title="Total Revenue" value={kpis.totalRevenue} format="currency" icon="💰" />
        <KPICard title="Average Order Value" value={kpis.avgOrderValue} format="currency" icon="📊" />
        <KPICard title="Total COD" value={kpis.totalCOD} format="currency" icon="💵" />
        <KPICard title="Total RTO" value={kpis.totalRTO} icon="↩️" />
        <KPICard title="Total RTS" value={kpis.totalRTS} icon="✅" />
      </div>
    </div>
  );
};

export default KPISection;