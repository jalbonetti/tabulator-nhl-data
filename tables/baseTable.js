// tables/baseTable.js - Base Table Class for NHL Props
// Simplified: No expandable rows, no IndexedDB, memory cache only
//
// FIXES APPLIED:
// - Added NBA-style loading indicator with centered overlay and live record count
//   Previously showed no progress feedback during data loading

import { API_CONFIG, isMobile, isTablet } from '../shared/config.js';

// Global data cache to persist between tab switches
const dataCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class BaseTable {
    constructor(elementId, endpoint) {
        this.elementId = elementId;
        this.endpoint = endpoint;
        this.table = null;
        this.dataLoaded = false;
        this.filterState = [];
        this.sortState = [];
    }
    
    // Filter out NULL/empty rows from Supabase
    filterNullRows(records) {
        if (!records || !Array.isArray(records)) return records;
        
        const originalCount = records.length;
        
        const primaryIdentifierFields = [
            "Player Name",      // Player prop odds
            "Game Matchup",     // Game odds
            "Matchup",          // Matchups table
        ];
        
        const filtered = records.filter(row => {
            // Check if ANY primary identifier has a value
            const hasPrimaryId = primaryIdentifierFields.some(field => {
                const value = row[field];
                return value !== null && value !== undefined && value !== '';
            });
            
            if (hasPrimaryId) return true;
            
            // Fallback: check if ALL values are null/empty
            const values = Object.entries(row)
                .filter(([key]) => !key.startsWith('_'))
                .map(([, value]) => value);
            
            return !values.every(v => v === null || v === undefined || v === '');
        });
        
        if (originalCount !== filtered.length) {
            console.log(`Filtered ${originalCount - filtered.length} null/empty rows from ${this.endpoint}`);
        }
        
        return filtered;
    }
    
    // Memory cache helpers
    getCachedData(key) {
        const cached = dataCache.get(key);
        if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
            return cached.data;
        }
        dataCache.delete(key);
        return null;
    }
    
    setCachedData(key, data) {
        dataCache.set(key, { data, timestamp: Date.now() });
    }
    
    // Show loading indicator with record count (matches NBA pattern)
    showLoadingIndicator() {
        if (!this.elementId) return;
        const element = document.querySelector(this.elementId);
        if (!element) return;
        
        // Don't create duplicate loading indicators
        if (element.querySelector('.loading-indicator')) return;
        
        const progressDiv = document.createElement('div');
        progressDiv.id = 'loading-progress';
        progressDiv.className = 'loading-indicator';
        progressDiv.style.cssText = 'position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 1000; background: white; padding: 20px; border: 1px solid #ccc; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);';
        progressDiv.innerHTML = '<div style="text-align: center;"><div>Loading data...</div><div id="progress-text" style="margin-top: 10px; font-weight: bold;">0 records</div></div>';
        element.style.position = 'relative';
        element.appendChild(progressDiv);
    }
    
    // Update loading indicator with current record count
    updateLoadingProgress(count) {
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = `${count} records loaded...`;
        }
    }
    
    // Remove loading indicator
    removeLoadingIndicator() {
        const progressDiv = document.getElementById('loading-progress');
        if (progressDiv) {
            progressDiv.remove();
        }
    }
    
    // Fetch all records with pagination (Supabase returns max 1000 per request)
    async fetchAllRecords(url, config) {
        const pageSize = API_CONFIG.fetchConfig.pageSize;
        let allRecords = [];
        let offset = 0;
        let hasMore = true;
        let retries = 0;
        const maxRetries = API_CONFIG.fetchConfig.maxRetries;
        
        console.log(`Starting data fetch from ${url}...`);
        
        // Show loading indicator
        this.showLoadingIndicator();
        
        while (hasMore) {
            const pageUrl = `${url}?offset=${offset}&limit=${pageSize}`;
            
            try {
                const response = await fetch(pageUrl, {
                    method: config.method || "GET",
                    headers: config.headers || API_CONFIG.headers
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                if (data && data.length > 0) {
                    allRecords = allRecords.concat(data);
                    offset += pageSize;
                    
                    // Update progress with record count
                    this.updateLoadingProgress(allRecords.length);
                    
                    if (data.length < pageSize) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
                
                retries = 0;
            } catch (error) {
                retries++;
                console.error(`Fetch error (attempt ${retries}/${maxRetries}):`, error);
                
                if (retries >= maxRetries) {
                    console.error(`Max retries reached for ${this.endpoint}`);
                    hasMore = false;
                } else {
                    await new Promise(r => setTimeout(r, API_CONFIG.fetchConfig.retryDelay * retries));
                }
            }
        }
        
        // Remove loading indicator
        this.removeLoadingIndicator();
        
        console.log(`Fetch complete: ${allRecords.length} total records from ${this.endpoint}`);
        return allRecords;
    }
    
    // Get base Tabulator config with Supabase AJAX settings
    getBaseConfig() {
        const self = this;
        
        return {
            virtualDom: true,
            virtualDomBuffer: 500,
            renderVertical: "virtual",
            renderHorizontal: "basic",
            pagination: false,
            layoutColumnsOnNewData: false,
            responsiveLayout: false,
            maxHeight: "600px",
            height: "600px",
            
            ajaxURL: API_CONFIG.baseURL + this.endpoint,
            ajaxConfig: {
                method: "GET",
                headers: API_CONFIG.headers
            },
            ajaxRequestFunc: async function(url, config, params) {
                const cacheKey = self.endpoint;
                
                // Check memory cache
                const memoryCached = self.getCachedData(cacheKey);
                if (memoryCached) {
                    console.log(`Memory cache hit for ${self.endpoint}`);
                    self.dataLoaded = true;
                    return self.filterNullRows(memoryCached);
                }
                
                // Fetch from API
                console.log(`Fetching ${self.endpoint} from API...`);
                let allRecords = await self.fetchAllRecords(url, config);
                
                allRecords = self.filterNullRows(allRecords);
                self.setCachedData(cacheKey, allRecords);
                self.dataLoaded = true;
                return allRecords;
            }
        };
    }
    
    // Force refresh data (bypasses cache)
    async refreshData() {
        dataCache.delete(this.endpoint);
        if (this.table) {
            await this.table.setData();
        }
    }
    
    // Custom sorter for odds with +/- prefix
    oddsSorter(a, b) {
        const getNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            const num = parseInt(String(val).replace('+', ''), 10);
            return isNaN(num) ? -99999 : num;
        };
        return getNum(a) - getNum(b);
    }
    
    // Custom sorter for percentage values
    percentSorter(a, b) {
        const getNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            const num = parseFloat(val);
            return isNaN(num) ? -99999 : num;
        };
        return getNum(a) - getNum(b);
    }
    
    // Debounce helper
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    // Equalize clustered column widths (odds columns, EV/Kelly columns)
    equalizeClusteredColumns() {
        // Override in subclasses
    }
    
    // Calculate and apply total table width
    calculateAndApplyWidths() {
        if (!this.table) return;
        if (isMobile() || isTablet()) return;
        
        const columns = this.table.getColumns();
        let totalWidth = 0;
        
        columns.forEach(col => {
            if (col.isVisible()) {
                totalWidth += col.getWidth();
            }
        });
        
        const SCROLLBAR_WIDTH = 17;
        const tableWidth = totalWidth + SCROLLBAR_WIDTH;
        
        const tabulatorEl = document.querySelector(this.elementId + ' .tabulator') || 
                           document.querySelector(this.elementId);
        if (tabulatorEl && tabulatorEl.classList.contains('tabulator')) {
            tabulatorEl.style.width = tableWidth + 'px';
        }
        
        const container = tabulatorEl ? tabulatorEl.closest('.table-container') : null;
        if (container) {
            container.style.width = 'fit-content';
            container.style.maxWidth = '100%';
        }
        
        console.log(`Applied table width: ${tableWidth}px for ${this.endpoint}`);
    }
}
