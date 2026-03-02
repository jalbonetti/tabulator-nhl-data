// components/tabManager.js - Tab Manager for NHL Tables
// 3 tabs: Matchups, Prop Odds, Game Odds
// Blue theme (#1e40af / #1e3a8a)
// Includes applyContainerWidth and forceRecalculateWidths matching NBA pattern

export const TAB_STYLES = `
    .table-wrapper {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        width: 100% !important;
        margin: 0 auto !important;
    }
    
    .tabs-container {
        width: 100%;
        margin-bottom: 0;
        z-index: 10;
    }
    
    .tab-buttons {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 5px;
        padding: 10px;
        background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
        border-radius: 8px 8px 0 0;
        margin-bottom: 0;
    }
    
    .tab-button {
        padding: 10px 16px;
        border: none;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
        white-space: nowrap;
    }
    
    .tab-button:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
    }
    
    .tab-button.active {
        background: white;
        color: #1e3a8a;
        font-weight: bold;
    }
    
    .tables-container {
        width: 100%;
        position: relative;
        min-height: 500px;
    }
    
    .table-container {
        width: 100%;
    }
    
    .table-container.active-table {
        display: block !important;
    }
    
    .table-container.inactive-table {
        display: none !important;
    }
    
    .table-container .tabulator {
        border-radius: 0 0 6px 6px;
        border-top: none;
    }
    
    @media screen and (max-width: 768px) {
        .tab-button {
            padding: 8px 12px;
            font-size: 11px;
        }
        .tab-buttons {
            gap: 3px;
            padding: 8px;
        }
    }
`;

export class TabManager {
    constructor(tableInstances) {
        this.tables = tableInstances;
        this.activeTab = 'table0';
        this.initialized = {};
        
        this.injectStyles();
        this.setupTabs();
        this.showTab('table0');
    }
    
    injectStyles() {
        if (document.querySelector('#nhl-tab-styles')) return;
        const style = document.createElement('style');
        style.id = 'nhl-tab-styles';
        style.textContent = TAB_STYLES;
        document.head.appendChild(style);
    }
    
    setupTabs() {
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                if (tabId) this.showTab(tabId);
            });
        });
    }
    
    showTab(tabId) {
        this.activeTab = tabId;
        
        // Update button states
        document.querySelectorAll('.tab-button').forEach(btn => {
            if (btn.getAttribute('data-tab') === tabId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        // Show/hide table containers
        document.querySelectorAll('.table-container').forEach(container => {
            if (container.id === `${tabId}-container`) {
                container.classList.add('active-table');
                container.classList.remove('inactive-table');
            } else {
                container.classList.remove('active-table');
                container.classList.add('inactive-table');
            }
        });
        
        // Initialize table if first time
        if (!this.initialized[tabId] && this.tables[tabId]) {
            this.tables[tabId].initialize();
            this.initialized[tabId] = true;
        }
        
        // Recalculate widths after tab switch
        setTimeout(() => {
            this.applyContainerWidth(tabId);
        }, 100);
    }
    
    applyContainerWidth(tabId) {
        const tableInstance = this.tables[tabId];
        if (!tableInstance || !tableInstance.table) return;
        
        // Trigger redraw to fix any layout issues after tab switch
        try {
            tableInstance.table.redraw(true);
        } catch (e) {
            console.log('Redraw skipped:', e.message);
        }
        
        // Force width recalculation
        setTimeout(() => {
            this.forceRecalculateWidths(tabId);
        }, 50);
    }
    
    forceRecalculateWidths(tabId) {
        const tableInstance = this.tables[tabId];
        if (!tableInstance || !tableInstance.table) return;
        
        const data = tableInstance.table.getData();
        if (data.length > 0 && typeof tableInstance.calculateAndApplyWidths === 'function') {
            tableInstance.calculateAndApplyWidths();
        }
    }
}

export default TabManager;
