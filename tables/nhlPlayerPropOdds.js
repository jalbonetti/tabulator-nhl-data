// tables/nhlPlayerPropOdds.js - NHL Player Prop Odds Table
// EXACT COPY of NBA basketPlayerPropOdds.js pattern for width management.
// CRITICAL: renderHorizontal must be "basic" for fitData layout compatibility
// NHL-specific: team abbreviations, prop abbreviations
//
// WIDTH MANAGEMENT (matches NBA exactly):
// - scanDataForMaxWidths: mobile/tablet only scans Best Odds Books. Desktop scans all.
// - calculateAndApplyWidths: mobile/tablet sets explicit pixel widths so tabulator
//   can overflow the container (container scrolls horizontally). Desktop sets pixel widths.
// - forceRecalculateWidths: ALWAYS calls both scan + calculateAndApply (no mobile guard).
//   This ensures mobile path actively sets proper widths regardless of CSS constraints.
// - Callbacks: tableBuilt/dataLoaded gate equalize+calculate behind desktop check,
//   but forceRecalculateWidths (called by TabManager) does NOT gate.
//
// MOBILE FIX: Previously, calculateAndApplyWidths on mobile just cleared all widths,
// letting CSS `max-width: 100% !important` from tableStyles.js crush all columns into
// the viewport width. This caused header text to wrap mid-word ("Matchu p", "Te a m").
// Now we inject container-specific CSS overrides (matching nhlMatchups.js pattern) and
// set explicit pixel widths on mobile so columns maintain their natural size.

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { createBankrollInput, bankrollFilterFunction, getBankrollValue } from '../components/bankrollInput.js';
import { isMobile, isTablet } from '../shared/config.js';

const NAME_COLUMN_MIN_WIDTH = 205;
const EV_KELLY_COLUMN_MIN_WIDTH = 65;

