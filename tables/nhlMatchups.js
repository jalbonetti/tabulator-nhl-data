// tables/nhlMatchups.js - NHL Matchups Table
// Simple flat table - NO expandable rows, NO subtables
// Pulls from single Supabase table: HockeyMatchups
// Spread and Total are fixed-width, equal, no filters
//
// WIDTH FIX STRATEGY (same as CBB):
// DESKTOP: CSS overrides + JS pixel widths = tight container, no void
// MOBILE: Container capped to screen width, horizontal scroll

import { BaseTable } from './baseTable.js';
import { isMobile, isTablet } from '../shared/config.js';

const SPREAD_TOTAL_WIDTH = 250;

export class NHLMatchupsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyMatchups');
        this._stylesInjected = false;
    }

    _injectMatchupsStyles() {
        if (this._stylesInjected) return;
        const styleId = 'nhl-matchups-width-override';
        if (document.querySelector(`#${styleId}`)) { this._stylesInjected = true; return; }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* =====================================================
               DESKTOP (>1024px): Override blanket rules so JS can
               set tight pixel widths. Container wraps to content.
               ===================================================== */
            @media screen and (min-width: 1025px) {
                #table0-container .tabulator {
                    width: auto !important;
                }
                #table0-container {
                    width: fit-content !important;
                    max-width: 100% !important;
                    margin: 0 auto !important;
                }
            }

            /* =====================================================
               MOBILE/TABLET (<=1024px): Container = screen width,
               tabulator wider than container to enable horizontal scroll
               ===================================================== */
            @media screen and (max-width: 1024px) {
                #table0-container {
                    max-width: 100vw !important;
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table0-container .tabulator {
                    min-width: 600px !important;
                }
            }
        `;
        document.head.appendChild(style);
        this._stylesInjected = true;
    }

    initialize() {
        this._injectMatchupsStyles();
        const isSmallScreen = isMobile() || isTablet();
        const baseConfig = this.getBaseConfig();
        
        const config = {
            ...baseConfig,
            placeholder: "Loading matchups...",
            layout: "fitData",
            columns: this.getColumns(isSmallScreen),
            initialSort: [{column: "Matchup", dir: "asc"}],
            dataLoaded: (data) => {
                console.log(`NHL Matchups loaded ${data.length} records`);
                this.dataLoaded = true;
                const element = document.querySelector(this.elementId);
                if (element) { const ld = element.querySelector('.loading-indicator'); if (ld) ld.remove(); }
            },
            ajaxError: (error) => { console.error("Error loading NHL matchups:", error); }
        };

        this.table = new Tabulator(this.elementId, config);
        
        this.table.on("tableBuilt", () => {
            console.log("NHL Matchups table built");
            setTimeout(() => {
                this.applyMatchupsWidths();
            }, 200);
            
            window.addEventListener('resize', this.debounce(() => {
                this.applyMatchupsWidths();
            }, 250));
        });
    }

    applyMatchupsWidths() {
        if (!this.table) return;
        
        if (!isMobile() && !isTablet()) {
            // Desktop: set tight pixel widths
            const columns = this.table.getColumns();
            let totalWidth = 0;
            columns.forEach(col => {
                if (col.isVisible()) totalWidth += col.getWidth();
            });
            
            const SCROLLBAR_WIDTH = 17;
            const tableWidth = totalWidth + SCROLLBAR_WIDTH;
            
            const tabulatorEl = this.table.element;
            if (tabulatorEl) {
                tabulatorEl.style.width = tableWidth + 'px';
            }
        }
    }

    getColumns(isSmallScreen = false) {
        const spreadTotalWidth = isSmallScreen ? 120 : SPREAD_TOTAL_WIDTH;
        
        return [
            {
                title: "Matchup",
                field: "Matchup",
                frozen: true,
                widthGrow: 0,
                minWidth: isSmallScreen ? 150 : 250,
                sorter: "string",
                headerFilter: true,
                resizable: false,
                hozAlign: "left"
            },
            {
                title: "Spread",
                field: "Spread",
                width: spreadTotalWidth,
                widthGrow: 0,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Total",
                field: "Total",
                width: spreadTotalWidth,
                widthGrow: 0,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            }
        ];
    }
}
