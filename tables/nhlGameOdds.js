// tables/nhlGameOdds.js - NHL Game Odds Table
// Team abbreviation maps for matchup display on mobile/tablet
// EV% and Kelly% values multiplied by 100 before display
// Full width management: scanDataForMaxWidths, equalizeClusteredColumns, calculateAndApplyWidths

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { createBankrollInput, bankrollFilterFunction, getBankrollValue } from '../components/bankrollInput.js';
import { isMobile, isTablet } from '../shared/config.js';

const EV_KELLY_COLUMN_MIN_WIDTH = 65;

export class NHLGameOddsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyGameOdds');
        
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

    initialize() {
        const isSmallScreen = isMobile() || isTablet();
        const baseConfig = this.getBaseConfig();
        
        const config = {
            ...baseConfig,
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
            console.log("NHL Game Odds table built");
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    if (!isMobile() && !isTablet()) {
                        this.equalizeClusteredColumns();
                        this.calculateAndApplyWidths();
                    }
                }
            }, 200);
            
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0 && !isMobile() && !isTablet()) {
                    this.calculateAndApplyWidths();
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
                        this.calculateAndApplyWidths();
                    }
                }
            }, 200);
        });
    }

    // Scan ALL data to find max widths needed for text columns
    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        
        // Skip on mobile/tablet since we use abbreviated matchups
        if (isMobile() || isTablet()) return;
        
        console.log(`NHL Game Odds Scanning ${data.length} rows for max column widths...`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        
        const maxWidths = {
            "Game Matchup": 0,
            "Game Prop Type": 0,
            "Game Label": 0,
            "Game Book": 0,
            "Game Odds": 0,
            "Game Median Odds": 0,
            "Game Best Odds": 0,
            "Game Best Odds Books": 0,
            "EV %": 0,
            "Quarter Kelly %": 0,
            "Link": 0
        };
        
        data.forEach(row => {
            Object.keys(maxWidths).forEach(field => {
                const value = row[field];
                if (value !== null && value !== undefined && value !== '') {
                    let displayValue = String(value);
                    
                    if (field.includes('Odds') && field !== 'Game Best Odds Books') {
                        const num = parseInt(value, 10);
                        if (!isNaN(num)) {
                            displayValue = num > 0 ? `+${num}` : `${num}`;
                        }
                    }
                    if (field === 'EV %' || field === 'Quarter Kelly %') {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                            const pctDisplay = (num * 100).toFixed(1) + '%';
                            const moneyDisplay = '$99999.99';
                            displayValue = pctDisplay.length > moneyDisplay.length ? pctDisplay : moneyDisplay;
                        }
                    }
                    if (field === 'Link') {
                        displayValue = 'Bet';
                    }
                    
                    const textWidth = ctx.measureText(displayValue).width;
                    if (textWidth > maxWidths[field]) {
                        maxWidths[field] = textWidth;
                    }
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
        
        console.log('NHL Game Odds Max width scan complete');
    }

    // Equalize odds columns and EV/Kelly columns to same width
    equalizeClusteredColumns() {
        if (!this.table) return;
        if (isMobile() || isTablet()) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        
        const CELL_PADDING = 16;
        const SORT_ICON_WIDTH = 20;
        
        // Group 1: Odds columns
        const oddsCluster = ['Game Odds', 'Game Median Odds', 'Game Best Odds'];
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
        
        console.log(`NHL Game Odds Equalized odds to ${Math.ceil(maxOddsWidth)}px, EV/Kelly to ${Math.ceil(maxEvKellyWidth)}px`);
    }

    getColumns(isSmallScreen = false) {
        const self = this;
        
        // Matchup formatter - abbreviates on mobile/tablet
        const matchupFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            if (isMobile() || isTablet()) {
                return self.abbreviateMatchup(value);
            }
            return value;
        };

        const oddsFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseInt(value, 10);
            if (isNaN(num)) return '-';
            return num > 0 ? `+${num}` : `${num}`;
        };

        // EV % formatter - multiply by 100
        const evFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            return (num * 100).toFixed(1) + '%';
        };

        // Kelly formatter - multiply by 100 or convert to monetary amount
        const kellyFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            
            const bankroll = getBankrollValue('NHL Game Quarter Kelly %');
            if (bankroll > 0) {
                const amount = num * bankroll;
                return '$' + amount.toFixed(2);
            }
            return (num * 100).toFixed(1) + '%';
        };

        // Link formatter
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
                title: "Matchup", field: "Game Matchup", frozen: true, widthGrow: 0,
                minWidth: isSmallScreen ? 80 : 200,
                sorter: "string", headerFilter: true,
                resizable: false, hozAlign: "left", formatter: matchupFormatter
            },
            {
                title: "Prop", field: "Game Prop Type", widthGrow: 0, minWidth: 55,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center"
            },
            {
                title: "Label", field: "Game Label", widthGrow: 0, minWidth: 50,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center"
            },
            {
                title: "Line", field: "Game Line", widthGrow: 0, minWidth: 50,
                sorter: "number",
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false, hozAlign: "center"
            },
            {
                title: "Book", field: "Game Book", widthGrow: 0, minWidth: 55,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center"
            },
            {
                title: "Book Odds", field: "Game Odds", widthGrow: 0, minWidth: 55,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Median Odds", field: "Game Median Odds", widthGrow: 0, minWidth: 55,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Best Odds", field: "Game Best Odds", widthGrow: 0, minWidth: 55,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Best Books", field: "Game Best Odds Books", widthGrow: 0, minWidth: 70,
                sorter: "string", resizable: false, hozAlign: "center"
            },
            {
                title: "EV %", field: "EV %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH,
                sorter: function(a, b) { return self.percentSorter(a, b); },
                resizable: false, formatter: evFormatter,
                hozAlign: "center", cssClass: "cluster-ev-kelly"
            },
            {
                title: "Bet Size", field: "Quarter Kelly %", widthGrow: 0, minWidth: EV_KELLY_COLUMN_MIN_WIDTH,
                sorter: function(a, b) { return self.percentSorter(a, b); },
                headerFilter: createBankrollInput, headerFilterFunc: bankrollFilterFunction,
                headerFilterLiveFilter: false,
                headerFilterParams: { bankrollKey: 'NHL Game Quarter Kelly %' },
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
