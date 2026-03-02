// tables/nhlPlayerPropOdds.js - NHL Player Prop Odds Table
// Matches NBA basketPlayerPropOdds.js pattern for width management
// CRITICAL: renderHorizontal must be "basic" for fitData layout compatibility
// NHL-specific: team abbreviations, prop abbreviations
//
// MOBILE FIX: scanDataForMaxWidths now scans ALL columns on ALL devices
// with responsive font sizes (10/11/12px). This ensures col.setWidth()
// atomically sets both header and data widths, preventing the misalignment
// that occurs when Tabulator's fitData sizes data cells independently
// from headers that stay at minWidth.

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { createBankrollInput, bankrollFilterFunction, getBankrollValue } from '../components/bankrollInput.js';
import { isMobile, isTablet } from '../shared/config.js';

// Fixed minimum for Player Name column (longest NHL names + status indicator)
const NAME_COLUMN_MIN_WIDTH = 205;
const EV_KELLY_COLUMN_MIN_WIDTH = 65;

export class NHLPlayerPropOddsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyPlayerPropOdds');
        
        // NHL Team full name to abbreviation mapping (all 32 teams)
        this.teamAbbrevMap = {
            'Anaheim Ducks': 'ANA',
            'Boston Bruins': 'BOS',
            'Buffalo Sabres': 'BUF',
            'Calgary Flames': 'CGY',
            'Carolina Hurricanes': 'CAR',
            'Chicago Blackhawks': 'CHI',
            'Colorado Avalanche': 'COL',
            'Columbus Blue Jackets': 'CBJ',
            'Dallas Stars': 'DAL',
            'Detroit Red Wings': 'DET',
            'Edmonton Oilers': 'EDM',
            'Florida Panthers': 'FLA',
            'Los Angeles Kings': 'LAK',
            'LA Kings': 'LAK',
            'Minnesota Wild': 'MIN',
            'Montreal Canadiens': 'MTL',
            'Montréal Canadiens': 'MTL',
            'Nashville Predators': 'NSH',
            'New Jersey Devils': 'NJD',
            'New York Islanders': 'NYI',
            'NY Islanders': 'NYI',
            'New York Rangers': 'NYR',
            'NY Rangers': 'NYR',
            'Ottawa Senators': 'OTT',
            'Philadelphia Flyers': 'PHI',
            'Pittsburgh Penguins': 'PIT',
            'San Jose Sharks': 'SJS',
            'Seattle Kraken': 'SEA',
            'St. Louis Blues': 'STL',
            'St Louis Blues': 'STL',
            'Tampa Bay Lightning': 'TBL',
            'Toronto Maple Leafs': 'TOR',
            'Utah Hockey Club': 'UTA',
            'Vancouver Canucks': 'VAN',
            'Vegas Golden Knights': 'VGK',
            'Washington Capitals': 'WSH',
            'Winnipeg Jets': 'WPG',
            'Arizona Coyotes': 'ARI',
        };

        // NHL prop type abbreviation mapping
        this.propAbbrevMap = {
            'Goals': 'Goals',
            'Assists': 'Asts',
            'Points': 'Pts',
            'Shots on Goal': 'SOG',
            'Saves': 'Saves',
            'Blocked Shots': 'Blk',
            'Hits': 'Hits',
            'Power Play Points': 'PPP',
            'Goals + Assists': 'G+A',
        };
    }

    // Convert full team names in matchup string to abbreviations
    abbreviateMatchup(matchup) {
        if (!matchup) return '-';
        let abbreviated = matchup;
        Object.entries(this.teamAbbrevMap).forEach(([fullName, abbrev]) => {
            const regex = new RegExp(fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            abbreviated = abbreviated.replace(regex, abbrev);
        });
        return abbreviated;
    }

    // Abbreviate prop type for table display
    abbreviateProp(prop) {
        if (!prop) return '-';
        return this.propAbbrevMap[prop] || prop;
    }

    // Abbreviate team name for Team column display
    abbreviateTeam(team) {
        if (!team) return '-';
        return this.teamAbbrevMap[team] || team;
    }

    initialize() {
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        // Get base config and override specific settings
        const baseConfig = this.getBaseConfig();
        
        const config = {
            ...baseConfig,
            virtualDom: true,
            virtualDomBuffer: 500,
            renderVertical: "virtual",
            renderHorizontal: "basic", // CRITICAL: Use "basic" for compatibility with fitData layout
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
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    // FIXED: Always scan on all devices — this sets col widths atomically
                    this.scanDataForMaxWidths(data);
                    // Desktop-only: equalize clusters and set container width
                    if (!isMobile() && !isTablet()) {
                        this.equalizeClusteredColumns();
                        this.calculateAndApplyWidths();
                    }
                }
                this.ensureNameColumnWidth();
            }, 200);
            
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0 && !isMobile() && !isTablet()) {
                    this.calculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                }
            }, 250));
        });
        
        this.table.on("renderComplete", () => {
            if (!isMobile() && !isTablet()) {
                setTimeout(() => this.calculateAndApplyWidths(), 100);
            }
            setTimeout(() => this.ensureNameColumnWidth(), 50);
        });
        
        this.table.on("dataLoaded", () => {
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    // FIXED: Always scan on all devices
                    this.scanDataForMaxWidths(data);
                    if (!isMobile() && !isTablet()) {
                        this.equalizeClusteredColumns();
                        this.calculateAndApplyWidths();
                    }
                }
                this.ensureNameColumnWidth();
            }, 200);
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

    // Force recalculation of column widths - called by TabManager on tab switch
    forceRecalculateWidths() {
        if (!this.table) return;
        console.log('NHL Player Prop Odds forceRecalculateWidths called');
        
        const data = this.table.getData() || [];
        if (data.length > 0) {
            // FIXED: Always scan on all devices
            this.scanDataForMaxWidths(data);
            if (!isMobile() && !isTablet()) {
                this.equalizeClusteredColumns();
                this.calculateAndApplyWidths();
            }
        }
        this.ensureNameColumnWidth();
    }

    expandNameColumnToFill() {
        this.calculateAndApplyWidths();
    }

    // Desktop: constrains table to content width + scrollbar
    calculateAndApplyWidths() {
        if (!this.table) return;
        if (isMobile() || isTablet()) return;
        
        try {
            const columns = this.table.getColumns();
            let totalColumnWidth = 0;
            columns.forEach(col => { if (col.isVisible()) totalColumnWidth += col.getWidth(); });
            
            const tableElement = this.table.element;
            const tableHolder = tableElement.querySelector('.tabulator-tableholder');
            const SCROLLBAR_WIDTH = 17;
            const totalWidthWithScrollbar = totalColumnWidth + SCROLLBAR_WIDTH;
            
            tableElement.style.width = totalWidthWithScrollbar + 'px';
            tableElement.style.minWidth = totalWidthWithScrollbar + 'px';
            tableElement.style.maxWidth = totalWidthWithScrollbar + 'px';
            
            if (tableHolder) {
                tableHolder.style.width = totalWidthWithScrollbar + 'px';
                tableHolder.style.maxWidth = totalWidthWithScrollbar + 'px';
            }
            
            const tabulatorHeader = tableElement.querySelector('.tabulator-header');
            if (tabulatorHeader) {
                tabulatorHeader.style.width = totalWidthWithScrollbar + 'px';
            }
            
            const tableContainer = tableElement.closest('.table-container');
            if (tableContainer) {
                tableContainer.style.width = 'fit-content';
                tableContainer.style.minWidth = 'auto';
                tableContainer.style.maxWidth = 'none';
            }
            
            console.log(`NHL Player Prop Odds: Set table width to ${totalWidthWithScrollbar}px`);
        } catch (error) {
            console.error('Error in NHL Player Prop Odds calculateAndApplyWidths:', error);
        }
    }

    // FIXED: Scan ALL columns on ALL devices with responsive font sizes.
    // Uses col.setWidth() which atomically sets both header and data column widths,
    // preventing the misalignment that occurs when headers stay at minWidth
    // while Tabulator's fitData independently sizes data cells wider.
    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const baseFontSize = mobile ? 10 : tablet ? 11 : 12;
        
        console.log(`NHL Player Prop Odds Scanning ${data.length} rows for max column widths (font: ${baseFontSize}px)...`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // FIXED: Always scan ALL columns on ALL devices
        const maxWidths = {
            "Player Matchup": 0,
            "Player Team": 0,
            "Player Prop Type": 0,
            "Player Over/Under": 0,
            "Player Book": 0,
            "Player Prop Odds": 0,
            "Player Median Odds": 0,
            "Player Best Odds": 0,
            "Player Best Odds Books": 0,
            "EV %": 0,
            "Quarter Kelly %": 0,
            "Link": 0
        };
        
        // First measure header widths with responsive font
        ctx.font = `600 ${baseFontSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
        const HEADER_PADDING = 16;
        const SORT_ICON_WIDTH = 16;
        
        const fieldToTitle = {
            "Player Matchup": "Matchup",
            "Player Team": "Team",
            "Player Prop Type": "Prop",
            "Player Over/Under": "Label",
            "Player Book": "Book",
            "Player Prop Odds": "Book Odds",
            "Player Median Odds": "Median Odds",
            "Player Best Odds": "Best Odds",
            "Player Best Odds Books": "Best Books",
            "EV %": "EV %",
            "Quarter Kelly %": "Bet Size",
            "Link": "Link"
        };
        
        Object.keys(maxWidths).forEach(field => {
            const title = fieldToTitle[field] || field;
            const headerWidth = ctx.measureText(title).width + HEADER_PADDING + SORT_ICON_WIDTH;
            maxWidths[field] = headerWidth;
        });
        
        // Now measure data widths with responsive font
        ctx.font = `500 ${baseFontSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
        
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
                    }
                }
            }
        });
        
        this.ensureNameColumnWidth();
        console.log('NHL Player Prop Odds Max width scan complete');
    }

    // Custom sorters
    oddsSorter(a, b) {
        const getNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            const str = String(val).trim();
            if (str.startsWith('+')) return parseInt(str.substring(1), 10) || -99999;
            const num = parseInt(str, 10);
            return isNaN(num) ? -99999 : num;
        };
        return getNum(a) - getNum(b);
    }

    percentSorter(a, b) {
        const getNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            const num = parseFloat(val);
            return isNaN(num) ? -99999 : num;
        };
        return getNum(a) - getNum(b);
    }

    // Equalize clustered columns (desktop only)
    equalizeClusteredColumns() {
        if (!this.table || isMobile() || isTablet()) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const CELL_PADDING = 16;
        const SORT_ICON_WIDTH = 20;
        
        // Group 1: Odds columns
        const oddsCluster = ['Player Prop Odds', 'Player Median Odds', 'Player Best Odds'];
        let maxOddsWidth = 0;
        
        oddsCluster.forEach(field => {
            const col = this.table.getColumn(field);
            if (col) {
                const colWidth = col.getWidth();
                if (colWidth > maxOddsWidth) maxOddsWidth = colWidth;
            }
        });
        
        const oddsHeaders = ['Book Odds', 'Median Odds', 'Best Odds'];
        oddsHeaders.forEach(title => {
            const headerWidth = ctx.measureText(title).width + CELL_PADDING + SORT_ICON_WIDTH;
            if (headerWidth > maxOddsWidth) maxOddsWidth = headerWidth;
        });
        
        oddsCluster.forEach(field => {
            const col = this.table.getColumn(field);
            if (col) col.setWidth(Math.ceil(maxOddsWidth));
        });
        
        // Group 2: EV/Kelly columns
        const evKellyCluster = ['EV %', 'Quarter Kelly %'];
        let maxEvKellyWidth = EV_KELLY_COLUMN_MIN_WIDTH;
        
        evKellyCluster.forEach(field => {
            const col = this.table.getColumn(field);
            if (col) {
                const colWidth = col.getWidth();
                if (colWidth > maxEvKellyWidth) maxEvKellyWidth = colWidth;
            }
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
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateMatchup(value);
        };

        const teamFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateTeam(value);
        };

        const propFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateProp(value);
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
            if (bankroll > 0) {
                const amount = num * bankroll;
                return '$' + amount.toFixed(2);
            }
            return (num * 100).toFixed(1) + '%';
        };

        const linkFormatter = (cell) => {
            const value = cell.getValue();
            if (!value || value === '-' || value === '') return '-';
            const a = document.createElement('a');
            a.href = value;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.textContent = 'Bet';
            a.style.cssText = 'color: #2563eb; text-decoration: underline; font-weight: 500;';
            return a;
        };

        return [
            {
                title: "Name", field: "Player Name", frozen: true, widthGrow: 0,
                minWidth: NAME_COLUMN_MIN_WIDTH, sorter: "string", headerFilter: true,
                resizable: false, hozAlign: "left"
            },
            {
                title: "Matchup", field: "Player Matchup", widthGrow: 0,
                minWidth: 70,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center", formatter: matchupFormatter
            },
            {
                title: "Team", field: "Player Team", widthGrow: 0,
                minWidth: 45,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center", formatter: teamFormatter
            },
            {
                title: "Prop", field: "Player Prop Type", widthGrow: 0,
                minWidth: 55,
                sorter: "string", headerFilter: createCustomMultiSelect,
                headerFilterParams: {
                    valuesLookup: function(cell) {
                        const values = cell.getTable().getData().map(row => row["Player Prop Type"]);
                        return [...new Set(values)].filter(v => v != null && v !== '').sort();
                    }
                },
                resizable: false, hozAlign: "center", formatter: propFormatter
            },
            {
                title: "Label", field: "Player Over/Under", widthGrow: 0,
                minWidth: 50,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center"
            },
            {
                title: "Line", field: "Player Prop Line", widthGrow: 0,
                minWidth: 50,
                sorter: "number",
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: lineFormatter, hozAlign: "center"
            },
            {
                title: "Book", field: "Player Book", widthGrow: 0,
                minWidth: 55,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center"
            },
            {
                title: "Book Odds", field: "Player Prop Odds", widthGrow: 0,
                minWidth: 55,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Median Odds", field: "Player Median Odds", widthGrow: 0,
                minWidth: 55,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Best Odds", field: "Player Best Odds", widthGrow: 0,
                minWidth: 55,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Best Books", field: "Player Best Odds Books", widthGrow: 0,
                minWidth: 70,
                sorter: "string", resizable: false, hozAlign: "center"
            },
            {
                title: "EV %", field: "EV %", widthGrow: 0,
                minWidth: EV_KELLY_COLUMN_MIN_WIDTH,
                sorter: function(a, b) { return self.percentSorter(a, b); },
                resizable: false, formatter: evFormatter,
                hozAlign: "center", cssClass: "cluster-ev-kelly"
            },
            {
                title: "Bet Size", field: "Quarter Kelly %", widthGrow: 0,
                minWidth: EV_KELLY_COLUMN_MIN_WIDTH,
                sorter: function(a, b) { return self.percentSorter(a, b); },
                headerFilter: createBankrollInput, headerFilterFunc: bankrollFilterFunction,
                headerFilterLiveFilter: false,
                headerFilterParams: { bankrollKey: 'NHL Quarter Kelly %' },
                resizable: false, formatter: kellyFormatter,
                hozAlign: "center", cssClass: "cluster-ev-kelly"
            },
            {
                title: "Link", field: "Link", width: 50, widthGrow: 0,
                minWidth: 40, maxWidth: 50,
                sorter: "string", resizable: false, hozAlign: "center",
                formatter: linkFormatter, headerSort: false
            }
        ];
    }
}
