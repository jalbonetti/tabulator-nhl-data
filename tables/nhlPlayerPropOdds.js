// tables/nhlPlayerPropOdds.js - NHL Player Prop Odds Table
// CRITICAL: renderHorizontal must be "basic" for fitData layout compatibility
// NHL-specific: team abbreviations, prop abbreviations
//
// WIDTH MANAGEMENT:
// - scanDataForMaxWidths: ALWAYS measures header widths for all columns on all devices.
//   Data row scanning: mobile scans Best Odds Books only, desktop scans all columns.
// - calculateAndApplyWidths: Gates behind _firstCalcDone. Sets explicit pixel widths.
// - forceRecalculateWidths: Called by TabManager on tab switch. Also gates.
// - equalizeClusteredColumns: NOW RUNS ON ALL DEVICES. Mobile sizes odds to "Median Odds" header width.
//
// MOBILE FIX: Container-specific CSS overrides remove the blanket max-width:100%.
// Header titles use white-space:nowrap.
//
// FIXES APPLIED:
// - Mobile tableholder overflow-x changed from 'visible' to 'auto' to enable frozen Name column
// - EV_KELLY_COLUMN_MIN_WIDTH increased from 65 to 80 to fit bankroll input without clipping

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { createBankrollInput, bankrollFilterFunction, getBankrollValue } from '../components/bankrollInput.js';
import { isMobile, isTablet } from '../shared/config.js';

const NAME_COLUMN_MIN_WIDTH = 205;
const EV_KELLY_COLUMN_MIN_WIDTH = 80;
const ODDS_COLUMN_MIN_WIDTH = 80;

