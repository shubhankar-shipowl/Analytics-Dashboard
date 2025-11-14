import React from 'react';
import './KPICard.css';

const KPICard = React.memo(({ title, value, format = 'number', icon }) => {
  const formatValue = React.useMemo(() => {
    if (format === 'currency') {
      return (val) => `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    return (val) => val.toLocaleString('en-IN');
  }, [format]);

  // Check if value is a string (for Top Pincode) or number
  const displayValue = React.useMemo(() => {
    return typeof value === 'string' ? value : formatValue(value || 0);
  }, [value, formatValue]);
  
  // Determine if value is long (more than 15 characters)
  const isLongValue = React.useMemo(() => String(displayValue).length > 15, [displayValue]);

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
});

KPICard.displayName = 'KPICard';

export default KPICard;