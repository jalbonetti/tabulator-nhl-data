// tables/nhlPlayerPropOdds.js - NHL Player Prop Odds Table
// Includes Player Team column (like NBA version)
// Team abbreviation maps for matchups and team display
// NHL-specific prop abbreviations
// EV% and Kelly% values multiplied by 100 before display
// Full width management: scanDataForMaxWidths, equalizeClusteredColumns, calculateAndApplyWidths
//
// FIXES APPLIED:
// - Added calculateAndApplyWidths() with container fit-content logic (was missing)
// - Added renderComplete handler for proper width on tab switch
// - Added forceRecalculateWidths() for TabManager tab switch support
// - Added debounce() helper and resize event listener
// - These match the NBA basketPlayerPropOdds.js pattern exactly

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
            // Common short forms that may appear in data
            'Arizona Coyotes': 'ARI',
        };
        
        // NHL Prop type abbreviation mapping
        this.propAbbrevMap = {
            'Goals': 'Goals',
            'Assists': 'Asts',
            'Points': 'Pts',
            'Shots on Goal': 'SOG',
            'Shots On Goal': 'SOG',
            'Saves': 'Saves',
            'Blocked Shots': 'Blk',
            'Blocked shots': 'Blk',
            'Hits': 'Hits',
            'Power Play Points': 'PPP',
            'Powerplay Points': 'PPP',
            // Possible combo props
            'Goals + Assists': 'G+A',
            'Shots + Blocked Shots': 'SOG+B',
            'Hits + Blocked Shots': 'H+B',
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
        const isSmallScreen = isMobile() || isTablet();
        const baseConfig = this.getBaseConfig();
        
        const config = {
            ...baseConfig,
            placeholder: "Loading player prop odds...",
            layout: "fitData",
            columns: this.getColumns(isSmallScreen),
            initialSort: [{column: "EV %", dir: "desc"}],
            dataLoaded: (data) => {
                console.log(`NHL Player Prop Odds loaded ${data.length} records`);
                this.dataLoaded = true;
                
                if (data.length > 0) {
                    console.log('DEBUG - NHL Player Prop Odds First row sample:', {
                        'Player Name': data[0]["Player Name"],
                        'Player Matchup': data[0]["Player Matchup"],
                        'Player Team': data[0]["Player Team"],
                        'EV %': data[0]["EV %"],
                        'Quarter Kelly %': data[0]["Quarter Kelly %"]
                    });
                }
                
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
                    this.scanDataForMaxWidths(data);
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
        
        // FIX: Added renderComplete handler (matches NBA pattern)
        // Recalculates widths after render to handle tab switching properly
        this.table.on("renderComplete", () => {
            if (!isMobile() && !isTablet()) {
                setTimeout(() => {
                    this.calculateAndApplyWidths();
                }, 100);
            }
            
            // Always ensure Name column meets minimum width
            setTimeout(() => {
                this.ensureNameColumnWidth();
            }, 50);
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
        this.ensureHeaderMinWidths();
    }

    // Ensure ALL column headers fit on one line without wrapping on any device
    ensureHeaderMinWidths() {
        if (!this.table) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const baseFontSize = mobile ? 10 : tablet ? 11 : 12;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = `600 ${baseFontSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
        
        // Padding inside header cell + sort arrow icon
        const HEADER_PADDING = 16;
        const SORT_ICON_WIDTH = 16;
        
        this.table.getColumns().forEach(col => {
            const def = col.getDefinition();
            if (!def.title || def.headerSort === false) return;
            
            const headerTextWidth = ctx.measureText(def.title).width;
            const requiredWidth = Math.ceil(headerTextWidth + HEADER_PADDING + SORT_ICON_WIDTH);
            
            if (col.getWidth() < requiredWidth) {
                col.setWidth(requiredWidth);
            }
        });
    }

    // Debounce helper
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // FIX: Added forceRecalculateWidths - called by TabManager on tab switch
    forceRecalculateWidths() {
        if (!this.table) return;
        console.log('NHL Player Prop Odds forceRecalculateWidths called');
        
        const data = this.table.getData() || [];
        if (data.length > 0) {
            this.scanDataForMaxWidths(data);
            if (!isMobile() && !isTablet()) {
                this.equalizeClusteredColumns();
                this.calculateAndApplyWidths();
            }
        }
        this.ensureNameColumnWidth();
    }

    // Backward compatibility alias for main.js resize handler
    expandNameColumnToFill() {
        this.calculateAndApplyWidths();
    }

    // FIX: Added calculateAndApplyWidths (matches NBA basketPlayerPropOdds.js pattern)
    // Desktop: constrains table to content width + scrollbar, container to fit-content
    // This prevents the table from stretching to full window width
    // Grey background in .table-wrapper fills remaining space
    calculateAndApplyWidths() {
        if (!this.table) return;
        
        const tableElement = this.table.element;
        if (!tableElement) return;
        
        // Mobile/tablet: clear widths and exit
        if (isMobile() || isTablet()) {
            tableElement.style.width = '';
            tableElement.style.minWidth = '';
            tableElement.style.maxWidth = '';
            
            const tableContainer = tableElement.closest('.table-container');
            if (tableContainer) {
                tableContainer.style.width = '';
                tableContainer.style.minWidth = '';
                tableContainer.style.maxWidth = '';
            }
            
            this.ensureNameColumnWidth();
            console.log('NHL Player Prop Odds Mobile/tablet mode: container widths cleared');
            return;
        }
        
        try {
            const columns = this.table.getColumns();
            let totalColumnWidth = 0;
            
            columns.forEach(col => {
                if (col.isVisible()) {
                    totalColumnWidth += col.getWidth();
                }
            });
            
            const tableHolder = tableElement.querySelector('.tabulator-tableholder');
            
            // Add scrollbar width buffer for desktop
            const SCROLLBAR_WIDTH = 17;
            const totalWidthWithScrollbar = totalColumnWidth + SCROLLBAR_WIDTH;
            
            // Constrain tabulator element to exact content width
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
            
            // CRITICAL: Set container to fit-content so grey fills remaining space
            const tableContainer = tableElement.closest('.table-container');
            if (tableContainer) {
                tableContainer.style.width = 'fit-content';
                tableContainer.style.minWidth = 'auto';
                tableContainer.style.maxWidth = 'none';
            }
            
            console.log(`NHL Player Prop Odds: Set table width to ${totalWidthWithScrollbar}px (columns: ${totalColumnWidth}px + scrollbar: ${SCROLLBAR_WIDTH}px)`);
            
        } catch (error) {
            console.error('Error in NHL Player Prop Odds calculateAndApplyWidths:', error);
        }
    }

    // Scan ALL data to find max widths needed for text columns
    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        console.log(`NHL Player Prop Odds Scanning ${data.length} rows for max column widths...`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Always scan Best Books on all devices
        const maxWidths = {
            "Player Best Odds Books": 0
        };
        
        // Additional columns on desktop only
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
        
        // First measure header widths
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
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
        
        // Now measure data widths
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        
        data.forEach(row => {
            Object.keys(maxWidths).forEach(field => {
                const value = row[field];
                if (value !== null && value !== undefined && value !== '') {
                    let displayValue = String(value);
                    
                    // Format odds with +/- prefix
                    if (field.includes('Odds') && field !== 'Player Best Odds Books') {
                        const num = parseInt(value, 10);
                        if (!isNaN(num)) {
                            displayValue = num > 0 ? `+${num}` : `${num}`;
                        }
                    }
                    // Format EV% and Kelly% as percentage
                    if (field === 'EV %' || field === 'Quarter Kelly %') {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                            const pctDisplay = (num * 100).toFixed(1) + '%';
                            const moneyDisplay = '$99999.99';
                            displayValue = pctDisplay.length > moneyDisplay.length ? pctDisplay : moneyDisplay;
                        }
                    }
                    // Abbreviate prop type for measurement
                    if (field === 'Player Prop Type') {
                        displayValue = this.abbreviateProp(value);
                    }
                    // Abbreviate matchup for measurement
                    if (field === 'Player Matchup') {
                        displayValue = this.abbreviateMatchup(value);
                    }
                    // Abbreviate team for measurement
                    if (field === 'Player Team') {
                        displayValue = this.abbreviateTeam(value);
                    }
                    // Link displays "Bet"
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
                        console.log(`NHL Player Prop Odds Set ${field} to ${Math.ceil(requiredWidth)}px (was ${currentWidth}px)`);
                    }
                }
            }
        });
        
        this.ensureNameColumnWidth();
        console.log('NHL Player Prop Odds Max width scan complete');
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
        const oddsCluster = ['Player Prop Odds', 'Player Median Odds', 'Player Best Odds'];
        let maxOddsWidth = 0;
        
        oddsCluster.forEach(field => {
            const col = this.table.getColumn(field);
            if (col) {
                const colWidth = col.getWidth();
                if (colWidth > maxOddsWidth) maxOddsWidth = colWidth;
            }
        });
        
        // Include header text widths
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
        
        console.log(`NHL Player Prop Odds Equalized odds columns to ${Math.ceil(maxOddsWidth)}px, EV/Kelly to ${Math.ceil(maxEvKellyWidth)}px`);
    }

    getColumns(isSmallScreen = false) {
        const self = this;
        
        // Odds formatter
        const oddsFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseInt(value, 10);
            if (isNaN(num)) return '-';
            return num > 0 ? `+${num}` : `${num}`;
        };

        // Line formatter - 1 decimal place
        const lineFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            return num.toFixed(1);
        };

        // Matchup formatter - always abbreviates
        const matchupFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateMatchup(value);
        };

        // Team formatter - abbreviates team name
        const teamFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateTeam(value);
        };

        // Prop formatter - abbreviates prop type
        const propFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateProp(value);
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
            
            const bankroll = getBankrollValue('NHL Quarter Kelly %');
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
                title: "Name", field: "Player Name", frozen: true, widthGrow: 0,
                minWidth: NAME_COLUMN_MIN_WIDTH, sorter: "string", headerFilter: true,
                resizable: false, hozAlign: "left"
            },
            {
                title: "Matchup", field: "Player Matchup", widthGrow: 0,
                minWidth: 80, // Always abbreviated (e.g., "VGK @ BOS")
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center", formatter: matchupFormatter
            },
            {
                title: "Team", field: "Player Team", widthGrow: 0,
                minWidth: 55,
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
                minWidth: 55,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center"
            },
            {
                title: "Line", field: "Player Prop Line", widthGrow: 0,
                minWidth: 55,
                sorter: "number",
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: lineFormatter, hozAlign: "center"
            },
            {
                title: "Book", field: "Player Book", widthGrow: 0,
                minWidth: 60,
                sorter: "string", headerFilter: createCustomMultiSelect,
                resizable: false, hozAlign: "center"
            },
            {
                title: "Book Odds", field: "Player Prop Odds", widthGrow: 0,
                minWidth: 70,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Median Odds", field: "Player Median Odds", widthGrow: 0,
                minWidth: 75,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Best Odds", field: "Player Best Odds", widthGrow: 0,
                minWidth: 70,
                sorter: function(a, b) { return self.oddsSorter(a, b); },
                headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false, resizable: false,
                formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-odds"
            },
            {
                title: "Best Books", field: "Player Best Odds Books", widthGrow: 0,
                minWidth: 80,
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
