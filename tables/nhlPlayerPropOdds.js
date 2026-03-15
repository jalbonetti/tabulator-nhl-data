// tables/nhlPlayerPropOdds.js - NHL Player Prop Odds Table
// CRITICAL: renderHorizontal must be "basic" for fitData layout compatibility
// NHL-specific: team abbreviations, prop abbreviations
//
// MOBILE FROZEN COLUMN FIX:
// - Container: overflow-x: hidden (prevents double scrollbar)
// - Tabulator element: 100% width (NOT pixel widths) so it stays within container
// - Tableholder: overflow-x: auto (this is the scroll container)
// - _doCalculateAndApplyWidths: On mobile, does NOT set pixel widths on tabulator element

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
                #table2-container {
                    width: fit-content !important;
                    max-width: none !important;
                    overflow-x: visible !important;
                }
                #table2-container .tabulator {
                    width: auto !important;
                    max-width: none !important;
                }
                #table2-container .tabulator .tabulator-tableholder {
                    overflow-y: auto !important;
                }
            }
            
            @media screen and (max-width: 1024px) {
                /* Container clips to viewport — tableholder scrolls inside */
                #table2-container {
                    width: 100% !important;
                    max-width: 100vw !important;
                    overflow-x: hidden !important;
                }
                /* Tabulator stays within container bounds */
                #table2-container .tabulator {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                }
                /* Tableholder is the SCROLL CONTAINER for frozen columns */
                #table2-container .tabulator .tabulator-tableholder {
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table2-container .tabulator-col-title {
                    white-space: nowrap !important;
                    word-break: normal !important;
                    overflow-wrap: normal !important;
                }
            }
        `;
        document.head.appendChild(style);
        this._stylesInjected = true;
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
        if (!this.table || !this._firstCalcDone) return;
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
            
            if (isSmallScreen) {
                // MOBILE: Do NOT set pixel widths on the tabulator element.
                // The tabulator must stay at 100% of its container so the
                // tableholder becomes the horizontal scroll container.
                // Frozen columns use position:sticky inside the scrolling tableholder.
                const tc = tableElement.closest('.table-container');
                if (tc) {
                    tc.style.width = '';
                    tc.style.minWidth = '';
                    tc.style.overflowX = '';
                }
                // Clear any previously-set inline pixel widths
                tableElement.style.removeProperty('width');
                tableElement.style.removeProperty('min-width');
                tableElement.style.removeProperty('max-width');
            } else {
                // DESKTOP: Set explicit pixel widths for fit-content layout
                const SCROLLBAR_WIDTH = 17;
                const totalWidth = totalColumnWidth + SCROLLBAR_WIDTH;
                
                tableElement.style.width = totalWidth + 'px';
                tableElement.style.minWidth = totalWidth + 'px';
                tableElement.style.maxWidth = totalWidth + 'px';
                
                const tableHolder = tableElement.querySelector('.tabulator-tableholder');
                if (tableHolder) { 
                    tableHolder.style.width = totalWidth + 'px'; 
                    tableHolder.style.maxWidth = totalWidth + 'px'; 
                }
                
                const header = tableElement.querySelector('.tabulator-header');
                if (header) header.style.width = totalWidth + 'px';
                
                const tableContainer = tableElement.closest('.table-container');
                if (tableContainer) {
                    tableContainer.style.width = 'fit-content';
                    tableContainer.style.minWidth = 'auto';
                    tableContainer.style.maxWidth = 'none';
                }
            }
            this.ensureNameColumnWidth();
        } catch (error) {
            console.error('Error in NHL Player Prop Odds calculateAndApplyWidths:', error);
        }
    }

    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const allFields = {
            "Player Matchup": 0, "Player Team": 0, "Player Prop Type": 0,
            "Player Over/Under": 0, "Player Book": 0, "Player Prop Odds": 0,
            "Player Median Odds": 0, "Player Best Odds": 0,
            "Player Best Odds Books": 0, "EV %": 0, "Quarter Kelly %": 0, "Link": 0
        };
        
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
            allFields[field] = ctx.measureText(title).width + HEADER_PADDING + SORT_ICON_WIDTH;
        });
        
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const dataFieldsToScan = isSmallScreen ? ["Player Best Odds Books"] : Object.keys(allFields);
        
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
                        if (!isNaN(num)) displayValue = '$99999.99';
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
        
        const CELL_PADDING = 16;
        const BUFFER = 8;
        Object.keys(allFields).forEach(field => {
            if (allFields[field] > 0) {
                const column = this.table.getColumn(field);
                if (column) {
                    const requiredWidth = allFields[field] + CELL_PADDING + BUFFER;
                    if (requiredWidth > column.getWidth()) column.setWidth(Math.ceil(requiredWidth));
                }
            }
        });
        this.ensureNameColumnWidth();
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
            const targetWidth = Math.ceil(ctx.measureText('Median Odds').width + CELL_PADDING + SORT_ICON_WIDTH);
            oddsCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(targetWidth); });
            const evKellyCluster = ['EV %', 'Quarter Kelly %'];
            const evKellyTarget = Math.ceil(Math.max(
                ctx.measureText('Bet Size').width + CELL_PADDING + SORT_ICON_WIDTH,
                ctx.measureText('EV %').width + CELL_PADDING + SORT_ICON_WIDTH,
                EV_KELLY_COLUMN_MIN_WIDTH));
            evKellyCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(evKellyTarget); });
        } else {
            let maxOddsWidth = 0;
            oddsCluster.forEach(f => { const c = this.table.getColumn(f); if (c && c.getWidth() > maxOddsWidth) maxOddsWidth = c.getWidth(); });
            ['Book Odds', 'Median Odds', 'Best Odds'].forEach(t => { const w = ctx.measureText(t).width + CELL_PADDING + SORT_ICON_WIDTH; if (w > maxOddsWidth) maxOddsWidth = w; });
            oddsCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(Math.ceil(maxOddsWidth)); });
            const evKellyCluster = ['EV %', 'Quarter Kelly %'];
            let maxEvKellyWidth = EV_KELLY_COLUMN_MIN_WIDTH;
            evKellyCluster.forEach(f => { const c = this.table.getColumn(f); if (c && c.getWidth() > maxEvKellyWidth) maxEvKellyWidth = c.getWidth(); });
            evKellyCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(Math.ceil(maxEvKellyWidth)); });
        }
    }

    getColumns(isSmallScreen = false) {
        const self = this;
        const oddsFormatter = (cell) => { const v = cell.getValue(); if (v === null || v === undefined || v === '' || v === '-') return '-'; const n = parseInt(v, 10); if (isNaN(n)) return '-'; return n > 0 ? `+${n}` : `${n}`; };
        const lineFormatter = (cell) => { const v = cell.getValue(); if (v === null || v === undefined || v === '') return '-'; const n = parseFloat(v); if (isNaN(n)) return '-'; return n.toFixed(1); };
        const matchupFormatter = (cell) => { const v = cell.getValue(); return v ? self.abbreviateMatchup(v) : '-'; };
        const teamFormatter = (cell) => { const v = cell.getValue(); return v ? self.abbreviateTeam(v) : '-'; };
        const propFormatter = (cell) => { const v = cell.getValue(); return v ? self.abbreviateProp(v) : '-'; };
        const evFormatter = (cell) => { const v = cell.getValue(); if (v === null || v === undefined || v === '' || v === '-') return '-'; const n = parseFloat(v); if (isNaN(n)) return '-'; return (n * 100).toFixed(1) + '%'; };
        const kellyFormatter = (cell) => { const v = cell.getValue(); if (v === null || v === undefined || v === '' || v === '-') return '-'; const n = parseFloat(v); if (isNaN(n)) return '-'; const b = getBankrollValue('NHL Quarter Kelly %'); if (b > 0) return '$' + (n * b).toFixed(2); return (n * 100).toFixed(1) + '%'; };
        const linkFormatter = (cell) => { const v = cell.getValue(); if (!v || v === '-' || v === '') return '-'; const a = document.createElement('a'); a.href = v; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Bet'; a.style.cssText = 'color: #2563eb; text-decoration: underline; font-weight: 500;'; return a; };

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
