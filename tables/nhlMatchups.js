// tables/nhlMatchups.js - NHL Matchups Table
// Simple flat table - NO expandable rows, NO subtables
// Pulls from: HockeyMatchups
// Spread and Total are fixed-width, equal, no filters
//
// WIDTH FIX STRATEGY (matches CBB Matchups exactly):
//
// DESKTOP: 
//   CSS: #table0-container .tabulator { width: auto !important } — overrides the
//        blanket .tabulator { width: 100% !important } from tableStyles.js
//   JS:  Sets exact pixel widths on tabulator (columns + 17px scrollbar)
//   CSS: #table0-container { fit-content } — container wraps to tabulator
//   Result: Tight container, no void, scrollbar only when rows overflow
//
// MOBILE:
//   CSS: #table0-container { max-width: 100vw, overflow-x: auto } — container is 
//        capped to screen width and scrolls horizontally
//   CSS: Does NOT override .tabulator width — we NEED the tabulator to be wider
//        than the container so there's content to scroll. JS sets inline pixel 
//        widths (e.g. 850px) which override the CSS width:100% (inline > stylesheet
//        when stylesheet doesn't use !important... but tableStyles DOES use !important).
//        So we need a targeted !important to set min-width on the tabulator.
//   Result: Container = screen width, tabulator = content width, horizontal scroll works

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
                #table0-container {
                    width: fit-content !important;
                    max-width: none !important;
                    overflow-x: visible !important;
                }
                
                #table0-container .tabulator {
                    width: auto !important;
                    max-width: none !important;
                }
                
                #table0-container .tabulator .tabulator-tableholder {
                    overflow-y: auto !important;
                }
            }
            
            /* =====================================================
               MOBILE/TABLET (<=1024px): 
               - Container: capped to viewport, scrolls horizontally
               - Tabulator: must NOT be constrained to container width.
                 We remove the max-width:100% that tableStyles.js sets,
                 so the tabulator can be wider than the container.
                 JS inline styles set the actual pixel width.
               ===================================================== */
            @media screen and (max-width: 1024px) {
                #table0-container {
                    max-width: 100vw !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                /* Remove the max-width:100% constraint so tabulator can 
                   overflow the container. Keep width:100% — JS inline 
                   style (e.g. width:850px) will override it since inline 
                   beats stylesheet... EXCEPT tableStyles uses !important.
                   So we also need to remove that constraint: */
                #table0-container .tabulator {
                    max-width: none !important;
                    min-width: 0 !important;
                }
                
                /* The tableholder doesn't need to be the scroll target 
                   since there are no frozen columns. Let it size naturally. */
                #table0-container .tabulator .tabulator-tableholder {
                    overflow-x: visible !important;
                    overflow-y: auto !important;
                }
            }
        `;
        document.head.appendChild(style);
        this._stylesInjected = true;
        console.log('NHL Matchups: Injected width override styles');
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
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    this.calculateAndApplyWidths();
                }
            }, 200);
            
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0) this.calculateAndApplyWidths();
            }, 250));
        });
        
        this.table.on("dataLoaded", () => {
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    this.calculateAndApplyWidths();
                }
            }, 100);
        });
        
        this.table.on("renderComplete", () => {
            setTimeout(() => this.calculateAndApplyWidths(), 100);
        });
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }

    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const HEADER_PADDING = 16;
        const SORT_ICON_WIDTH = 16;
        
        let maxMatchupWidth = ctx.measureText("Matchup").width + HEADER_PADDING + SORT_ICON_WIDTH;
        
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const CELL_PADDING = 16;
        const BUFFER = 8;
        
        data.forEach(row => {
            const value = row["Matchup"];
            if (value !== null && value !== undefined && value !== '') {
                const textWidth = ctx.measureText(String(value)).width;
                if (textWidth > maxMatchupWidth) maxMatchupWidth = textWidth;
            }
        });
        
        const matchupColumn = this.table.getColumn("Matchup");
        if (matchupColumn) {
            const requiredWidth = maxMatchupWidth + CELL_PADDING + BUFFER;
            const currentWidth = matchupColumn.getWidth();
            if (requiredWidth > currentWidth) {
                matchupColumn.setWidth(Math.ceil(requiredWidth));
            }
        }
        
        const spreadColumn = this.table.getColumn("Spread");
        if (spreadColumn) spreadColumn.setWidth(SPREAD_TOTAL_WIDTH);
        
        const totalColumn = this.table.getColumn("Total");
        if (totalColumn) totalColumn.setWidth(SPREAD_TOTAL_WIDTH);
    }

    calculateAndApplyWidths() {
        if (!this.table) return;
        const tableElement = this.table.element;
        if (!tableElement) return;
        
        const isSmallScreen = isMobile() || isTablet();
        
        try {
            const tableHolder = tableElement.querySelector('.tabulator-tableholder');
            
            let totalColumnWidth = 0;
            this.table.getColumns().forEach(col => { if (col.isVisible()) totalColumnWidth += col.getWidth(); });
            
            const SCROLLBAR_WIDTH = isSmallScreen ? 0 : 17;
            const totalWidth = totalColumnWidth + SCROLLBAR_WIDTH;
            
            // Set tabulator to exact content width.
            // On desktop: CSS width:auto!important lets these inline styles work freely.
            // On mobile: tableStyles.js has .tabulator { width: 100% !important } which
            //   would beat inline styles. But we removed max-width constraint via CSS,
            //   and we set min-width here to force the tabulator to stay wide.
            tableElement.style.width = totalWidth + 'px';
            tableElement.style.minWidth = totalWidth + 'px';
            tableElement.style.maxWidth = totalWidth + 'px';
            
            if (tableHolder) { 
                tableHolder.style.width = totalWidth + 'px'; 
                tableHolder.style.maxWidth = totalWidth + 'px'; 
            }
            
            const header = tableElement.querySelector('.tabulator-header');
            if (header) header.style.width = totalWidth + 'px';
            
            // On mobile: also override TabManager's inline styles on the container.
            if (isSmallScreen) {
                const tc = tableElement.closest('.table-container');
                if (tc) {
                    tc.style.width = '';
                    tc.style.minWidth = '';
                    tc.style.overflowX = '';
                }
                
                tableElement.style.setProperty('width', totalWidth + 'px', 'important');
                tableElement.style.setProperty('min-width', totalWidth + 'px', 'important');
                tableElement.style.setProperty('max-width', totalWidth + 'px', 'important');
            }
            
            console.log(`NHL Matchups: Set width to ${totalWidth}px (columns: ${totalColumnWidth}px + scrollbar: ${SCROLLBAR_WIDTH}px, device: ${isSmallScreen ? 'mobile' : 'desktop'})`);
        } catch (error) {
            console.error('NHL Matchups calculateAndApplyWidths error:', error);
        }
    }

    forceRecalculateWidths() {
        const data = this.table ? this.table.getData() : [];
        if (data.length > 0) { this.scanDataForMaxWidths(data); }
        this.calculateAndApplyWidths();
    }
    
    expandNameColumnToFill() {
        this.calculateAndApplyWidths();
    }

    getColumns(isSmallScreen = false) {
        return [
            {
                title: "Matchup",
                field: "Matchup",
                // NOT frozen - Matchups table has no frozen columns
                widthGrow: 0,
                minWidth: isSmallScreen ? 120 : 200,
                sorter: function(a, b) {
                    const parseTime = (str) => {
                        if (!str) return 0;
                        const match = str.match(/,\s*(\w+)\s+(\d+),\s*(\d+):(\d+)\s*(AM|PM)\s*/i);
                        if (!match) return 0;
                        const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
                        const mon = months[match[1]] || 0;
                        const day = parseInt(match[2], 10);
                        let hour = parseInt(match[3], 10);
                        const min = parseInt(match[4], 10);
                        const ampm = match[5].toUpperCase();
                        if (ampm === 'PM' && hour !== 12) hour += 12;
                        if (ampm === 'AM' && hour === 12) hour = 0;
                        return new Date(2026, mon, day, hour, min).getTime();
                    };
                    return parseTime(a) - parseTime(b);
                },
                headerFilter: true,
                resizable: false,
                hozAlign: "left"
            },
            {
                title: "Spread",
                field: "Spread",
                width: SPREAD_TOTAL_WIDTH,
                widthGrow: 0,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Total",
                field: "Total",
                width: SPREAD_TOTAL_WIDTH,
                widthGrow: 0,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            }
        ];
    }
}
