import React, { useState, useMemo } from 'react';
import './Filters.css';

const Filters = ({ 
  dateFilter, 
  onDateFilterChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  productFilter, 
  onProductFilterChange, 
  pincodeFilter, 
  onPincodeFilterChange,
  products,
  pincodes,
  viewType,
  onViewTypeChange
}) => {
  const [productSearch, setProductSearch] = useState('');
  const [pincodeSearch, setPincodeSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showPincodeDropdown, setShowPincodeDropdown] = useState(false);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    return products.filter(p => 
      String(p).toLowerCase().includes(productSearch.toLowerCase())
    );
  }, [products, productSearch]);

  const filteredPincodes = useMemo(() => {
    if (!pincodeSearch) return pincodes;
    return pincodes.filter(p => 
      String(p).toLowerCase().includes(pincodeSearch.toLowerCase())
    );
  }, [pincodes, pincodeSearch]);

  return (
    <div className="filters-container">
      <h3 className="filters-title">🔍 Filters & Search</h3>
      
      <div className="filter-group">
        <label>Time Period</label>
        <select value={dateFilter} onChange={(e) => onDateFilterChange(e.target.value)}>
          <option value="Lifetime">Lifetime</option>
          <option value="Last 7 Days">Last 7 Days</option>
          <option value="Last 30 Days">Last 30 Days</option>
          <option value="Yearly">Yearly</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      {dateFilter === 'Custom' && (
        <div className="filter-group">
          <label>Start Date</label>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => onCustomStartDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          />
        </div>
      )}

      {dateFilter === 'Custom' && (
        <div className="filter-group">
          <label>End Date</label>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => onCustomEndDateChange(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '0.9rem'
            }}
          />
        </div>
      )}

      <div className="filter-group">
        <label>Search by Product</label>
        <div className="searchable-select">
          <input
            type="text"
            placeholder="Type to search products..."
            value={productFilter !== 'All' ? productFilter : productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setShowProductDropdown(true);
            }}
            onFocus={() => setShowProductDropdown(true)}
            onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
          />
          {showProductDropdown && (
            <div className="dropdown-list">
              <div 
                className="dropdown-item"
                onClick={() => {
                  onProductFilterChange('All');
                  setProductSearch('');
                  setShowProductDropdown(false);
                }}
              >
                All Products
              </div>
              {filteredProducts.slice(0, 50).map(product => (
                <div 
                  key={product} 
                  className="dropdown-item"
                  onClick={() => {
                    onProductFilterChange(product);
                    setProductSearch('');
                    setShowProductDropdown(false);
                  }}
                >
                  {product}
                </div>
              ))}
              {filteredProducts.length === 0 && (
                <div className="dropdown-item">No products found</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="filter-group">
        <label>Search by Pincode</label>
        <div className="searchable-select">
          <input
            type="text"
            placeholder="Type to search pincodes..."
            value={pincodeFilter !== 'All' ? pincodeFilter : pincodeSearch}
            onChange={(e) => {
              setPincodeSearch(e.target.value);
              setShowPincodeDropdown(true);
            }}
            onFocus={() => setShowPincodeDropdown(true)}
            onBlur={() => setTimeout(() => setShowPincodeDropdown(false), 200)}
          />
          {showPincodeDropdown && (
            <div className="dropdown-list">
              <div 
                className="dropdown-item"
                onClick={() => {
                  onPincodeFilterChange('All');
                  setPincodeSearch('');
                  setShowPincodeDropdown(false);
                }}
              >
                All Pincodes
              </div>
              {filteredPincodes.slice(0, 50).map(pincode => (
                <div 
                  key={pincode} 
                  className="dropdown-item"
                  onClick={() => {
                    onPincodeFilterChange(pincode);
                    setPincodeSearch('');
                    setShowPincodeDropdown(false);
                  }}
                >
                  {pincode}
                </div>
              ))}
              {filteredPincodes.length === 0 && (
                <div className="dropdown-item">No pincodes found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {viewType !== undefined && (
        <div className="filter-group">
          <label>View Type</label>
          <div className="radio-group">
            <label>
              <input 
                type="radio" 
                value="orders" 
                checked={viewType === 'orders'} 
                onChange={() => onViewTypeChange('orders')} 
              />
              Order View
            </label>
            <label>
              <input 
                type="radio" 
                value="revenue" 
                checked={viewType === 'revenue'} 
                onChange={() => onViewTypeChange('revenue')} 
              />
              Revenue View
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

export default Filters;