export class NHLPlayerPropOddsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyPlayerPropOdds');
        this._stylesInjected = false;
        
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
            'Tampa Bay Lightning': 'TBL', 'Toronto Maple Leafs': 'TOR', 'Utah Hockey Club': 'UTA',
            'Vancouver Canucks': 'VAN', 'Vegas Golden Knights': 'VGK', 'Washington Capitals': 'WSH',
            'Winnipeg Jets': 'WPG', 'Arizona Coyotes': 'ARI',
        };

        this.propAbbrevMap = {
            'Goals': 'Goals', 'Assists': 'Asts', 'Points': 'Pts',
            'Shots on Goal': 'SOG', 'Saves': 'Saves', 'Blocked Shots': 'Blk',
            'Hits': 'Hits', 'Power Play Points': 'PPP', 'Goals + Assists': 'G+A',
        };
    }

    // =========================================================================
    // MOBILE FIX: Inject container-specific CSS overrides for #table1-container
    // This mirrors what nhlMatchups.js does for #table0-container.
    // On mobile, we need the container to scroll horizontally while the tabulator
    // element can be wider than the viewport.
    // =========================================================================
    _injectPropOddsStyles() {
        if (this._stylesInjected) return;
        const styleId = 'nhl-prop-odds-width-override';
        if (document.querySelector(`#${styleId}`)) { this._stylesInjected = true; return; }
        
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            /* =====================================================
               DESKTOP (>1024px): Override blanket rules so JS can
               set tight pixel widths. Container wraps to content.
               ===================================================== */
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
            
            /* =====================================================
               MOBILE/TABLET (<=1024px): 
               - Container: capped to viewport, scrolls horizontally
               - Tabulator: must NOT be constrained to container width.
                 We remove the max-width:100% that tableStyles.js sets,
                 so the tabulator can be wider than the container.
                 JS inline styles set the actual pixel width.
               ===================================================== */
            @media screen and (max-width: 1024px) {
                #table1-container {
                    max-width: 100vw !important;
                    overflow-x: auto !important;
                    overflow-y: visible !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                
                #table1-container .tabulator {
                    max-width: none !important;
                    min-width: 0 !important;
                }
                
                #table1-container .tabulator .tabulator-tableholder {
                    overflow-x: visible !important;
                    overflow-y: auto !important;
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
        // Inject container-specific CSS overrides BEFORE building the table
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
        
        // === CALLBACKS: Match NBA basketPlayerPropOdds.js exactly ===
        
        this.table.on("tableBuilt", () => {
            console.log("NHL Player Prop Odds table built");
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    // Desktop-only: equalize clusters and set container width
                    if (!isMobile() && !isTablet()) {
                        this.equalizeClusteredColumns();
                    }
                    this.calculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                }
            }, 200);
            
            // Re-adjust on window resize
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0) {
                    this.calculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                }
            }, 250));
        });
        
        this.table.on("dataLoaded", () => {
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    if (!isMobile() && !isTablet()) {
                        this.equalizeClusteredColumns();
                    }
                    this.calculateAndApplyWidths();
                }
                this.ensureNameColumnWidth();
            }, 200);
        });
        
        this.table.on("renderComplete", () => {
            setTimeout(() => this.calculateAndApplyWidths(), 100);
            setTimeout(() => this.ensureNameColumnWidth(), 50);
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

    // Called by TabManager on tab switch.
    // CRITICAL: No mobile guard here — ALWAYS calls calculateAndApplyWidths.
    // On mobile, calculateAndApplyWidths now sets explicit pixel widths
    // so columns don't get crushed by CSS max-width:100%.
    forceRecalculateWidths() {
        if (!this.table) return;
        console.log('NHL Player Prop Odds forceRecalculateWidths called');
        
        const data = this.table.getData() || [];
        if (data.length > 0) {
            this.scanDataForMaxWidths(data);
            if (!isMobile() && !isTablet()) {
                this.equalizeClusteredColumns();
            }
        }
        // ALWAYS call - mobile path sets explicit widths, desktop path sets them too
        this.calculateAndApplyWidths();
        this.ensureNameColumnWidth();
    }

    expandNameColumnToFill() {
        this.calculateAndApplyWidths();
    }

    // =========================================================================
    // FIXED: On mobile/tablet, instead of just clearing widths (which lets
    // CSS max-width:100% crush columns), we now set explicit pixel widths
    // matching the nhlMatchups.js pattern. The container-specific CSS overrides
    // injected by _injectPropOddsStyles() remove the max-width constraint on
    // the tabulator, so it can be wider than the container and scroll.
    // On desktop, sets precise pixel widths (unchanged).
    // =========================================================================
    calculateAndApplyWidths() {
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
            
            // Set tabulator to exact content width.
            // On desktop: CSS width:auto!important lets these inline styles work freely.
            // On mobile: Our injected CSS removes the max-width:100% constraint for
            //   #table1-container .tabulator, so these inline styles take effect.
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
                
                // Use !important to override any remaining CSS constraints
                tableElement.style.setProperty('width', totalWidth + 'px', 'important');
                tableElement.style.setProperty('min-width', totalWidth + 'px', 'important');
                tableElement.style.setProperty('max-width', totalWidth + 'px', 'important');
            } else {
                // Desktop: set container to fit-content
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

    // MATCHES NBA: On mobile/tablet, only scan Best Odds Books.
    // Desktop: full scan with canvas measurement.
    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        console.log(`NHL Player Prop Odds Scanning ${data.length} rows (mobile: ${mobile}, tablet: ${tablet})...`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const maxWidths = {
            "Player Best Odds Books": 0
        };
        
        if (!isSmallScreen) {
            maxWidths["Player Matchup"] = 0;
            maxWidths["Player Team"] = 0;
            maxWidths["Player Prop Type"] = 0;
            maxWidths["Player Over/Under"] = 0;
            maxWidths["Player Book"] = 0;
            maxWidths["Player Prop Odds"] = 0;
            maxWidths["Player Median Odds"] = 0;
            maxWidths["Player Best Odds"] = 0;
            maxWidths["EV %"] = 0;
            maxWidths["Quarter Kelly %"] = 0;
            maxWidths["Link"] = 0;
        }
        
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
        
        Object.keys(maxWidths).forEach(field => {
            const title = fieldToTitle[field] || field;
            const headerWidth = ctx.measureText(title).width + HEADER_PADDING + SORT_ICON_WIDTH;
            maxWidths[field] = headerWidth;
        });
        
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        
        data.forEach(row => {
            Object.keys(maxWidths).forEach(field => {
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
                    if (textWidth > maxWidths[field]) maxWidths[field] = textWidth;
                }
            });
        });
        
        const longestAbbrevMatchup = "VGK @ TBL";
        const longestMatchupWidth = ctx.measureText(longestAbbrevMatchup).width;
        if (maxWidths["Player Matchup"] !== undefined && longestMatchupWidth > maxWidths["Player Matchup"]) {
            maxWidths["Player Matchup"] = longestMatchupWidth;
        }
        
        const CELL_PADDING = 16;
        const BUFFER = 8;
        
        Object.keys(maxWidths).forEach(field => {
            if (maxWidths[field] > 0) {
                const column = this.table.getColumn(field);
                if (column) {
                    const requiredWidth = maxWidths[field] + CELL_PADDING + BUFFER;
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

    equalizeClusteredColumns() {
        if (!this.table || isMobile() || isTablet()) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const CELL_PADDING = 16;
        const SORT_ICON_WIDTH = 20;
        
        const oddsCluster = ['Player Prop Odds', 'Player Median Odds', 'Player Best Odds'];
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
            { title: "Book Odds", field: "Player Prop Odds", widthGrow: 0, minWidth: 55, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Median Odds", field: "Player Median Odds", widthGrow: 0, minWidth: 55, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Best Odds", field: "Player Best Odds", widthGrow: 0, minWidth: 55, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds" },
            { title: "Best Books", field: "Player Best Odds Books", widthGrow: 0, minWidth: 70, sorter: "string", resizable: false, hozAlign: "center" },
            { title: "EV %", field: "EV %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.percentSorter(a, b); }, resizable: false, formatter: evFormatter, hozAlign: "center", cssClass: "cluster-ev-kelly" },
            { title: "Bet Size", field: "Quarter Kelly %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH, sorter: function(a, b) { return self.percentSorter(a, b); }, headerFilter: createBankrollInput, headerFilterFunc: bankrollFilterFunction, headerFilterLiveFilter: false, headerFilterParams: { bankrollKey: 'NHL Quarter Kelly %' }, resizable: false, formatter: kellyFormatter, hozAlign: "center", cssClass: "cluster-ev-kelly" },
            { title: "Link", field: "Link", width: 50, widthGrow: 0, minWidth: 40, maxWidth: 50, sorter: "string", resizable: false, hozAlign: "center", formatter: linkFormatter, headerSort: false }
        ];
    }
}
