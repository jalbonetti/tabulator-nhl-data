// tables/nhlGameOdds.js - NHL Game Odds Table
// Matches NBA basketGameOdds.js pattern exactly for width management
// CRITICAL: renderHorizontal must be "basic" for fitData layout compatibility
// NHL-specific: team abbreviations

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { createBankrollInput, bankrollFilterFunction, getBankrollValue } from '../components/bankrollInput.js';
import { isMobile, isTablet } from '../shared/config.js';

// Minimum width for EV% and Kelly% columns
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
            placeholder: "Loading game odds...",
            
            // fitData: columns size to content only (not full width)
            layout: "fitData",
            
            columns: this.getColumns(isSmallScreen),
            // Default sort by EV % descending
            initialSort: [
                {column: "EV %", dir: "desc"}
            ],
            dataLoaded: (data) => {
                console.log(`NHL Game Odds loaded ${data.length} records`);
                this.dataLoaded = true;
                
                if (data.length > 0) {
                    console.log('DEBUG - NHL Game Odds First row sample:', {
                        'Game Matchup': data[0]["Game Matchup"],
                        'Game Prop Type': data[0]["Game Prop Type"],
                        'Game Label': data[0]["Game Label"],
                        'EV %': data[0]["EV %"],
                        'Quarter Kelly %': data[0]["Quarter Kelly %"]
                    });
                }
                
                // Remove loading indicator
                const element = document.querySelector(this.elementId);
                if (element) {
                    const loadingDiv = element.querySelector('.loading-indicator');
                    if (loadingDiv) {
                        loadingDiv.remove();
                    }
                }
            },
            ajaxError: (error) => {
                console.error("Error loading NHL game odds:", error);
            }
        };

        this.table = new Tabulator(this.elementId, config);
        
        this.table.on("tableBuilt", () => {
            console.log("NHL Game Odds table built");
            
            // Desktop-specific width calculations
            if (!isMobile() && !isTablet()) {
                setTimeout(() => {
                    const data = this.table ? this.table.getData() : [];
                    if (data.length > 0) {
                        this.scanDataForMaxWidths(data);
                        this.equalizeClusteredColumns();
                        this.calculateAndApplyWidths();
                    }
                }, 100);
            }
        });
        
        this.table.on("renderComplete", () => {
            // Recalculate widths after render (handles tab switching) - desktop only
            if (!isMobile() && !isTablet()) {
                setTimeout(() => {
                    this.calculateAndApplyWidths();
                }, 100);
            }
        });
        
        // Handle window resize - recalculate widths (desktop only)
        window.addEventListener('resize', this.debounce(() => {
            if (this.table && this.table.getDataCount() > 0 && !isMobile() && !isTablet()) {
                this.calculateAndApplyWidths();
            }
        }, 250));
    }

    // Debounce helper
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Force recalculation of column widths - called by TabManager on tab switch
    forceRecalculateWidths() {
        if (!this.table) return;
        
        const data = this.table ? this.table.getData() : [];
        if (data.length > 0) {
            this.scanDataForMaxWidths(data);
            this.equalizeClusteredColumns();
            this.calculateAndApplyWidths();
        }
    }

    // Scan ALL data to find max widths needed for text columns
    // Matches NBA basketGameOdds.js: skip entirely on mobile/tablet
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
                    // For odds fields, format with +/- prefix for measurement
                    if (field.includes('Odds') && field !== 'Game Best Odds Books') {
                        const num = parseInt(value, 10);
                        if (!isNaN(num)) {
                            displayValue = num > 0 ? `+${num}` : `${num}`;
                        }
                    }
                    // For EV% and Kelly%, format as percentage for measurement
                    if (field === 'EV %' || field === 'Quarter Kelly %') {
                        const num = parseFloat(value);
                        if (!isNaN(num)) {
                            const pctDisplay = (num * 100).toFixed(1) + '%';
                            const moneyDisplay = '$99999.99';
                            displayValue = pctDisplay.length > moneyDisplay.length ? pctDisplay : moneyDisplay;
                        }
                    }
                    // For Link, measure the display text "Bet" not the URL
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
        
        // Ensure minimum width for longest possible NHL matchup
        // "Vegas Golden Knights @ Tampa Bay Lightning" is among the longest
        const longestMatchup = "Vegas Golden Knights @ Tampa Bay Lightning";
        const longestMatchupWidth = ctx.measureText(longestMatchup).width;
        if (longestMatchupWidth > maxWidths["Game Matchup"]) {
            maxWidths["Game Matchup"] = longestMatchupWidth;
            console.log(`NHL Game Odds: Using minimum matchup width for "${longestMatchup}": ${Math.ceil(longestMatchupWidth)}px`);
        }
        
        const CELL_PADDING = 16;
        const BUFFER = 10;
        
        Object.keys(maxWidths).forEach(field => {
            if (maxWidths[field] > 0) {
                const column = this.table.getColumn(field);
                if (column) {
                    const requiredWidth = maxWidths[field] + CELL_PADDING + BUFFER;
                    const currentWidth = column.getWidth();
                    
                    if (requiredWidth > currentWidth) {
                        column.setWidth(Math.ceil(requiredWidth));
                        console.log(`NHL Game Odds Expanded ${field} from ${currentWidth}px to ${Math.ceil(requiredWidth)}px`);
                    }
                }
            }
        });
        
        console.log('NHL Game Odds Max width scan complete');
    }

    // Custom sorter for odds with +/- prefix
    oddsSorter(a, b, aRow, bRow, column, dir, sorterParams) {
        const getOddsNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            const str = String(val).trim();
            if (str.startsWith('+')) {
                const parsed = parseInt(str.substring(1), 10);
                return isNaN(parsed) ? -99999 : parsed;
            } else if (str.startsWith('-')) {
                const parsed = parseInt(str, 10);
                return isNaN(parsed) ? -99999 : parsed;
            }
            const num = parseInt(str, 10);
            return isNaN(num) ? -99999 : num;
        };
        return getOddsNum(a) - getOddsNum(b);
    }

    // Custom sorter for percentage values (stored as decimals)
    percentSorter(a, b, aRow, bRow, column, dir, sorterParams) {
        const getNum = (val) => {
            if (val === null || val === undefined || val === '' || val === '-') return -99999;
            const num = parseFloat(val);
            return isNaN(num) ? -99999 : num;
        };
        return getNum(a) - getNum(b);
    }

    // Equalize column widths for clustered columns (odds columns and EV/Kelly columns)
    equalizeClusteredColumns() {
        if (!this.table) return;
        
        // Skip on mobile/tablet
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
            const column = this.table.getColumn(field);
            if (column) {
                const dataWidth = column.getWidth();
                if (dataWidth > maxOddsWidth) {
                    maxOddsWidth = dataWidth;
                }
                
                const headerTitle = column.getDefinition().title;
                if (headerTitle) {
                    const headerTextWidth = ctx.measureText(headerTitle).width;
                    const headerRequiredWidth = headerTextWidth + CELL_PADDING + SORT_ICON_WIDTH;
                    if (headerRequiredWidth > maxOddsWidth) {
                        maxOddsWidth = headerRequiredWidth;
                    }
                }
            }
        });
        
        if (maxOddsWidth > 0) {
            oddsCluster.forEach(field => {
                const column = this.table.getColumn(field);
                if (column) {
                    column.setWidth(Math.ceil(maxOddsWidth));
                }
            });
            console.log(`NHL Game Odds: Equalized odds columns to ${Math.ceil(maxOddsWidth)}px`);
        }
        
        // Group 2: EV and Kelly columns
        const evKellyCluster = ['EV %', 'Quarter Kelly %'];
        let maxEvKellyWidth = EV_KELLY_COLUMN_MIN_WIDTH;
        
        evKellyCluster.forEach(field => {
            const column = this.table.getColumn(field);
            if (column) {
                const dataWidth = column.getWidth();
                if (dataWidth > maxEvKellyWidth) {
                    maxEvKellyWidth = dataWidth;
                }
                
                const headerTitle = column.getDefinition().title;
                if (headerTitle) {
                    const headerTextWidth = ctx.measureText(headerTitle).width;
                    const headerRequiredWidth = headerTextWidth + CELL_PADDING + SORT_ICON_WIDTH;
                    if (headerRequiredWidth > maxEvKellyWidth) {
                        maxEvKellyWidth = headerRequiredWidth;
                    }
                }
            }
        });
        
        if (maxEvKellyWidth > 0) {
            evKellyCluster.forEach(field => {
                const column = this.table.getColumn(field);
                if (column) {
                    column.setWidth(Math.ceil(maxEvKellyWidth));
                }
            });
            console.log(`NHL Game Odds: Equalized EV/Kelly columns to ${Math.ceil(maxEvKellyWidth)}px`);
        }
    }

    // Calculate and apply table width based on actual column widths
    calculateAndApplyWidths() {
        if (!this.table) return;
        
        // Skip on mobile/tablet
        if (isMobile() || isTablet()) return;
        
        try {
            const columns = this.table.getColumns();
            let totalColumnWidth = 0;
            
            columns.forEach(col => {
                if (col.isVisible()) {
                    totalColumnWidth += col.getWidth();
                }
            });
            
            const tableElement = this.table.element;
            const tableHolder = tableElement.querySelector('.tabulator-tableholder');
            
            // Add scrollbar width buffer for desktop
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
            
            console.log(`NHL Game Odds: Set table width to ${totalWidthWithScrollbar}px (columns: ${totalColumnWidth}px + scrollbar: ${SCROLLBAR_WIDTH}px)`);
            
        } catch (error) {
            console.error('Error in NHL Game Odds calculateAndApplyWidths:', error);
        }
    }

    getColumns(isSmallScreen = false) {
        const self = this;
        
        // Odds formatter - handles +/- prefixes for display
        const oddsFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseInt(value, 10);
            if (isNaN(num)) return '-';
            return num > 0 ? `+${num}` : `${num}`;
        };

        // Line formatter - always show 1 decimal place, but empty if null
        const lineFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '';
            const num = parseFloat(value);
            if (isNaN(num)) return '';
            return num.toFixed(1);
        };

        // Matchup formatter - abbreviates team names on mobile/tablet only
        const matchupFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            
            // On mobile/tablet, abbreviate team names
            if (isSmallScreen) {
                return self.abbreviateMatchup(value);
            }
            
            // On desktop, show full names
            return value;
        };

        // EV % formatter - converts decimal to percentage
        const evFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '' || value === '-') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            return (num * 100).toFixed(1) + '%';
        };

        // Quarter Kelly % formatter - converts decimal to percentage OR monetary amount
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

        // Link formatter - renders URL as compact "Bet" hyperlink
        const linkFormatter = (cell) => {
            const value = cell.getValue();
            if (!value || value === '-' || value === '') return '-';
            const link = document.createElement('a');
            link.href = value;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = 'Bet';
            link.style.cssText = 'color: #2563eb; text-decoration: underline; font-weight: 500;';
            return link;
        };

        return [
            {
                title: "Matchup", 
                field: "Game Matchup", 
                frozen: true,
                widthGrow: 0,
                minWidth: isSmallScreen ? 80 : 120,
                sorter: "string",
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "left",
                formatter: matchupFormatter
            },
            {
                title: "Prop", 
                field: "Game Prop Type", 
                widthGrow: 0,
                minWidth: 60,
                sorter: "string", 
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Label", 
                field: "Game Label", 
                widthGrow: 0,
                minWidth: 60,
                sorter: "string", 
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Line", 
                field: "Game Line", 
                widthGrow: 0,
                minWidth: 50,
                sorter: "number", 
                headerFilter: createMinMaxFilter,
                headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false,
                resizable: false,
                hozAlign: "center",
                formatter: lineFormatter
            },
            {
                title: "Book", 
                field: "Game Book", 
                widthGrow: 0,
                minWidth: 60,
                sorter: "string", 
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Book Odds", 
                field: "Game Odds", 
                widthGrow: 0,
                minWidth: 55,
                sorter: function(a, b, aRow, bRow, column, dir, sorterParams) {
                    return self.oddsSorter(a, b, aRow, bRow, column, dir, sorterParams);
                },
                headerFilter: createMinMaxFilter,
                headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false,
                resizable: false,
                formatter: oddsFormatter,
                hozAlign: "center",
                cssClass: "cluster-odds"
            },
            {
                title: "Median Odds", 
                field: "Game Median Odds", 
                widthGrow: 0,
                minWidth: 55,
                sorter: function(a, b, aRow, bRow, column, dir, sorterParams) {
                    return self.oddsSorter(a, b, aRow, bRow, column, dir, sorterParams);
                },
                headerFilter: createMinMaxFilter,
                headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false,
                resizable: false,
                formatter: oddsFormatter,
                hozAlign: "center",
                cssClass: "cluster-odds"
            },
            {
                title: "Best Odds", 
                field: "Game Best Odds", 
                widthGrow: 0,
                minWidth: 55,
                sorter: function(a, b, aRow, bRow, column, dir, sorterParams) {
                    return self.oddsSorter(a, b, aRow, bRow, column, dir, sorterParams);
                },
                headerFilter: createMinMaxFilter,
                headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false,
                resizable: false,
                formatter: oddsFormatter,
                hozAlign: "center",
                cssClass: "cluster-odds"
            },
            {
                title: "Best Books", 
                field: "Game Best Odds Books", 
                widthGrow: 0,
                minWidth: 70,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "EV %", 
                field: "EV %", 
                widthGrow: 0,
                minWidth: EV_KELLY_COLUMN_MIN_WIDTH,
                sorter: function(a, b, aRow, bRow, column, dir, sorterParams) {
                    return self.percentSorter(a, b, aRow, bRow, column, dir, sorterParams);
                },
                resizable: false,
                formatter: evFormatter,
                hozAlign: "center",
                cssClass: "cluster-ev-kelly"
            },
            {
                title: "Bet Size", 
                field: "Quarter Kelly %", 
                widthGrow: 0,
                minWidth: EV_KELLY_COLUMN_MIN_WIDTH,
                sorter: function(a, b, aRow, bRow, column, dir, sorterParams) {
                    return self.percentSorter(a, b, aRow, bRow, column, dir, sorterParams);
                },
                headerFilter: createBankrollInput,
                headerFilterFunc: bankrollFilterFunction,
                headerFilterLiveFilter: false,
                headerFilterParams: {
                    bankrollKey: 'NHL Game Quarter Kelly %'
                },
                resizable: false,
                formatter: kellyFormatter,
                hozAlign: "center",
                cssClass: "cluster-ev-kelly"
            },
            {
                title: "Link", 
                field: "Link", 
                width: 50,
                widthGrow: 0,
                minWidth: 40,
                maxWidth: 50,
                sorter: "string",
                resizable: false,
                hozAlign: "center",
                formatter: linkFormatter,
                headerSort: false
            }
        ];
    }
}
