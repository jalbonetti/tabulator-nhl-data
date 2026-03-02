// components/customMultiSelect.js - Custom Multi-Select Dropdown Filter for Tabulator
// NHL version - Blue theme (#1e40af)
// Dropdowns open ABOVE the table header
// Includes state sync, debounced filter updates

export function createCustomMultiSelect(cell, onRendered, success, cancel, options = {}) {
    const dropdownWidth = options.dropdownWidth || 200;
    
    var button = document.createElement("button");
    button.className = "custom-multiselect-button";
    button.textContent = "Loading...";
    button.style.cssText = `
        width: 100%;
        padding: 4px 8px;
        border: 1px solid #ccc;
        background: white;
        cursor: pointer;
        font-size: 11px;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-radius: 3px;
    `;
    
    var field = cell.getColumn().getField();
    var table = cell.getTable();
    var allValues = [];
    var selectedValues = [];
    var dropdownId = 'dropdown_' + field.replace(/[^a-zA-Z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 9);
    var isOpen = false;
    var isInitialized = false;
    var filterTimeout = null;
    var clickTimeout = null;
    var loadAttempts = 0;
    
    var column = cell.getColumn();
    
    // No expandable rows in NHL version
    function saveExpandedState() {
        return new Set();
    }
    
    function restoreExpandedState(expandedRows) {
        // No-op for NHL (no expandable rows)
    }
    
    function createDropdown() {
        var existing = document.getElementById(dropdownId);
        if (existing) {
            existing.remove();
        }
        
        var dropdown = document.createElement("div");
        dropdown.id = dropdownId;
        dropdown.className = "custom-multiselect-dropdown";
        dropdown.style.cssText = `
            position: fixed;
            width: ${dropdownWidth}px;
            max-height: 250px;
            overflow-y: auto;
            background: white;
            border: 1px solid #333;
            border-radius: 4px;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.15);
            z-index: 2147483647;
            padding: 5px;
        `;
        
        // Position ABOVE the button
        var rect = button.getBoundingClientRect();
        dropdown.style.left = rect.left + 'px';
        dropdown.style.bottom = (window.innerHeight - rect.top + 2) + 'px';
        
        // Select All / Clear All buttons
        var controls = document.createElement("div");
        controls.style.cssText = `
            display: flex;
            justify-content: space-between;
            padding: 4px;
            border-bottom: 1px solid #eee;
            margin-bottom: 4px;
        `;
        
        var selectAll = document.createElement("button");
        selectAll.textContent = "All";
        selectAll.style.cssText = `
            padding: 2px 8px;
            font-size: 10px;
            cursor: pointer;
            background: #1e40af;
            color: white;
            border: none;
            border-radius: 3px;
        `;
        selectAll.addEventListener("click", function(e) {
            e.stopPropagation();
            selectedValues = [...allValues];
            updateCheckboxes(dropdown);
            applyFilterDebounced();
        });
        
        var clearAll = document.createElement("button");
        clearAll.textContent = "Clear";
        clearAll.style.cssText = `
            padding: 2px 8px;
            font-size: 10px;
            cursor: pointer;
            background: #dc2626;
            color: white;
            border: none;
            border-radius: 3px;
        `;
        clearAll.addEventListener("click", function(e) {
            e.stopPropagation();
            selectedValues = [];
            updateCheckboxes(dropdown);
            applyFilterDebounced();
        });
        
        controls.appendChild(selectAll);
        controls.appendChild(clearAll);
        dropdown.appendChild(controls);
        
        // Create checkboxes for each value
        allValues.forEach(function(value) {
            var label = document.createElement("label");
            label.style.cssText = `
                display: flex;
                align-items: center;
                padding: 3px 5px;
                cursor: pointer;
                font-size: 11px;
                gap: 6px;
            `;
            label.addEventListener("mouseover", function() { this.style.background = '#eff6ff'; });
            label.addEventListener("mouseout", function() { this.style.background = 'transparent'; });
            
            var checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = value;
            checkbox.checked = selectedValues.includes(value);
            checkbox.style.cssText = `
                margin: 0;
                cursor: pointer;
                accent-color: #1e40af;
            `;
            
            checkbox.addEventListener("change", function(e) {
                e.stopPropagation();
                if (this.checked) {
                    if (!selectedValues.includes(value)) {
                        selectedValues.push(value);
                    }
                } else {
                    selectedValues = selectedValues.filter(function(v) { return v !== value; });
                }
                applyFilterDebounced();
            });
            
            var text = document.createElement("span");
            text.textContent = value;
            text.style.cssText = `
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            `;
            
            label.appendChild(checkbox);
            label.appendChild(text);
            dropdown.appendChild(label);
        });
        
        document.body.appendChild(dropdown);
        
        // Reposition to ensure visibility
        setTimeout(function() {
            var dropRect = dropdown.getBoundingClientRect();
            if (dropRect.top < 0) {
                dropdown.style.bottom = 'auto';
                dropdown.style.top = (rect.bottom + 2) + 'px';
            }
            if (dropRect.right > window.innerWidth) {
                dropdown.style.left = (window.innerWidth - dropdownWidth - 10) + 'px';
            }
        }, 0);
        
        return dropdown;
    }
    
    function updateCheckboxes(dropdown) {
        if (!dropdown) return;
        var checkboxes = dropdown.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(function(cb) {
            cb.checked = selectedValues.includes(cb.value);
        });
    }
    
    function updateButtonText() {
        if (selectedValues.length === 0 || selectedValues.length === allValues.length) {
            button.textContent = "All";
            button.style.fontWeight = "normal";
        } else if (selectedValues.length === 1) {
            button.textContent = selectedValues[0];
            button.style.fontWeight = "500";
        } else {
            button.textContent = selectedValues.length + " selected";
            button.style.fontWeight = "500";
        }
    }
    
    function applyFilterDebounced() {
        if (filterTimeout) clearTimeout(filterTimeout);
        filterTimeout = setTimeout(function() {
            var expandedRows = saveExpandedState();
            updateButtonText();
            success(selectedValues.length > 0 && selectedValues.length < allValues.length ? selectedValues : null);
            restoreExpandedState(expandedRows);
        }, 150);
    }
    
    function toggleDropdown(e) {
        e.stopPropagation();
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }
    
    function openDropdown() {
        createDropdown();
        isOpen = true;
    }
    
    function closeDropdown() {
        var dropdown = document.getElementById(dropdownId);
        if (dropdown) dropdown.remove();
        isOpen = false;
    }
    
    // Close on outside click
    document.addEventListener("click", function(e) {
        if (isOpen && !button.contains(e.target)) {
            var dropdown = document.getElementById(dropdownId);
            if (dropdown && !dropdown.contains(e.target)) {
                closeDropdown();
            }
        }
    });
    
    button.addEventListener("click", toggleDropdown);
    
    // Load values from table data
    function loadValues() {
        loadAttempts++;
        var data = table.getData();
        
        if (data.length === 0 && loadAttempts < 10) {
            setTimeout(loadValues, 500);
            return;
        }
        
        var values = data.map(function(row) { return row[field]; });
        allValues = [...new Set(values)].filter(function(v) { return v != null && v !== ''; }).sort();
        
        selectedValues = [...allValues];
        isInitialized = true;
        updateButtonText();
    }
    
    onRendered(function() {
        setTimeout(loadValues, 300);
    });
    
    return button;
}

// Custom filter function for multi-select
export function customMultiSelectFilterFunction(headerValue, rowValue, rowData, filterParams) {
    if (!headerValue || !Array.isArray(headerValue) || headerValue.length === 0) return true;
    return headerValue.includes(rowValue);
}

export default createCustomMultiSelect;
