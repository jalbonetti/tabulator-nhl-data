// components/bankrollInput.js - Bankroll Input for Kelly % Column
// NHL version - Blue theme (#1e40af)
// When bankroll > 0, Kelly % values convert to monetary amounts
//
// FIXES APPLIED:
// - Increased container max-width from 70px to 85px to prevent 'Bankroll' placeholder clipping
// - Matches the wider EV_KELLY_COLUMN_MIN_WIDTH (80px) in nhlPlayerPropOdds and nhlGameOdds

export function createBankrollInput(cell, onRendered, success, cancel, editorParams = {}) {
    const table = cell.getTable();
    const field = cell.getColumn().getField();
    const bankrollKey = editorParams.bankrollKey || field;
    
    const container = document.createElement('div');
    container.className = 'bankroll-input-container';
    container.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 85px;
        margin: 0 auto;
    `;
    
    const dollarSign = document.createElement('span');
    dollarSign.textContent = '$';
    dollarSign.style.cssText = `
        font-size: 9px;
        font-weight: 600;
        color: #333;
        margin-right: 1px;
    `;
    
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'bankroll-input';
    input.placeholder = 'Bankroll';
    input.min = '0';
    input.step = '1';
    input.style.cssText = `
        width: 100%;
        padding: 2px 3px;
        font-size: 9px;
        border: 1px solid #ccc;
        border-radius: 2px;
        text-align: left;
        box-sizing: border-box;
        -moz-appearance: textfield;
        -webkit-appearance: none;
        appearance: none;
    `;
    
    let updateTimeout = null;
    
    function updateBankroll() {
        if (updateTimeout) clearTimeout(updateTimeout);
        
        updateTimeout = setTimeout(() => {
            const bankrollValue = input.value !== '' ? parseFloat(input.value) : 0;
            
            if (!window.tableBankrollState) window.tableBankrollState = {};
            window.tableBankrollState[bankrollKey] = bankrollValue;
            
            console.log(`Bankroll updated for ${bankrollKey}: $${bankrollValue}`);
            
            if (table) {
                const rows = table.getRows();
                rows.forEach(row => row.reformat());
            }
            
            success(null);
        }, 300);
    }
    
    input.addEventListener('input', updateBankroll);
    input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') updateBankroll();
        if (e.key === 'Escape') { input.value = ''; updateBankroll(); }
    });
    
    input.addEventListener('focus', function() {
        input.style.borderColor = '#1e40af';
        input.style.boxShadow = '0 0 0 1px rgba(30, 64, 175, 0.2)';
    });
    input.addEventListener('blur', function() {
        input.style.borderColor = '#ccc';
        input.style.boxShadow = 'none';
    });
    
    onRendered(function() {
        if (window.tableBankrollState && window.tableBankrollState[bankrollKey]) {
            input.value = window.tableBankrollState[bankrollKey];
        }
    });
    
    container.appendChild(dollarSign);
    container.appendChild(input);
    
    return container;
}

export function bankrollFilterFunction(headerValue, rowValue, rowData, filterParams) {
    return true; // Doesn't filter, just stores bankroll value
}

export function getBankrollValue(field) {
    if (window.tableBankrollState && window.tableBankrollState[field]) {
        return window.tableBankrollState[field];
    }
    return 0;
}

export default { createBankrollInput, bankrollFilterFunction, getBankrollValue };
