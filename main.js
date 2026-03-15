// main.js - NHL Props Table System
// 6 tables: Matchups, Prop Clearances, Prop Odds, Game Odds, DraftKings DFS, FanDuel DFS
// Mounts to: #nhl-table

import { injectStyles } from './styles/tableStyles.js';
import { NHLMatchupsTable } from './tables/nhlMatchups.js';
import { NHLPlayerPropClearancesTable } from './tables/nhlPlayerPropClearances.js';
import { NHLPlayerPropOddsTable } from './tables/nhlPlayerPropOdds.js';
import { NHLGameOddsTable } from './tables/nhlGameOdds.js';
import { NHLPlayerDKTable } from './tables/nhlPlayerDK.js';
import { NHLPlayerFDTable } from './tables/nhlPlayerFD.js';
import { TabManager } from './components/tabManager.js';

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded - initializing NHL table system");
    
    injectStyles();
    
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
            table1: new NHLPlayerPropClearancesTable("#prop-clearances-table"),
            table2: new NHLPlayerPropOddsTable("#prop-odds-table"),
            table3: new NHLGameOddsTable("#game-odds-table"),
            table4: new NHLPlayerDKTable("#dk-dfs-table"),
            table5: new NHLPlayerFDTable("#fd-dfs-table")
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
    
    const tabWrapper = document.createElement('div');
    tabWrapper.className = 'table-wrapper';
    tabWrapper.style.cssText = 'display: flex; flex-direction: column; align-items: center; width: 100%; margin: 0 auto;';
    
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'tabs-container';
    tabsContainer.innerHTML = `
        <div class="tab-buttons">
            <button class="tab-button active" data-tab="table0">Matchups</button>
            <button class="tab-button" data-tab="table1">Prop Clearances</button>
            <button class="tab-button" data-tab="table2">Prop Odds</button>
            <button class="tab-button" data-tab="table3">Game Odds</button>
            <button class="tab-button" data-tab="table4">DraftKings DFS</button>
            <button class="tab-button" data-tab="table5">FanDuel DFS</button>
        </div>
    `;
    
    const tablesContainer = document.createElement('div');
    tablesContainer.className = 'tables-container';
    tablesContainer.style.cssText = 'width: 100%; position: relative;';
    
    const tableConfigs = [
        { tabId: 'table0', tableId: 'matchups-table', active: true },
        { tabId: 'table1', tableId: 'prop-clearances-table', active: false },
        { tabId: 'table2', tableId: 'prop-odds-table', active: false },
        { tabId: 'table3', tableId: 'game-odds-table', active: false },
        { tabId: 'table4', tableId: 'dk-dfs-table', active: false },
        { tabId: 'table5', tableId: 'fd-dfs-table', active: false }
    ];
    
    tableConfigs.forEach(config => {
        const tableContainer = document.createElement('div');
        tableContainer.id = `${config.tabId}-container`;
        tableContainer.className = `table-container ${config.active ? 'active-table' : 'inactive-table'}`;
        if (!config.active) { tableContainer.style.display = 'none'; }
        const tableDiv = document.createElement('div');
        tableDiv.id = config.tableId;
        tableContainer.appendChild(tableDiv);
        tablesContainer.appendChild(tableContainer);
    });
    
    tabWrapper.appendChild(tabsContainer);
    tabWrapper.appendChild(tablesContainer);
    
    if (existingTable.parentElement) {
        existingTable.parentElement.insertBefore(tabWrapper, existingTable);
        existingTable.style.display = 'none';
    }
    
    console.log("NHL table structure created with 6 tabs");
}
