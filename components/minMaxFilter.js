// components/minMaxFilter.js - Min/Max Range Filter for Tabulator
// NHL version - Blue theme (#1e40af)
// Compact dual-input filter for numeric columns (prop values, odds)

export function createMinMaxFilter(cell, onRendered, success, cancel, editorParams = {}) {
    const maxWidth = editorParams.maxWidth || 45;
    
    const container = document.createElement('div');
    container.className = 'min-max-filter-container';
    container.style.cssText = `
        display: flex;
        flex-direction: column;
        gap: 2px;
        width: 100%;
        max-width: ${maxWidth}px;
        margin: 0 auto;
    `;
    
    const inputStyle = `
        width: 100%;
        padding: 2px 3px;
        font-size: 9px;
        border: 1px solid #ccc;
        border-radius: 2px;
        text-align: center;
        box-sizing: border-box;
        -moz-appearance: textfield;
        -webkit-appearance: none;
        appearance: none;
    `;
    
    const minInput = document.createElement('input');
    minInput.type = 'number';
    minInput.className = 'min-max-input min-input';
    minInput.placeholder = 'Min';
    minInput.style.cssText = inputStyle;
    
    const maxInput = document.createElement('input');
    maxInput.type = 'number';
    maxInput.className = 'min-max-input max-input';
    maxInput.placeholder = 'Max';
    maxInput.style.cssText = inputStyle;
    
    let filterTimeout = null;
    
    function applyFilter() {
        if (filterTimeout) {
            clearTimeout(filterTimeout);
        }
        
        filterTimeout = setTimeout(() => {
            const minVal = minInput.value !== '' ? parseFloat(minInput.value) : null;
            const maxVal = maxInput.value !== '' ? parseFloat(maxInput.value) : null;
            
            if (minVal === null && maxVal === null) {
                success(null);
            } else {
                success({ min: minVal, max: maxVal });
            }
        }, 300);
    }
    
    [minInput, maxInput].forEach(input => {
        input.addEventListener('input', applyFilter);
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') applyFilter();
            if (e.key === 'Escape') {
                minInput.value = '';
                maxInput.value = '';
                applyFilter();
            }
        });
        input.addEventListener('focus', function() {
            this.style.borderColor = '#1e40af';
            this.style.boxShadow = '0 0 0 1px rgba(30, 64, 175, 0.2)';
        });
        input.addEventListener('blur', function() {
            this.style.borderColor = '#ccc';
            this.style.boxShadow = 'none';
        });
    });
    
    container.appendChild(minInput);
    container.appendChild(maxInput);
    
    return container;
}

export function minMaxFilterFunction(headerValue, rowValue, rowData, filterParams) {
    if (!headerValue) return true;
    
    const { min, max } = headerValue;
    
    if (rowValue === null || rowValue === undefined || rowValue === '' || rowValue === '-') {
        return false;
    }
    
    // Parse the row value, handling +/- prefixed odds
    let numValue = parseFloat(String(rowValue).replace('+', ''));
    if (isNaN(numValue)) return false;
    
    if (min !== null && numValue < min) return false;
    if (max !== null && numValue > max) return false;
    
    return true;
}

export default { createMinMaxFilter, minMaxFilterFunction };
