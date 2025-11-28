import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const productDropdownRef = useRef(null);
  
  // Debug: Log when pincodes change
  useEffect(() => {
    if (pincodes && pincodes.length > 0) {
      console.log(`📍 Pincodes loaded in Filters component: ${pincodes.length} pincodes available`);
    } else {
      console.warn('⚠️ No pincodes available in Filters component');
    }
  }, [pincodes]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target)) {
        const input = event.target.closest('.searchable-select');
        if (!input) {
          setShowProductDropdown(false);
        }
      }
    };

    if (showProductDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showProductDropdown]);

  const filteredProducts = useMemo(() => {
    if (!productSearch || !productSearch.trim()) return products;
    
    const searchTerm = productSearch.toLowerCase().trim();
    
    // Filter products that contain the search term (case-insensitive)
    const filtered = products.filter(p => {
      if (!p) return false;
      const productName = String(p).toLowerCase().trim();
      return productName.includes(searchTerm);
    });
    
    // Debug logging
    if (productSearch && productSearch.trim()) {
      console.log(`🔍 Searching for "${productSearch}": Found ${filtered.length} products out of ${products.length} total`);
      if (filtered.length > 0 && filtered.length <= 10) {
        console.log('📋 Matching products:', filtered);
      }
    }
    
    return filtered;
  }, [products, productSearch]);

  const filteredPincodes = useMemo(() => {
    // If no search term, return all pincodes
    if (!pincodeSearch || !pincodeSearch.trim()) {
      console.log(`📍 Pincode search empty: Showing all ${pincodes.length} pincodes`);
      return pincodes;
    }
    
    const searchTerm = pincodeSearch.toLowerCase().trim();
    
    // Filter pincodes that contain the search term (case-insensitive)
    // Also support exact match and starts-with match for better UX
    const filtered = pincodes.filter(p => {
      if (!p) return false;
      const pincodeStr = String(p).toLowerCase().trim();
      // Support: exact match, starts with, or contains
      return pincodeStr === searchTerm || 
             pincodeStr.startsWith(searchTerm) || 
             pincodeStr.includes(searchTerm);
    });
    
    // Debug logging
    console.log(`🔍 Searching for pincode "${pincodeSearch}": Found ${filtered.length} pincodes out of ${pincodes.length} total`);
    if (filtered.length > 0 && filtered.length <= 10) {
      console.log('📍 Matching pincodes:', filtered);
    } else if (filtered.length === 0 && pincodes.length > 0) {
      console.warn(`⚠️ No pincodes found matching "${pincodeSearch}". Available pincodes: ${pincodes.slice(0, 5).join(', ')}${pincodes.length > 5 ? '...' : ''}`);
    }
    
    return filtered;
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
        <label>Search by Product (Multi-select)</label>
        <div className="searchable-select">
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '6px', 
            marginBottom: '8px',
            minHeight: '32px',
            padding: '4px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            background: 'white'
          }}>
            {productFilter && productFilter.length > 0 ? (
              productFilter.map(product => (
                <span
                  key={product}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 8px',
                    background: 'var(--primary-color)',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newFilter = productFilter.filter(p => p !== product);
                    onProductFilterChange(newFilter);
                  }}
                >
                  {product}
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>×</span>
                </span>
              ))
            ) : (
              <span style={{ color: '#999', fontSize: '0.9rem', padding: '4px' }}>
                No products selected
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Type to search products..."
            value={productSearch}
            onChange={(e) => {
              setProductSearch(e.target.value);
              setShowProductDropdown(true);
            }}
            onFocus={() => setShowProductDropdown(true)}
            onBlur={(e) => {
              // Don't close if clicking inside the dropdown
              if (productDropdownRef.current && productDropdownRef.current.contains(e.relatedTarget)) {
                return;
              }
              // Delay closing to allow checkbox clicks
              setTimeout(() => {
                if (!productDropdownRef.current || !productDropdownRef.current.contains(document.activeElement)) {
                  setShowProductDropdown(false);
                }
              }, 200);
            }}
          />
          {showProductDropdown && (
            <div 
              ref={productDropdownRef}
              className="dropdown-list" 
              style={{ maxHeight: '300px', overflowY: 'auto' }}
              onMouseDown={(e) => e.preventDefault()} // Prevent blur when clicking inside
            >
              <div 
                className="dropdown-item"
                onClick={() => {
                  onProductFilterChange([]);
                  setProductSearch('');
                }}
                style={{ 
                  fontWeight: 'bold',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '8px',
                  marginBottom: '4px',
                  backgroundColor: '#fee2e2'
                }}
              >
                Clear All
              </div>
              {filteredProducts.slice(0, 100).map(product => {
                const isSelected = productFilter && productFilter.includes(product);
                return (
                  <div 
                    key={product} 
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const newFilter = isSelected
                        ? productFilter.filter(p => p !== product)
                        : [...(productFilter || []), product];
                      onProductFilterChange(newFilter);
                      // Don't clear search or close dropdown - allow multiple selections
                    }}
                    onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      background: isSelected ? '#f0f9ff' : 'white',
                      borderLeft: isSelected ? '3px solid var(--primary-color)' : '3px solid transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      readOnly
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const newFilter = isSelected
                          ? productFilter.filter(p => p !== product)
                          : [...(productFilter || []), product];
                        onProductFilterChange(newFilter);
                      }}
                      style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                    />
                    <span style={{ flex: 1 }}>{product}</span>
                    {isSelected && (
                      <span style={{ color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: 'bold' }}>✓</span>
                    )}
                  </div>
                );
              })}
              {filteredProducts.length === 0 && (
                <div className="dropdown-item">No products found</div>
              )}
              {filteredProducts.length > 100 && (
                <div className="dropdown-item" style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', 
                  fontStyle: 'italic',
                  cursor: 'default'
                }}>
                  Showing first 100 results. Use search to filter.
                </div>
              )}
            </div>
          )}
        </div>
        {productFilter && productFilter.length > 0 && (
          <div style={{ 
            marginTop: '6px', 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}>
            {productFilter.length} product{productFilter.length !== 1 ? 's' : ''} selected
          </div>
        )}
      </div>

      <div className="filter-group">
        <label>Search by Pincode</label>
        <div className="searchable-select">
          {/* Show selected pincode as a tag/chip */}
          {pincodeFilter !== 'All' && (
            <div style={{ 
              display: 'flex', 
              flexWrap: 'wrap', 
              gap: '6px', 
              marginBottom: '8px',
              minHeight: '32px',
              padding: '4px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              background: 'white'
            }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  background: 'var(--primary-color)',
                  color: 'white',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onPincodeFilterChange('All');
                  setPincodeSearch('');
                }}
              >
                {pincodeFilter}
                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>×</span>
              </span>
            </div>
          )}
          <input
            type="text"
            placeholder="Type to search pincodes..."
            value={pincodeSearch}
            onChange={(e) => {
              const value = e.target.value;
              setPincodeSearch(value);
              // Always show dropdown when typing
              if (value.trim()) {
                setShowPincodeDropdown(true);
              } else {
                // Show all pincodes when search is cleared
                setShowPincodeDropdown(true);
              }
            }}
            onFocus={() => {
              setShowPincodeDropdown(true);
              console.log(`📍 Pincode input focused. Available pincodes: ${pincodes.length}`);
            }}
            onBlur={() => {
              // Delay closing to allow clicks on dropdown items
              setTimeout(() => {
                setShowPincodeDropdown(false);
              }, 200);
            }}
          />
          {showPincodeDropdown && (
            <div className="dropdown-list" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <div 
                className="dropdown-item"
                onClick={() => {
                  onPincodeFilterChange('All');
                  setPincodeSearch('');
                  setShowPincodeDropdown(false);
                }}
                style={{
                  fontWeight: 'bold',
                  borderBottom: '1px solid #e2e8f0',
                  paddingBottom: '8px',
                  marginBottom: '4px'
                }}
              >
                All Pincodes
              </div>
              {filteredPincodes.length > 0 ? (
                filteredPincodes.slice(0, 100).map(pincode => (
                  <div 
                    key={pincode} 
                    className="dropdown-item"
                    onClick={() => {
                      onPincodeFilterChange(pincode);
                      setPincodeSearch('');
                      setShowPincodeDropdown(false);
                    }}
                    style={{
                      background: pincodeFilter === pincode ? '#f0f9ff' : 'white',
                      borderLeft: pincodeFilter === pincode ? '3px solid var(--primary-color)' : '3px solid transparent',
                      cursor: 'pointer'
                    }}
                  >
                    {pincode}
                    {pincodeFilter === pincode && (
                      <span style={{ color: 'var(--primary-color)', fontSize: '0.9rem', fontWeight: 'bold', marginLeft: '8px' }}>✓</span>
                    )}
                  </div>
                ))
              ) : (
                <div className="dropdown-item" style={{ 
                  color: '#999', 
                  fontStyle: 'italic',
                  cursor: 'default'
                }}>
                  {pincodes.length === 0 
                    ? 'No pincodes available' 
                    : `No pincodes found matching "${pincodeSearch}"`}
                </div>
              )}
              {filteredPincodes.length > 100 && (
                <div className="dropdown-item" style={{ 
                  fontSize: '0.85rem', 
                  color: 'var(--text-secondary)', 
                  fontStyle: 'italic',
                  cursor: 'default'
                }}>
                  Showing first 100 results. Use search to filter.
                </div>
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