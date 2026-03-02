// main.js - NHL Props Table System
// Based on NBA basketball main.js pattern
// 3 tables: Matchups, Prop Odds, Game Odds
// No expandable rows, no global expanded state
// Mounts to: #nhl-table
//
// MOBILE FIX v8: CSS nowrap + JS header width enforcement via polling

import { injectStyles } from './styles/tableStyles.js';
import { NHLMatchupsTable } from './tables/nhlMatchups.js';
import { NHLPlayerPropOddsTable } from './tables/nhlPlayerPropOdds.js';
import { NHLGameOddsTable } from './tables/nhlGameOdds.js';
import { TabManager } from './components/tabManager.js';

function isMobileViewport() {
    return window.innerWidth <= 768;
}

function isTabletViewport() {
    return window.innerWidth > 768 && window.innerWidth <= 1024;
}

/**
 * CSS: Prevent header text wrapping + compact vertical spacing
 */
function injectMobileHeaderFix() {
    if (document.querySelector('#nhl-mobile-header-fix')) return;
    
    const style = document.createElement('style');
    style.id = 'nhl-mobile-header-fix';
    style.textContent = `
        @media screen and (max-width: 1024px) {
            /* Prevent header text wrapping */
            html body .tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-title,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-col-content div.tabulator-col-title {
                white-space: nowrap !important;
                word-break: normal !important;
                overflow-wrap: normal !important;
                padding: 0 !important;
                margin: 0 !important;
                line-height: 1.2 !important;
            }
            
            /* Compact vertical spacing - target every layer */
            html body .tabulator .tabulator-header .tabulator-col,
            html body div.tabulator div.tabulator-header div.tabulator-col {
                padding: 2px 0 0 0 !important;
            }
            
            html body .tabulator .tabulator-header .tabulator-col .tabulator-col-content,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-col-content {
                padding: 2px 4px 0 4px !important;
            }
            
            html body .tabulator .tabulator-header-filter,
            html body div.tabulator div.tabulator-header-filter {
                padding: 2px 2px 3px 2px !important;
                margin: 0 !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('NHL mobile header fix v8 CSS injected');
}

/**
 * JS: After tables render, measure actual header text widths and enforce minimums.
 * Uses polling to catch tables as they build (avoids monkey-patching timing issues).
 */
function setupHeaderWidthEnforcement() {
    if (!isMobileViewport() && !isTabletViewport()) return;
    
    let attempts = 0;
    const maxAttempts = 20; // Try for 10 seconds (20 * 500ms)
    
    const interval = setInterval(() => {
        attempts++;
        
        // Find all tabulator instances on the page
        const tabulators = document.querySelectorAll('.tabulator');
        let anyFixed = false;
        
        tabulators.forEach(tabEl => {
            // Skip if already processed
            if (tabEl.dataset.headersFixed === 'true') return;
            
            const headers = tabEl.querySelectorAll('.tabulator-col');
            if (headers.length === 0) return;
            
            headers.forEach(colEl => {
                const titleEl = colEl.querySelector('.tabulator-col-title');
                if (!titleEl) return;
                
                // scrollWidth = full content width even if currently clipped
                const textNeeded = titleEl.scrollWidth;
                const colWidth = colEl.offsetWidth;
                
                // If text is wider than column, the header is clipped
                // Add buffer for sort arrow and subpixel rendering
                const buffer = 24; // sort arrow (~16px) + safety (8px)
                const requiredWidth = textNeeded + buffer;
                
                if (requiredWidth > colWidth) {
                    // Find the Tabulator instance and use API to set width
                    // The column field is in the data-field attribute
                    const field = colEl.getAttribute('tabulator-field');
                    if (field && window.nhlTables) {
                        // Try each table instance
                        Object.values(window.nhlTables).forEach(tableInstance => {
                            if (tableInstance.table) {
                                const col = tableInstance.table.getColumn(field);
                                if (col && col.getWidth() < requiredWidth) {
                                    console.log(`Header fix: "${field}" ${col.getWidth()}px → ${Math.ceil(requiredWidth)}px (text: ${textNeeded}px)`);
                                    col.setWidth(Math.ceil(requiredWidth));
                                    anyFixed = true;
                                }
                            }
                        });
                    }
                }
            });
            
            // Mark this tabulator as processed
            tabEl.dataset.headersFixed = 'true';
        });
        
        // Stop polling after max attempts or when we've processed visible tables
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.log('NHL header width enforcement complete (max attempts reached)');
        }
    }, 500);
    
    // Also run enforcement when tabs are switched (tab switch reveals hidden tables)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab-button')) {
            // Reset "fixed" flags so enforcement re-runs for newly visible tables
            setTimeout(() => {
                document.querySelectorAll('.tabulator').forEach(t => {
                    t.dataset.headersFixed = 'false';
                });
            }, 300);
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded - initializing NHL table system");
    
    // Inject styles first
    injectStyles();
    
    // MOBILE FIX: CSS overrides
    injectMobileHeaderFix();
    
    // Find the existing nhl-table element
    const existingTable = document.getElementById('nhl-table');
    if (!existingTable) {
        console.log("No nhl-table element found - cannot proceed");
        return;
    }

    console.log("Found nhl-table element, creating structure...");

    try {
        createCompleteTableStructure(existingTable);
        
        const tableInstances = {
            table0: new NHLMatchupsTable("#matchups-table"),
            table1: new NHLPlayerPropOddsTable("#prop-odds-table"),
            table2: new NHLGameOddsTable("#game-odds-table")
        };
        
        const tabManager = new TabManager(tableInstances);
        window.tabManager = tabManager;
        window.nhlTables = tableInstances;
        
        console.log("NHL table system initialized successfully!");
        
        // MOBILE FIX: Start header width enforcement after tables initialize
        setupHeaderWidthEnforcement();
        
    } catch (error) {
        console.error("Error initializing NHL table system:", error);
    }
});

function createCompleteTableStructure(existingTable) {
    console.log("Creating complete DOM structure...");
    
    // Create main wrapper
    const tabWrapper = document.createElement('div');
    tabWrapper.className = 'table-wrapper';
    tabWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; width: 100%; margin: 0 auto;';
    
    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';
    tabsContainer.innerHTML = `
        <div class="tab-buttons">
            <button class="tab-button active" data-tab="table0">Matchups</button>
            <button class="tab-button" data-tab="table1">Prop Odds</button>
            <button class="tab-button" data-tab="table2">Game Odds</button>
        </div>
    `;
    
    // Create tables container
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'tables-container';
    tablesContainer.style.cssText = 'width: 100%; position: relative;';
    
    // Create individual table containers (matching NBA pattern: table0-container, etc.)
    const tableConfigs = [
        { tabId: 'table0', tableId: 'matchups-table', active: true },
        { tabId: 'table1', tableId: 'prop-odds-table', active: false },
        { tabId: 'table2', tableId: 'game-odds-table', active: false }
    ];
    
    tableConfigs.forEach(config => {
        const tableContainer = document.createElement('div');
        tableContainer.id = `${config.tabId}-container`;
        tableContainer.className = `table-container ${config.active ? 'active-table' : 'inactive-table'}`;
        if (!config.active) {
            tableContainer.style.display = 'none';
        }
        
        const tableDiv = document.createElement('div');
        tableDiv.id = config.tableId;
        
        tableContainer.appendChild(tableDiv);
        tablesContainer.appendChild(tableContainer);
    });
    
    tabWrapper.appendChild(tabsContainer);
    tabWrapper.appendChild(tablesContainer);
    
    // Insert BEFORE the existing element and hide original (NBA pattern)
    if (existingTable.parentElement) {
        existingTable.parentElement.insertBefore(tabWrapper, existingTable);
        existingTable.style.display = 'none';
    }
    
    console.log("NHL table structure created");
}
