import React from 'react';
import './KPICard.css';

const KPICard = ({ title, value, format = 'number', icon }) => {
  const formatValue = (val) => {
    if (format === 'currency') {
      return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString('en-IN');
  };

  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-content">
        <div className="kpi-title">{title}</div>
        <div className="kpi-value">{formatValue(value)}</div>
      </div>
    </div>
  );
};

export default KPICard;