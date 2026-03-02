// main.js - NHL Props Table System
// 3 tables: Matchups, Prop Odds, Game Odds
// No expandable rows, no global expanded state
// Mounts to: #nhl-table

import { injectStyles } from './styles/tableStyles.js';
import { NHLMatchupsTable } from './tables/nhlMatchups.js';
import { NHLPlayerPropOddsTable } from './tables/nhlPlayerPropOdds.js';
import { NHLGameOddsTable } from './tables/nhlGameOdds.js';
import { TabManager } from './components/tabManager.js';

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded - initializing NHL table system");
    
    // Inject styles first
    injectStyles();
    
    // Find the existing nhl-table element
    const existingTable = document.getElementById('nhl-table');
    if (!existingTable) {
        console.log("No nhl-table element found - cannot proceed");
        return;
    }

    console.log("Found nhl-table element, creating structure...");

    try {
        createTableStructure(existingTable);
        
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

function createTableStructure(container) {
    container.innerHTML = '';
    
    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'table-wrapper';
    
    // Create tabs container
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';
    
    const tabButtons = document.createElement('div');
    tabButtons.className = 'tab-buttons';
    
    const tabs = [
        { id: 'table0', label: 'Matchups' },
        { id: 'table1', label: 'Prop Odds' },
        { id: 'table2', label: 'Game Odds' }
    ];
    
    tabs.forEach((tab, index) => {
        const btn = document.createElement('button');
        btn.className = 'tab-button' + (index === 0 ? ' active' : '');
        btn.setAttribute('data-tab', tab.id);
        btn.textContent = tab.label;
        tabButtons.appendChild(btn);
    });
    
    tabsContainer.appendChild(tabButtons);
    wrapper.appendChild(tabsContainer);
    
    // Create tables container
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'tables-container';
    
    const tableConfigs = [
        { id: 'table0', tableId: 'matchups-table' },
        { id: 'table1', tableId: 'prop-odds-table' },
        { id: 'table2', tableId: 'game-odds-table' }
    ];
    
    tableConfigs.forEach((config, index) => {
        const tableContainer = document.createElement('div');
        tableContainer.id = `${config.id}-container`;
        tableContainer.className = 'table-container' + (index === 0 ? ' active-table' : ' inactive-table');
        
        const tableDiv = document.createElement('div');
        tableDiv.id = config.tableId;
        
        tableContainer.appendChild(tableDiv);
        tablesContainer.appendChild(tableContainer);
    });
    
    wrapper.appendChild(tablesContainer);
    container.appendChild(wrapper);
    
    console.log("NHL table structure created");
}
