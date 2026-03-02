// components/tabManager.js - Tab Manager for NHL Tables
// DIRECT COPY of NBA basketball tabManager.js with color changes:
//   #f97316 -> #1e40af, #ea580c -> #1e3a8a
// Includes applyContainerWidth and proper mobile/desktop width handling

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
            gap: 4px;
            padding: 8px;
        }
    }
`;

export class TabManager {
    constructor(tables) {
        this.tables = tables;
        this.currentActiveTab = 'table0';
        this.scrollPositions = {};
        this.tableStates = {};
        this.tabInitialized = {};
        this.isTransitioning = false;
        
        Object.keys(tables).forEach(tabId => {
            this.tabInitialized[tabId] = false;
        });
        
        this.injectStyles();
        this.setupTabSwitching();
        this.initializeTab(this.currentActiveTab);
        
        console.log("TabManager: Initialized with tabs:", Object.keys(tables));
    }
    
    injectStyles() {
        if (!document.querySelector('#nhl-tab-manager-styles')) {
            const style = document.createElement('style');
            style.id = 'nhl-tab-manager-styles';
            style.textContent = TAB_STYLES;
            document.head.appendChild(style);
        }
    }

    getContainerIdForTab(tabId) {
        const containerMap = {
            'table0': 'table0-container',
            'table1': 'table1-container',
            'table2': 'table2-container'
        };
        return containerMap[tabId] || `${tabId}-container`;
    }

    /**
     * Apply appropriate container and tabulator width based on screen size
     * Mobile/tablet: Constrain both container AND tabulator to enable frozen columns
     * Desktop: fit-content for proper dynamic sizing
     */
    applyContainerWidth(tableContainer) {
        if (!tableContainer) return;
        
        const tabulator = tableContainer.querySelector('.tabulator');
        
        if (window.innerWidth <= 1024) {
            // Mobile/tablet: constrain to viewport for frozen column support
            tableContainer.style.width = '100%';
            tableContainer.style.maxWidth = '100vw';
            tableContainer.style.overflowX = 'hidden';
            
            // CRITICAL: Also constrain the tabulator element
            if (tabulator) {
                tabulator.style.width = '100%';
                tabulator.style.minWidth = '0';
                tabulator.style.maxWidth = '100%';
            }
        } else {
            // Desktop: use fit-content for dynamic sizing
            tableContainer.style.width = 'fit-content';
            tableContainer.style.maxWidth = 'none';
            tableContainer.style.overflowX = '';
            
            if (tabulator) {
                tabulator.style.width = '';
                tabulator.style.minWidth = '';
                tabulator.style.maxWidth = '';
            }
        }
    }

    setupTabSwitching() {
        const self = this;
        
        document.addEventListener('click', async function(e) {
            if (e.target.classList.contains('tab-button')) {
                e.preventDefault();
                
                if (self.isTransitioning) return;
                
                const targetTab = e.target.getAttribute('data-tab');
                if (targetTab === self.currentActiveTab) return;
                
                self.isTransitioning = true;
                
                try {
                    // Save current state
                    self.saveTabState(self.currentActiveTab);
                    
                    // Hide current table container
                    const currentContainerId = self.getContainerIdForTab(self.currentActiveTab);
                    const currentContainer = document.querySelector(`#${currentContainerId}`);
                    
                    if (currentContainer) {
                        currentContainer.style.display = 'none';
                        currentContainer.classList.remove('active-table');
                        currentContainer.classList.add('inactive-table');
                        
                        // Reset width styles to prevent stale dimensions carrying over
                        currentContainer.style.width = '';
                        currentContainer.style.minWidth = '';
                        currentContainer.style.maxWidth = '';
                        currentContainer.style.overflowX = '';
                        
                        const currentTabElement = currentContainer.querySelector('.tabulator');
                        if (currentTabElement) {
                            currentTabElement.style.width = '';
                            currentTabElement.style.minWidth = '';
                            currentTabElement.style.maxWidth = '';
                        }
                    }
                    
                    // Update active tab button
                    document.querySelectorAll('.tab-button').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    e.target.classList.add('active');
                    
                    // Initialize target tab if needed
                    await self.initializeTab(targetTab);
                    
                    // Show target table container
                    const targetContainerId = self.getContainerIdForTab(targetTab);
                    const targetContainer = document.querySelector(`#${targetContainerId}`);
                    
                    if (targetContainer) {
                        targetContainer.style.display = 'block';
                        targetContainer.classList.add('active-table');
                        targetContainer.classList.remove('inactive-table');
                    }
                    
                    self.currentActiveTab = targetTab;
                    
                    await new Promise(resolve => setTimeout(resolve, 50));
                    
                    // Redraw and restore state
                    const targetTableWrapper = self.tables[targetTab];
                    if (targetTableWrapper && targetTableWrapper.table) {
                        targetTableWrapper.table.redraw(true);
                        self.restoreTabState(targetTab);
                        
                        // Re-equalize columns and recalculate widths after tab switch
                        setTimeout(() => {
                            if (window.innerWidth > 1024) {
                                if (targetTableWrapper.equalizeClusteredColumns) {
                                    targetTableWrapper.equalizeClusteredColumns();
                                }
                                if (targetTableWrapper.calculateAndApplyWidths) {
                                    targetTableWrapper.calculateAndApplyWidths();
                                }
                            }
                            
                            const tableContainer = targetTableWrapper.table?.element?.closest('.table-container');
                            requestAnimationFrame(() => {
                                self.applyContainerWidth(tableContainer);
                            });
                        }, 100);
                    }
                    
                } catch (error) {
                    console.error("TabManager: Error during tab switch:", error);
                } finally {
                    self.isTransitioning = false;
                }
            }
        });
    }

    initializeTab(tabId) {
        if (this.tabInitialized[tabId]) return Promise.resolve();
        
        const self = this;
        
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                const tableWrapper = this.tables[tabId];
                
                if (tableWrapper && !tableWrapper.isInitialized) {
                    try {
                        tableWrapper.initialize();
                        this.tabInitialized[tabId] = true;
                        
                        setTimeout(() => {
                            const tableContainer = tableWrapper.table?.element?.closest('.table-container');
                            self.applyContainerWidth(tableContainer);
                        }, 200);
                        
                    } catch (error) {
                        console.error(`TabManager: Error initializing tab ${tabId}:`, error);
                    }
                } else if (tableWrapper && tableWrapper.isInitialized) {
                    this.tabInitialized[tabId] = true;
                }
                
                setTimeout(resolve, 100);
            });
        });
    }

    saveTabState(tabId) {
        const tableWrapper = this.tables[tabId];
        if (!tableWrapper || !tableWrapper.table) return;
        
        try {
            const tableHolder = tableWrapper.table.element.querySelector('.tabulator-tableholder');
            if (tableHolder) {
                this.scrollPositions[tabId] = tableHolder.scrollTop;
            }
        } catch (error) {
            console.error(`TabManager: Error saving state for ${tabId}:`, error);
        }
    }

    restoreTabState(tabId) {
        if (this.scrollPositions[tabId]) {
            const tableWrapper = this.tables[tabId];
            if (!tableWrapper || !tableWrapper.table) return;
            
            setTimeout(() => {
                const tableHolder = tableWrapper.table.element.querySelector('.tabulator-tableholder');
                if (tableHolder) {
                    tableHolder.scrollTop = this.scrollPositions[tabId];
                }
            }, 300);
        }
    }

    getActiveTable() {
        return this.tables[this.currentActiveTab];
    }

    refreshCurrentTab() {
        const table = this.getActiveTable();
        if (table && table.refreshData) {
            return table.refreshData();
        }
    }
    
    switchTab(tabId) {
        const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
        if (tabButton) {
            tabButton.click();
        }
    }
}

export default TabManager;
