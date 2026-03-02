// main.js - NHL Props Table System
// Based on NBA basketball main.js pattern
// 3 tables: Matchups, Prop Odds, Game Odds
// No expandable rows, no global expanded state
// Mounts to: #nhl-table
//
// MOBILE FIX v6: nowrap + sort arrow space + compact vertical spacing

import { injectStyles } from './styles/tableStyles.js';
import { NHLMatchupsTable } from './tables/nhlMatchups.js';
import { NHLPlayerPropOddsTable } from './tables/nhlPlayerPropOdds.js';
import { NHLGameOddsTable } from './tables/nhlGameOdds.js';
import { TabManager } from './components/tabManager.js';

/**
 * MOBILE HEADER FIX v6
 * 
 * v5 issues: display:block broke vertical layout (extra gap), 4px padding
 * wasn't enough for sort arrow (~18px wide).
 * 
 * v6 approach: Keep display:flex (same as desktop) for proper vertical layout.
 * Just override white-space + word-break to prevent wrapping. The sort arrow
 * is handled by Tabulator as a sibling element inside .tabulator-col-content,
 * so we don't need extra padding — we need the .tabulator-col to be wider.
 * We bump minWidth on column definitions instead, but as a CSS safety net
 * we ensure the arrow area has space.
 */
function injectMobileHeaderFix() {
    if (document.querySelector('#nhl-mobile-header-fix')) return;
    
    const style = document.createElement('style');
    style.id = 'nhl-mobile-header-fix';
    style.textContent = `
        @media screen and (max-width: 1024px) {
            /* Prevent header text wrapping — forces fitData to size columns wider */
            html body .tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-title,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-col-content div.tabulator-col-title {
                white-space: nowrap !important;
                word-break: normal !important;
                overflow-wrap: normal !important;
            }
            
            /* Compact header vertical spacing to match NBA */
            html body .tabulator .tabulator-header .tabulator-col,
            html body div.tabulator div.tabulator-header div.tabulator-col {
                padding: 0 !important;
            }
            
            html body .tabulator .tabulator-header .tabulator-col .tabulator-col-content,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-col-content {
                padding: 4px 2px 2px 2px !important;
            }
            
            /* Tighten the filter area below header text */
            html body .tabulator .tabulator-header .tabulator-col .tabulator-header-filter,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-header-filter {
                padding: 0 2px 2px 2px !important;
                margin: 0 !important;
            }
            
            /* Ensure sort arrow doesn't overlap header text.
               Tabulator places the sort arrow as an ::after or sibling.
               Give the col-content enough right space for it. */
            html body .tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-title-holder,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-col-content div.tabulator-col-title-holder {
                padding-right: 18px !important;
            }
            
            /* Also target the arrow element directly if it exists */
            html body .tabulator .tabulator-header .tabulator-col .tabulator-col-sorter,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-col-sorter {
                width: 16px !important;
                min-width: 16px !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('NHL mobile header fix v6: nowrap + sort arrow space + compact vertical');
}

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded - initializing NHL table system");
    
    // Inject styles first
    injectStyles();
    
    // MOBILE FIX: Override header wrapping behavior on mobile/tablet
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