export class NHLPlayerPropOddsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyPlayerPropOdds');
        this._stylesInjected = false;
        this._firstCalcDone = false;
        
        this.teamAbbrevMap = {
            'Anaheim Ducks': 'ANA', 'Boston Bruins': 'BOS', 'Buffalo Sabres': 'BUF',
            'Calgary Flames': 'CGY', 'Carolina Hurricanes': 'CAR', 'Chicago Blackhawks': 'CHI',
            'Colorado Avalanche': 'COL', 'Columbus Blue Jackets': 'CBJ', 'Dallas Stars': 'DAL',
            'Detroit Red Wings': 'DET', 'Edmonton Oilers': 'EDM', 'Florida Panthers': 'FLA',
            'Los Angeles Kings': 'LAK', 'LA Kings': 'LAK', 'Minnesota Wild': 'MIN',
            'Montreal Canadiens': 'MTL', 'Montréal Canadiens': 'MTL', 'Nashville Predators': 'NSH',
            'New Jersey Devils': 'NJD', 'New York Islanders': 'NYI', 'NY Islanders': 'NYI',
            'New York Rangers': 'NYR', 'NY Rangers': 'NYR', 'Ottawa Senators': 'OTT',
            'Philadelphia Flyers': 'PHI', 'Pittsburgh Penguins': 'PIT', 'San Jose Sharks': 'SJS',
            'Seattle Kraken': 'SEA', 'St. Louis Blues': 'STL', 'St Louis Blues': 'STL',
            'Tampa Bay Lightning': 'TBL', 'Toronto Maple Leafs': 'TOR', 'Utah Mammoth': 'UTA',
            'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VGK', 'Washington Capitals': 'WSH',
            'Winnipeg Jets': 'WPG', 'Arizona Coyotes': 'ARI',
        };

        this.propAbbrevMap = {
            'Goals': 'Goals', 'Assists': 'Asts', 'Points': 'Pts',
            'Shots on Goal': 'SOG', 'Saves': 'Saves', 'Blocked Shots': 'Blk',
            'Hits': 'Hits', 'Power Play Points': 'PPP', 'Goals + Assists': 'G+A',
        };
    }

    _injectPropOddsStyles() {
        if (this._stylesInjected) return;
        const styleId = 'nhl-prop-odds-width-override';
        if (document.querySelector(`#${styleId}`)) { this._stylesInjected = true; return; }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @media screen and (min-width: 1025px) {
                #table1-container {
                    width: fit-content !important;
                    max-width: none !important;
                    overflow-x: visible !important;
                }
                #table1-container .tabulator {
                    width: auto !important;
                    max-width: none !important;
                }
                #table1-container .tabulator .tabulator-tableholder {
                    overflow-y: auto !important;
                }
            }
            
            @media screen and (max-width: 1024px) {
                #table1-container {
                    max-width: 100vw !important;
                    overflow-x: hidden !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table1-container .tabulator {
                    max-width: 100% !important;
                    min-width: 0 !important;
                }
                /* FIXED: Changed from overflow-x: visible to overflow-x: auto
                   so the tableholder becomes the scroll container and frozen
                   columns work correctly (sticky needs a scrolling ancestor) */
                #table1-container .tabulator .tabulator-tableholder {
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table1-container .tabulator-col-title {
                    white-space: nowrap !important;
                    word-break: normal !important;
                    overflow-wrap: normal !important;
                }
            }
        `;
        document.head.appendChild(style);
        this._stylesInjected = true;
        console.log('NHL Player Prop Odds: Injected width override styles');
    }

    abbreviateMatchup(matchup) {
        if (!matchup) return '-';
        let abbreviated = matchup;
        Object.entries(this.teamAbbrevMap).forEach(([fullName, abbrev]) => {
            const regex = new RegExp(fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            abbreviated = abbreviated.replace(regex, abbrev);
        });
        return abbreviated;
    }

    abbreviateProp(prop) {
        if (!prop) return '-';
        return this.propAbbrevMap[prop] || prop;
    }

    abbreviateTeam(team) {
        if (!team) return '-';
        return this.teamAbbrevMap[team] || team;
    }

    initialize() {
        this._injectPropOddsStyles();
        
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        const baseConfig = this.getBaseConfig();
        
        const config = {
            ...baseConfig,
            virtualDom: true,
            virtualDomBuffer: 500,
            renderVertical: "virtual",
            renderHorizontal: "basic",
            pagination: false,
            paginationSize: false,
            layoutColumnsOnNewData: false,
            responsiveLayout: false,
            maxHeight: "600px",
            height: "600px",
            placeholder: "Loading player prop odds...",
            layout: "fitData",
            columns: this.getColumns(isSmallScreen),
            initialSort: [{column: "EV %", dir: "desc"}],
            dataLoaded: (data) => {
                console.log(`NHL Player Prop Odds loaded ${data.length} records`);
                this.dataLoaded = true;
                const element = document.querySelector(this.elementId);
                if (element) { const ld = element.querySelector('.loading-indicator'); if (ld) ld.remove(); }
            },
            ajaxError: (error) => { console.error("Error loading NHL player prop odds:", error); }
        };

        this.table = new Tabulator(this.elementId, config);
        
        this.table.on("tableBuilt", () => {
            console.log("NHL Player Prop Odds table built");
            
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0 && this._firstCalcDone) {
                    this._doCalculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                }
            }, 250));
        });
        
        this.table.on("dataLoaded", () => {
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    this.equalizeClusteredColumns();
                    this._doCalculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                    this._firstCalcDone = true;
                    console.log('NHL Player Prop Odds: First calc done, width updates now enabled');
                }
            }, 100);
        });
        
        this.table.on("renderComplete", () => {
            if (this._firstCalcDone) {
                setTimeout(() => {
                    this._doCalculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                }, 100);
            }
        });
    }

    ensureNameColumnWidth() {
        if (!this.table) return;
        const nameCol = this.table.getColumn("Player Name");
        if (nameCol && nameCol.getWidth() < NAME_COLUMN_MIN_WIDTH) {
            nameCol.setWidth(NAME_COLUMN_MIN_WIDTH);
        }
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }

    forceRecalculateWidths() {
        if (!this.table) return;
        console.log('NHL Player Prop Odds forceRecalculateWidths called');
        
        if (!this._firstCalcDone) {
            console.log('NHL Player Prop Odds: Skipping — first calc not done yet');
            return;
        }
        
        const data = this.table.getData() || [];
        if (data.length > 0) {
            this.scanDataForMaxWidths(data);
            this.equalizeClusteredColumns();
        }
        this._doCalculateAndApplyWidths();
        this.ensureNameColumnWidth();
    }

    expandNameColumnToFill() {
        if (this._firstCalcDone) this._doCalculateAndApplyWidths();
    }

    calculateAndApplyWidths() {
        if (!this._firstCalcDone) return;
        this._doCalculateAndApplyWidths();
    }

    _doCalculateAndApplyWidths() {
        if (!this.table) return;
        
        const tableElement = this.table.element;
        if (!tableElement) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        try {
            const columns = this.table.getColumns();
            let totalColumnWidth = 0;
            columns.forEach(col => { if (col.isVisible()) totalColumnWidth += col.getWidth(); });
            
            const tableHolder = tableElement.querySelector('.tabulator-tableholder');
            const SCROLLBAR_WIDTH = isSmallScreen ? 0 : 17;
            const totalWidth = totalColumnWidth + SCROLLBAR_WIDTH;
            
            tableElement.style.width = totalWidth + 'px';
            tableElement.style.minWidth = totalWidth + 'px';
            tableElement.style.maxWidth = totalWidth + 'px';
            
            if (tableHolder) { 
                tableHolder.style.width = totalWidth + 'px'; 
                tableHolder.style.maxWidth = totalWidth + 'px'; 
            }
            
            const header = tableElement.querySelector('.tabulator-header');
            if (header) header.style.width = totalWidth + 'px';
            
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
            } else {
                const tableContainer = tableElement.closest('.table-container');
                if (tableContainer) {
                    tableContainer.style.width = 'fit-content';
                    tableContainer.style.minWidth = 'auto';
                    tableContainer.style.maxWidth = 'none';
                }
            }
            
            this.ensureNameColumnWidth();
            
            console.log(`NHL Player Prop Odds: Set width to ${totalWidth}px (columns: ${totalColumnWidth}px + scrollbar: ${SCROLLBAR_WIDTH}px, device: ${isSmallScreen ? 'mobile' : 'desktop'})`);
        } catch (error) {
            console.error('Error in NHL Player Prop Odds calculateAndApplyWidths:', error);
        }
    }

    // FIXED: Now measures header widths for ALL columns on ALL devices.
    // Data row scanning: mobile scans Best Odds Books only, desktop scans all.
    // This ensures columns like "Book Odds", "Median Odds", "Best Odds" get
    // properly sized to fit their header text with white-space:nowrap on first load.
    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        console.log(`NHL Player Prop Odds Scanning ${data.length} rows (mobile: ${mobile}, tablet: ${tablet})...`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // ALL columns get header measurement on ALL devices
        const allFields = {
            "Player Matchup": 0, "Player Team": 0, "Player Prop Type": 0,
            "Player Over/Under": 0, "Player Book": 0, "Player Prop Odds": 0,
            "Player Median Odds": 0, "Player Best Odds": 0,
            "Player Best Odds Books": 0, "EV %": 0, "Quarter Kelly %": 0, "Link": 0
        };
        
        // Measure header widths for ALL columns (critical for nowrap headers)
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const HEADER_PADDING = 16;
        const SORT_ICON_WIDTH = 16;
        
        const fieldToTitle = {
            "Player Matchup": "Matchup", "Player Team": "Team", "Player Prop Type": "Prop",
            "Player Over/Under": "Label", "Player Book": "Book", "Player Prop Odds": "Book Odds",
            "Player Median Odds": "Median Odds", "Player Best Odds": "Best Odds",
            "Player Best Odds Books": "Best Books", "EV %": "EV %",
            "Quarter Kelly %": "Bet Size", "Link": "Link"
        };
        
        Object.keys(allFields).forEach(field => {
            const title = fieldToTitle[field] || field;
            const headerWidth = ctx.measureText(title).width + HEADER_PADDING + SORT_ICON_WIDTH;
            allFields[field] = headerWidth;
        });
        
        // Data row scanning: mobile = Best Odds Books only, desktop = all columns
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        
        const dataFieldsToScan = isSmallScreen
            ? ["Player Best Odds Books"]  // Mobile: only scan variable-width column
            : Object.keys(allFields);     // Desktop: scan all
        
        data.forEach(row => {
            dataFieldsToScan.forEach(field => {
                const value = row[field];
                if (value !== null && value !== undefined && value !== '') {
                    let displayValue = String(value);
                    if (field.includes('Odds') && field !== 'Player Best Odds Books') {
                        const num = parseInt(value, 10);
                        if (!isNaN(num)) displayValue = num > 0 ? `+${num}` : `${num}`;
                    }
                    if (field === 'EV %' || field === 'Quarter Kelly %') {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                            const pctDisplay = (num * 100).toFixed(1) + '%';
                            const moneyDisplay = '$99999.99';
                            displayValue = pctDisplay.length > moneyDisplay.length ? pctDisplay : moneyDisplay;
                        }
                    }
                    if (field === 'Player Prop Type') displayValue = this.abbreviateProp(value);
                    if (field === 'Player Matchup') displayValue = this.abbreviateMatchup(value);
                    if (field === 'Player Team') displayValue = this.abbreviateTeam(value);
                    if (field === 'Link') displayValue = 'Bet';
                    
                    const textWidth = ctx.measureText(displayValue).width;
                    if (textWidth > allFields[field]) allFields[field] = textWidth;
                }
            });
        });
        
        if (!isSmallScreen) {
            const longestAbbrevMatchup = "VGK @ TBL";
            const longestMatchupWidth = ctx.measureText(longestAbbrevMatchup).width;
            if (longestMatchupWidth > allFields["Player Matchup"]) {
                allFields["Player Matchup"] = longestMatchupWidth;
            }
        }
        
        const CELL_PADDING = 16;
        const BUFFER = 8;
        
        Object.keys(allFields).forEach(field => {
            if (allFields[field] > 0) {
                const column = this.table.getColumn(field);
                if (column) {
                    const requiredWidth = allFields[field] + CELL_PADDING + BUFFER;
                    const currentWidth = column.getWidth();
                    if (requiredWidth > currentWidth) {
                        column.setWidth(Math.ceil(requiredWidth));
                        console.log(`NHL Player Prop Odds Set ${field} to ${Math.ceil(requiredWidth)}px (was ${currentWidth}px)`);
                    }
                }
            }
        });
        
        this.ensureNameColumnWidth();
        console.log('NHL Player Prop Odds scan complete');
    }

    oddsSorter(a, b) {
        const getNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            const str = String(val).trim();
            if (str.startsWith('+')) return parseInt(str.substring(1), 10) || -99999;
            return parseInt(str, 10) || -99999;
        };
        return getNum(a) - getNum(b);
    }

    percentSorter(a, b) {
        const getNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            return parseFloat(val) || -99999;
        };
        return getNum(a) - getNum(b);
    }

    // FIXED: Now runs on ALL devices. Mobile sizes odds to "Median Odds" header width.
    equalizeClusteredColumns() {
        if (!this.table) return;
        
        const isSmallScreen = isMobile() || isTablet();
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const CELL_PADDING = 16;
        const SORT_ICON_WIDTH = 20;
        
        const oddsCluster = ['Player Prop Odds', 'Player Median Odds', 'Player Best Odds'];
        
        if (isSmallScreen) {
            // MOBILE: Size all odds columns to "Median Odds" header width (the widest header)
            const medianOddsHeaderWidth = ctx.measureText('Median Odds').width + CELL_PADDING + SORT_ICON_WIDTH;
            const targetWidth = Math.ceil(medianOddsHeaderWidth);
            oddsCluster.forEach(field => {
                const col = this.table.getColumn(field);
                if (col) col.setWidth(targetWidth);
            });
            
            // Also equalize EV/Kelly on mobile
            const evKellyCluster = ['EV %', 'Quarter Kelly %'];
            const betSizeHeaderWidth = ctx.measureText('Bet Size').width + CELL_PADDING + SORT_ICON_WIDTH;
            const evHeaderWidth = ctx.measureText('EV %').width + CELL_PADDING + SORT_ICON_WIDTH;
            const evKellyTarget = Math.ceil(Math.max(betSizeHeaderWidth, evHeaderWidth, EV_KELLY_COLUMN_MIN_WIDTH));
            evKellyCluster.forEach(field => {
                const col = this.table.getColumn(field);
                if (col) col.setWidth(evKellyTarget);
            });
            
            console.log(`NHL Player Prop Odds Mobile equalized odds to ${targetWidth}px, EV/Kelly to ${evKellyTarget}px`);
        } else {
            // DESKTOP: Use max of data width or header width (existing logic)
            let maxOddsWidth = 0;
            oddsCluster.forEach(field => {
                const col = this.table.getColumn(field);
                if (col && col.getWidth() > maxOddsWidth) maxOddsWidth = col.getWidth();
            });
            ['Book Odds', 'Median Odds', 'Best Odds'].forEach(title => {
                const w = ctx.measureText(title).width + CELL_PADDING + SORT_ICON_WIDTH;
                if (w > maxOddsWidth) maxOddsWidth = w;
            });
            oddsCluster.forEach(field => {
                const col = this.table.getColumn(field);
                if (col) col.setWidth(Math.ceil(maxOddsWidth));
            });
            
            const evKellyCluster = ['EV %', 'Quarter Kelly %'];
            let maxEvKellyWidth = EV_KELLY_COLUMN_MIN_WIDTH;
            evKellyCluster.forEach(field => {
                const col = this.table.getColumn(field);
                if (col && col.getWidth() > maxEvKellyWidth) maxEvKellyWidth = col.getWidth();
            });
            evKellyCluster.forEach(field => {
                const col = this.table.getColumn(field);
                if (col) col.setWidth(Math.ceil(maxEvKellyWidth));
            });
            
            console.log(`NHL Player Prop Odds Equalized odds to ${Math.ceil(maxOddsWidth)}px, EV/Kelly to ${Math.ceil(maxEvKellyWidth)}px`);
        }
    }

    getColumns(isSmallScreen = false) {
        const self = this;
        
        const oddsFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseInt(value, 10);
            if (isNaN(num)) return '-';
            return num > 0 ? `+${num}` : `${num}`;
        };

        const lineFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            return num.toFixed(1);
        };

        const matchupFormatter = (cell) => {
            const value = cell.getValue();
            return value ? self.abbreviateMatchup(value) : '-';
        };

        const teamFormatter = (cell) => {
            const value = cell.getValue();
            return value ? self.abbreviateTeam(value) : '-';
        };

        const propFormatter = (cell) => {
            const value = cell.getValue();
            return value ? self.abbreviateProp(value) : '-';
        };

        const evFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            return (num * 100).toFixed(1) + '%';
        };

        const kellyFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            const bankroll = getBankrollValue('NHL Quarter Kelly %');
            if (bankroll > 0) return '$' + (num * bankroll).toFixed(2);
            return (num * 100).toFixed(1) + '%';
        };

        const linkFormatter = (cell) => {
            const value = cell.getValue();
            if (!value || value === '-' || value === '') return '-';
            const a = document.createElement('a');
            a.href = value; a.target = '_blank'; a.rel = 'noopener noreferrer';
            a.textContent = 'Bet';
            a.style.cssText = 'color: #2563eb; text-decoration: underline; font-weight: 500;';
            return a;
        };

        return [
            { title: "Name", field: "Player Name", frozen: true, widthGrow: 0, minWidth: NAME_COLUMN_MIN_WIDTH, sorter: "string", headerFilter: true, resizable: false, hozAlign: "left" },
            { title: "Matchup", field: "Player Matchup", widthGrow: 0, minWidth: 70, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center", formatter: matchupFormatter },
            { title: "Team", field: "Player Team", widthGrow: 0, minWidth: 45, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center", formatter: teamFormatter },
            { title: "Prop", field: "Player Prop Type", widthGrow: 0, minWidth: 55, sorter: "string", headerFilter: createCustomMultiSelect, headerFilterParams: { valuesLookup: function(cell) { return [...new Set(cell.getTable().getData().map(row => row["Player Prop Type"]))].filter(v => v != null && v !== '').sort(); } }, resizable: false, hozAlign: "center", formatter: propFormatter },
            { title: "Label", field: "Player Over/Under", widthGrow: 0, minWidth: 50, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center" },
            { title: "Line", field: "Player Prop Line", widthGrow: 0, minWidth: 50, sorter: "number", headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: lineFormatter, hozAlign: "center" },
            { title: "Book", field: "Player Book", widthGrow: 0, minWidth: 60, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center" },
            { title: "Book Odds", field: "Player Prop Odds", widthGrow: 0, minWidth: ODDS_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Median Odds", field: "Player Median Odds", widthGrow: 0, minWidth: ODDS_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Best Odds", field: "Player Best Odds", widthGrow: 0, minWidth: ODDS_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Best Books", field: "Player Best Odds Books", widthGrow: 0, minWidth: 70, sorter: "string", resizable: false, hozAlign: "center" },
            { title: "EV %", field: "EV %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.percentSorter(a, b); }, resizable: false, formatter: evFormatter, hozAlign: "center", cssClass: "cluster-ev-kelly" },
            { title: "Bet Size", field: "Quarter Kelly %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.percentSorter(a, b); }, headerFilter: createBankrollInput, headerFilterFunc: bankrollFilterFunction, headerFilterLiveFilter: false, headerFilterParams: { bankrollKey: 'NHL Quarter Kelly %' }, resizable: false, formatter: kellyFormatter, hozAlign: "center", cssClass: "cluster-ev-kelly" },
            { title: "Link", field: "Link", width: 50, widthGrow: 0, minWidth: 40, maxWidth: 50, sorter: "string", resizable: false, hozAlign: "center", formatter: linkFormatter, headerSort: false }
        ];
    }
}
