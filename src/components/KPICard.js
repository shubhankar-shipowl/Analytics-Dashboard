import React from 'react';
import './KPICard.css';

const KPICard = ({ title, value, format = 'number', icon }) => {
  const formatValue = (val) => {
    if (format === 'currency') {
      return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return val.toLocaleString('en-IN');
  };

  // Check if value is a string (for Top Pincode) or number
  const displayValue = typeof value === 'string' ? value : formatValue(value || 0);
  
  // Determine if value is long (more than 15 characters)
  const isLongValue = String(displayValue).length > 15;

  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-content">
        <div className="kpi-title">{title}</div>
        <div className={`kpi-value ${isLongValue ? 'long-value' : ''}`} title={displayValue}>
          {displayValue}
        </div>
      </div>
    </div>
  );
};

export default KPICard;