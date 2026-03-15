// tables/nhlGameOdds.js - NHL Game Odds Table
// CRITICAL: renderHorizontal must be "basic" for fitData layout compatibility
//
// MOBILE FROZEN COLUMN FIX:
// - Container: overflow-x: hidden, Tabulator: 100% width, Tableholder: overflow-x: auto
// - _doCalculateAndApplyWidths: On mobile, does NOT set pixel widths on tabulator element

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { createBankrollInput, bankrollFilterFunction, getBankrollValue } from '../components/bankrollInput.js';
import { isMobile, isTablet } from '../shared/config.js';

const EV_KELLY_COLUMN_MIN_WIDTH = 80;
const ODDS_COLUMN_MIN_WIDTH = 80;

export class NHLGameOddsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyGameOdds');
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
    }

    _injectGameOddsStyles() {
        if (this._stylesInjected) return;
        const styleId = 'nhl-game-odds-width-override';
        if (document.querySelector(`#${styleId}`)) { this._stylesInjected = true; return; }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @media screen and (min-width: 1025px) {
                #table3-container {
                    width: fit-content !important;
                    max-width: none !important;
                    overflow-x: visible !important;
                }
                #table3-container .tabulator {
                    width: auto !important;
                    max-width: none !important;
                }
                #table3-container .tabulator .tabulator-tableholder {
                    overflow-y: auto !important;
                }
            }
            
            @media screen and (max-width: 1024px) {
                #table3-container {
                    width: 100% !important;
                    max-width: 100vw !important;
                    overflow-x: hidden !important;
                }
                #table3-container .tabulator {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                }
                #table3-container .tabulator .tabulator-tableholder {
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table3-container .tabulator-col-title {
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

    initialize() {
        this._injectGameOddsStyles();
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        const baseConfig = this.getBaseConfig();
        
        const config = {
            ...baseConfig,
            virtualDom: true, virtualDomBuffer: 500,
            renderVertical: "virtual", renderHorizontal: "basic",
            pagination: false, paginationSize: false,
            layoutColumnsOnNewData: false, responsiveLayout: false,
            maxHeight: "600px", height: "600px",
            placeholder: "Loading game odds...",
            layout: "fitData",
            columns: this.getColumns(isSmallScreen),
            initialSort: [{column: "EV %", dir: "desc"}],
            dataLoaded: (data) => {
                console.log(`NHL Game Odds loaded ${data.length} records`);
                this.dataLoaded = true;
                const element = document.querySelector(this.elementId);
                if (element) { const ld = element.querySelector('.loading-indicator'); if (ld) ld.remove(); }
            },
            ajaxError: (error) => { console.error("Error loading NHL game odds:", error); }
        };

        this.table = new Tabulator(this.elementId, config);
        
        this.table.on("tableBuilt", () => {
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0 && this._firstCalcDone) {
                    this._doCalculateAndApplyWidths();
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
                    this._firstCalcDone = true;
                }
            }, 100);
        });
        
        this.table.on("renderComplete", () => {
            if (this._firstCalcDone) {
                setTimeout(() => this._doCalculateAndApplyWidths(), 100);
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }

    forceRecalculateWidths() {
        if (!this.table || !this._firstCalcDone) return;
        const data = this.table.getData() || [];
        if (data.length > 0) { this.scanDataForMaxWidths(data); this.equalizeClusteredColumns(); }
        this._doCalculateAndApplyWidths();
    }

    expandNameColumnToFill() { if (this._firstCalcDone) this._doCalculateAndApplyWidths(); }
    calculateAndApplyWidths() { if (this._firstCalcDone) this._doCalculateAndApplyWidths(); }

    _doCalculateAndApplyWidths() {
        if (!this.table) return;
        const tableElement = this.table.element;
        if (!tableElement) return;
        const isSmallScreen = isMobile() || isTablet();
        
        try {
            const columns = this.table.getColumns();
            let totalColumnWidth = 0;
            columns.forEach(col => { if (col.isVisible()) totalColumnWidth += col.getWidth(); });
            
            if (isSmallScreen) {
                // MOBILE: Do NOT set pixel widths on the tabulator element.
                const tc = tableElement.closest('.table-container');
                if (tc) { tc.style.width = ''; tc.style.minWidth = ''; tc.style.overflowX = ''; }
                tableElement.style.removeProperty('width');
                tableElement.style.removeProperty('min-width');
                tableElement.style.removeProperty('max-width');
            } else {
                const SCROLLBAR_WIDTH = 17;
                const totalWidth = totalColumnWidth + SCROLLBAR_WIDTH;
                tableElement.style.width = totalWidth + 'px';
                tableElement.style.minWidth = totalWidth + 'px';
                tableElement.style.maxWidth = totalWidth + 'px';
                const tableHolder = tableElement.querySelector('.tabulator-tableholder');
                if (tableHolder) { tableHolder.style.width = totalWidth + 'px'; tableHolder.style.maxWidth = totalWidth + 'px'; }
                const header = tableElement.querySelector('.tabulator-header');
                if (header) header.style.width = totalWidth + 'px';
                const tableContainer = tableElement.closest('.table-container');
                if (tableContainer) { tableContainer.style.width = 'fit-content'; tableContainer.style.minWidth = 'auto'; tableContainer.style.maxWidth = 'none'; }
            }
        } catch (error) {
            console.error('Error in NHL Game Odds calculateAndApplyWidths:', error);
        }
    }

    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        const isSmallScreen = isMobile() || isTablet();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxWidths = {
            "Game Matchup": 0, "Game Prop Type": 0, "Game Label": 0, "Game Book": 0,
            "Game Odds": 0, "Game Median Odds": 0, "Game Best Odds": 0,
            "Game Best Odds Books": 0, "EV %": 0, "Quarter Kelly %": 0, "Link": 0
        };
        
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const HEADER_PADDING = 16, SORT_ICON_WIDTH = 16;
        const fieldToTitle = {
            "Game Matchup": "Matchup", "Game Prop Type": "Prop", "Game Label": "Label",
            "Game Book": "Book", "Game Odds": "Book Odds", "Game Median Odds": "Median Odds",
            "Game Best Odds": "Best Odds", "Game Best Odds Books": "Best Books",
            "EV %": "EV %", "Quarter Kelly %": "Bet Size", "Link": "Link"
        };
        Object.keys(maxWidths).forEach(field => {
            maxWidths[field] = ctx.measureText(fieldToTitle[field] || field).width + HEADER_PADDING + SORT_ICON_WIDTH;
        });
        
        if (!isSmallScreen) {
            ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
            data.forEach(row => {
                Object.keys(maxWidths).forEach(field => {
                    const value = row[field];
                    if (value !== null && value !== undefined && value !== '') {
                        let dv = String(value);
                        if (field.includes('Odds') && field !== 'Game Best Odds Books') { const n = parseInt(value, 10); if (!isNaN(n)) dv = n > 0 ? `+${n}` : `${n}`; }
                        if (field === 'EV %' || field === 'Quarter Kelly %') dv = '$99999.99';
                        if (field === 'Link') dv = 'Bet';
                        const tw = ctx.measureText(dv).width;
                        if (tw > maxWidths[field]) maxWidths[field] = tw;
                    }
                });
            });
            const lmw = ctx.measureText("Philadelphia Flyers @ Pittsburgh Penguins").width;
            if (lmw > maxWidths["Game Matchup"]) maxWidths["Game Matchup"] = lmw;
        }
        
        const CELL_PADDING = 16, BUFFER = 8;
        Object.keys(maxWidths).forEach(field => {
            if (maxWidths[field] > 0) {
                const col = this.table.getColumn(field);
                if (col) { const rw = maxWidths[field] + CELL_PADDING + BUFFER; if (rw > col.getWidth()) col.setWidth(Math.ceil(rw)); }
            }
        });
    }

    oddsSorter(a, b) { const g = v => { if (v == null || v === '' || v === '-') return -99999; const s = String(v).trim(); return parseInt(s.startsWith('+') ? s.substring(1) : s, 10) || -99999; }; return g(a) - g(b); }
    percentSorter(a, b) { const g = v => { if (v == null || v === '' || v === '-') return -99999; return parseFloat(v) || -99999; }; return g(a) - g(b); }

    equalizeClusteredColumns() {
        if (!this.table) return;
        const isSmallScreen = isMobile() || isTablet();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const CP = 16, SI = 20;
        const oddsCluster = ['Game Odds', 'Game Median Odds', 'Game Best Odds'];
        
        if (isSmallScreen) {
            const tw = Math.ceil(ctx.measureText('Median Odds').width + CP + SI);
            oddsCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(tw); });
            const evKellyCluster = ['EV %', 'Quarter Kelly %'];
            const ekt = Math.ceil(Math.max(ctx.measureText('Bet Size').width + CP + SI, ctx.measureText('EV %').width + CP + SI, EV_KELLY_COLUMN_MIN_WIDTH));
            evKellyCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(ekt); });
        } else {
            let mow = 0;
            oddsCluster.forEach(f => { const c = this.table.getColumn(f); if (c && c.getWidth() > mow) mow = c.getWidth(); });
            ['Book Odds', 'Median Odds', 'Best Odds'].forEach(t => { const w = ctx.measureText(t).width + CP + SI; if (w > mow) mow = w; });
            oddsCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(Math.ceil(mow)); });
            const evKellyCluster = ['EV %', 'Quarter Kelly %'];
            let mek = EV_KELLY_COLUMN_MIN_WIDTH;
            evKellyCluster.forEach(f => { const c = this.table.getColumn(f); if (c && c.getWidth() > mek) mek = c.getWidth(); });
            evKellyCluster.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(Math.ceil(mek)); });
        }
    }

    getColumns(isSmallScreen = false) {
        const self = this;
        const oddsFormatter = (cell) => { const v = cell.getValue(); if (v == null || v === '' || v === '-') return '-'; const n = parseInt(v, 10); if (isNaN(n)) return '-'; return n > 0 ? `+${n}` : `${n}`; };
        const lineFormatter = (cell) => { const v = cell.getValue(); if (v == null || v === '') return ''; const n = parseFloat(v); return isNaN(n) ? '' : n.toFixed(1); };
        const evFormatter = (cell) => { const v = cell.getValue(); if (v == null || v === '' || v === '-') return '-'; const n = parseFloat(v); if (isNaN(n)) return '-'; return (n * 100).toFixed(1) + '%'; };
        const kellyFormatter = (cell) => { const v = cell.getValue(); if (v == null || v === '' || v === '-') return '-'; const n = parseFloat(v); if (isNaN(n)) return '-'; const b = getBankrollValue('NHL Game Quarter Kelly %'); if (b > 0) return '$' + (n * b).toFixed(2); return (n * 100).toFixed(1) + '%'; };
        const linkFormatter = (cell) => { const v = cell.getValue(); if (!v || v === '-' || v === '') return '-'; const a = document.createElement('a'); a.href = v; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = 'Bet'; a.style.cssText = 'color: #2563eb; text-decoration: underline; font-weight: 500;'; return a; };
        const matchupFormatter = (cell) => { const v = cell.getValue(); if (v == null || v === '') return '-'; return isSmallScreen ? self.abbreviateMatchup(v) : v; };

        return [
            { title: "Matchup", field: "Game Matchup", frozen: true, widthGrow: 0, minWidth: isSmallScreen ? 80 : 120, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "left", formatter: matchupFormatter },
            { title: "Prop", field: "Game Prop Type", widthGrow: 0, minWidth: 60, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center" },
            { title: "Label", field: "Game Label", widthGrow: 0, minWidth: 60, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center" },
            { title: "Line", field: "Game Line", widthGrow: 0, minWidth: 50, sorter: "number", headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, hozAlign: "center", formatter: lineFormatter },
            { title: "Book", field: "Game Book", widthGrow: 0, minWidth: 60, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center" },
            { title: "Book Odds", field: "Game Odds", widthGrow: 0, minWidth: ODDS_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Median Odds", field: "Game Median Odds", widthGrow: 0, minWidth: ODDS_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Best Odds", field: "Game Best Odds", widthGrow: 0, minWidth: ODDS_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Best Books", field: "Game Best Odds Books", widthGrow: 0, minWidth: 70, sorter: "string", resizable: false, hozAlign: "center" },
            { title: "EV %", field: "EV %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.percentSorter(a, b); }, resizable: false, formatter: evFormatter, hozAlign: "center", cssClass: "cluster-ev-kelly" },
            { title: "Bet Size", field: "Quarter Kelly %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.percentSorter(a, b); }, headerFilter: createBankrollInput, headerFilterFunc: bankrollFilterFunction, headerFilterLiveFilter: false, headerFilterParams: { bankrollKey: 'NHL Game Quarter Kelly %' }, resizable: false, formatter: kellyFormatter, hozAlign: "center", cssClass: "cluster-ev-kelly" },
            { title: "Link", field: "Link", width: 50, widthGrow: 0, minWidth: 40, maxWidth: 50, sorter: "string", resizable: false, hozAlign: "center", formatter: linkFormatter, headerSort: false }
        ];
    }
}
