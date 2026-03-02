// tables/nhlMatchups.js - NHL Matchups Table
// Simple flat table - NO expandable rows, NO subtables
// Pulls from: HockeyMatchups
// FIXED: layout: "fitColumns" (not fitData) to fill full page width
// FIXED: NO frozen columns (matches NBA matchups pattern)

import { BaseTable } from './baseTable.js';
import { isMobile, isTablet } from '../shared/config.js';

export class NHLMatchupsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyMatchups');
    }

    initialize() {
        const isSmallScreen = isMobile() || isTablet();
        const baseConfig = this.getBaseConfig();
        
        const config = {
            ...baseConfig,
            placeholder: "Loading matchups...",
            layout: "fitColumns",
            columns: this.getColumns(isSmallScreen),
            initialSort: [{column: "Matchup", dir: "asc"}],
            dataLoaded: (data) => {
                console.log(`NHL Matchups loaded ${data.length} records`);
                this.dataLoaded = true;
            },
            ajaxError: (error) => { console.error("Error loading NHL matchups:", error); }
        };

        this.table = new Tabulator(this.elementId, config);
        
        this.table.on("tableBuilt", () => {
            console.log("NHL Matchups table built");
        });
    }

    getColumns(isSmallScreen = false) {
        return [
            {
                title: "Matchup",
                field: "Matchup",
                // NO frozen - matches NBA matchups pattern
                widthGrow: 2,
                minWidth: isSmallScreen ? 150 : 200,
                sorter: "string",
                headerFilter: true,
                resizable: false,
                hozAlign: "left"
            },
            {
                title: "Spread",
                field: "Spread",
                widthGrow: 1,
                minWidth: isSmallScreen ? 100 : 100,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Total",
                field: "Total",
                widthGrow: 1,
                minWidth: isSmallScreen ? 100 : 100,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            }
        ];
    }
}
