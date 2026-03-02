// main.js - NHL Props Table System
// Based on NBA basketball main.js pattern
// 3 tables: Matchups, Prop Odds, Game Odds
// No expandable rows, no global expanded state
// Mounts to: #nhl-table
//
// MOBILE FIX: Added injectMobileHeaderFix() after injectStyles().
// Forces headers to not wrap on mobile — uses high-specificity selectors
// to beat both tableStyles.js and Webflow's own rules.

import { injectStyles } from './styles/tableStyles.js';
import { NHLMatchupsTable } from './tables/nhlMatchups.js';
import { NHLPlayerPropOddsTable } from './tables/nhlPlayerPropOdds.js';
import { NHLGameOddsTable } from './tables/nhlGameOdds.js';
import { TabManager } from './components/tabManager.js';

/**
 * MOBILE HEADER FIX: Prevent ALL header text wrapping on mobile/tablet.
 * 
 * Problem: tableStyles.js sets .tabulator-col-title { white-space: normal; 
 * word-break: break-word; display: flex; } which allows mid-word breaks.
 * On mobile with many columns, "Book" → "Boo k", "Team" → "Te am", etc.
 * 
 * Fix: Use high-specificity selectors with !important to override everything.
 * Also handle the flex display issue — flex containers need min-width: max-content
 * to prevent their text children from being squeezed and wrapping.
 */
function injectMobileHeaderFix() {
    if (document.querySelector('#nhl-mobile-header-fix')) return;
    
    const style = document.createElement('style');
    style.id = 'nhl-mobile-header-fix';
    style.textContent = `
        /* =============================================================
           MOBILE HEADER FIX - HIGH SPECIFICITY
           Prevents ALL header text wrapping on mobile/tablet.
           Uses html body prefix for higher specificity than tableStyles.
           ============================================================= */
        @media screen and (max-width: 1024px) {
            /* Target the col-title element with max specificity */
            html body .tabulator .tabulator-header .tabulator-col .tabulator-col-content .tabulator-col-title,
            html body div.tabulator div.tabulator-header div.tabulator-col div.tabulator-col-content div.tabulator-col-title,
            .tabulator-col-title {
                white-space: nowrap !important;
                word-break: normal !important;
                overflow-wrap: normal !important;
                text-overflow: ellipsis !important;
                overflow: hidden !important;
                /* With display:flex, the text child can still wrap.
                   min-width: max-content prevents the flex container from 
                   being squeezed narrower than its text content. */
                min-width: max-content !important;
            }
            
            /* Also force the parent column to respect content width */
            html body .tabulator .tabulator-header .tabulator-col,
            html body div.tabulator div.tabulator-header div.tabulator-col {
                min-width: max-content !important;
            }
            
            /* The tabulator header should size to its content, not viewport */
            .table-container .tabulator .tabulator-header {
                width: max-content !important;
                min-width: 100% !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('NHL mobile header fix injected: headers forced nowrap with max-content min-width');
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
