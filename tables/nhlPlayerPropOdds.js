// tables/nhlPlayerPropOdds.js - NHL Player Prop Odds Table
// Matches NBA basketPlayerPropOdds.js pattern exactly for width management
// CRITICAL: renderHorizontal must be "basic" for fitData layout compatibility
// NHL-specific: team abbreviations, prop abbreviations, team column

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { createBankrollInput, bankrollFilterFunction, getBankrollValue } from '../components/bankrollInput.js';
import { isMobile, isTablet } from '../shared/config.js';

// Minimum width for Player Name column based on longest realistic name + status indicator
const NAME_COLUMN_MIN_WIDTH = 205;

// Minimum width for EV% and Kelly% columns
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

    // Abbreviate team name
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
            
            // fitData: columns size to content only (not full width)
            layout: "fitData",
            
            columns: this.getColumns(isSmallScreen),
            // Default sort by EV % descending
            initialSort: [
                {column: "EV %", dir: "desc"}
            ],
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
                console.error("Error loading NHL player prop odds:", error);
            }
        };

        this.table = new Tabulator(this.elementId, config);
        
        this.table.on("tableBuilt", () => {
            console.log("NHL Player Prop Odds table built");
            
            // Width calculations for all devices
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    // Desktop-specific: equalize odds columns and calculate container widths
                    if (!isMobile() && !isTablet()) {
                        this.equalizeClusteredColumns();
                        this.calculateAndApplyWidths();
                    }
                    this.ensureNameColumnWidth();
                }
            }, 100);
        });
        
        this.table.on("renderComplete", () => {
            // Recalculate widths after render (handles tab switching) - desktop only
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
        
        // Handle window resize - recalculate widths (desktop only)
        window.addEventListener('resize', this.debounce(() => {
            if (this.table && this.table.getDataCount() > 0 && !isMobile() && !isTablet()) {
                this.calculateAndApplyWidths();
                this.ensureNameColumnWidth();
            }
        }, 250));
    }

    // Ensure Name column has its minimum required width
    ensureNameColumnWidth() {
        if (!this.table) return;
        
        const nameColumn = this.table.getColumn("Player Name");
        if (nameColumn) {
            const currentWidth = nameColumn.getWidth();
            if (currentWidth < NAME_COLUMN_MIN_WIDTH) {
                console.log(`NHL Player Prop Odds: Setting Name column from ${currentWidth}px to ${NAME_COLUMN_MIN_WIDTH}px`);
                nameColumn.setWidth(NAME_COLUMN_MIN_WIDTH);
            }
        }
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
            // Desktop-specific operations
            if (!isMobile() && !isTablet()) {
                this.equalizeClusteredColumns();
                this.calculateAndApplyWidths();
            }
        }
        
        // Always ensure minimum Name width is applied
        this.ensureNameColumnWidth();
    }

    // Scan ALL data to find max widths needed for text columns
    // Matches NBA pattern: Best Books scanned on ALL devices, other columns desktop only
    // Note: Player Name uses fixed NAME_COLUMN_MIN_WIDTH constant instead of calculation
    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        console.log(`NHL Player Prop Odds Scanning ${data.length} rows for max column widths...`);
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Track max widths for text columns (excluding Player Name which uses fixed min)
        // Always include Best Books for all devices
        const maxWidths = {
            "Player Best Odds Books": 0
        };
        
        // Only scan these additional columns on desktop
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
        
        // First measure header widths (use header font weight)
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const HEADER_PADDING = 16;
        const SORT_ICON_WIDTH = 16;
        
        // Map field names to their display titles for header measurement
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
        
        // Now measure data widths (use data font weight)
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        
        data.forEach(row => {
            Object.keys(maxWidths).forEach(field => {
                const value = row[field];
                if (value !== null && value !== undefined && value !== '') {
                    let displayValue = String(value);
                    // For odds fields, format with +/- prefix for measurement
                    if (field.includes('Odds') && field !== 'Player Best Odds Books') {
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
                    // For Prop Type, use abbreviated version for measurement
                    if (field === 'Player Prop Type') {
                        displayValue = this.abbreviateProp(value);
                    }
                    // For Matchup, always use abbreviated version for measurement
                    if (field === 'Player Matchup') {
                        displayValue = this.abbreviateMatchup(value);
                    }
                    // For Team, use abbreviated version
                    if (field === 'Player Team') {
                        displayValue = this.abbreviateTeam(value);
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
        
        // Ensure minimum width for abbreviated matchups
        const longestAbbrevMatchup = "VGK @ TBL";
        const longestMatchupWidth = ctx.measureText(longestAbbrevMatchup).width;
        if (maxWidths["Player Matchup"] !== undefined && longestMatchupWidth > maxWidths["Player Matchup"]) {
            maxWidths["Player Matchup"] = longestMatchupWidth;
        }
        
        const CELL_PADDING = 16;
        const BUFFER = 8;
        
        // Apply widths to scanned columns
        Object.keys(maxWidths).forEach(field => {
            if (maxWidths[field] > 0) {
                const column = this.table.getColumn(field);
                if (column) {
                    const requiredWidth = maxWidths[field] + CELL_PADDING + BUFFER;
                    const currentWidth = column.getWidth();
                    // Only expand if needed (don't shrink)
                    if (requiredWidth > currentWidth) {
                        column.setWidth(Math.ceil(requiredWidth));
                        console.log(`NHL Player Prop Odds Set ${field} to ${Math.ceil(requiredWidth)}px (was ${currentWidth}px)`);
                    }
                }
            }
        });
        
        // Ensure Name column has fixed minimum width
        this.ensureNameColumnWidth();
        
        console.log('NHL Player Prop Odds Max width scan complete');
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
        
        // Measure header widths to include in calculation
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        
        const CELL_PADDING = 16;
        const SORT_ICON_WIDTH = 20;
        
        // Group 1: Odds columns
        const oddsCluster = ['Player Prop Odds', 'Player Median Odds', 'Player Best Odds'];
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
            console.log(`NHL Player Prop Odds: Equalized odds columns to ${Math.ceil(maxOddsWidth)}px`);
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
            console.log(`NHL Player Prop Odds: Equalized EV/Kelly columns to ${Math.ceil(maxEvKellyWidth)}px`);
        }
    }

    // Calculate and apply table width based on actual column widths
    calculateAndApplyWidths() {
        if (!this.table) return;
        
        const tableElement = this.table.element;
        if (!tableElement) return;
        
        const mobile = isMobile();
        const tablet = isTablet();
        const isSmallScreen = mobile || tablet;
        
        // MOBILE/TABLET: Clear container widths but preserve Name column minimum
        if (isSmallScreen) {
            tableElement.style.width = '';
            tableElement.style.minWidth = '';
            tableElement.style.maxWidth = '';
            
            const tableContainer = tableElement.closest('.table-container');
            if (tableContainer) {
                tableContainer.style.width = '';
                tableContainer.style.minWidth = '';
                tableContainer.style.maxWidth = '';
            }
            
            // Ensure Name column maintains minimum width on mobile
            this.ensureNameColumnWidth();
            
            console.log(`NHL Player Prop Odds Mobile/tablet mode: container widths cleared, Name column preserved`);
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
            
            console.log(`NHL Player Prop Odds: Set table width to ${totalWidthWithScrollbar}px (columns: ${totalColumnWidth}px + scrollbar: ${SCROLLBAR_WIDTH}px)`);
            
        } catch (error) {
            console.error('Error in NHL Player Prop Odds calculateAndApplyWidths:', error);
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

        // Line formatter - always show 1 decimal place
        const lineFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            const num = parseFloat(value);
            if (isNaN(num)) return '-';
            return num.toFixed(1);
        };

        // Matchup formatter - always abbreviates team names
        const matchupFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateMatchup(value);
        };

        // Team formatter - abbreviates team names
        const teamFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateTeam(value);
        };

        // Prop formatter - abbreviates prop types
        const propFormatter = (cell) => {
            const value = cell.getValue();
            if (value === null || value === undefined || value === '') return '-';
            return self.abbreviateProp(value);
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
            
            const bankroll = getBankrollValue('NHL Quarter Kelly %');
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
                title: "Name", 
                field: "Player Name", 
                frozen: true,
                widthGrow: 0,
                minWidth: NAME_COLUMN_MIN_WIDTH,
                sorter: "string", 
                headerFilter: true,
                resizable: false,
                hozAlign: "left"
            },
            {
                title: "Matchup", 
                field: "Player Matchup", 
                widthGrow: 0,
                minWidth: 70,
                sorter: "string",
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "center",
                formatter: matchupFormatter
            },
            {
                title: "Team", 
                field: "Player Team", 
                widthGrow: 0,
                minWidth: 45,
                sorter: "string", 
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "center",
                formatter: teamFormatter
            },
            {
                title: "Prop", 
                field: "Player Prop Type", 
                widthGrow: 0,
                minWidth: 55,
                sorter: "string", 
                headerFilter: createCustomMultiSelect,
                headerFilterParams: {
                    valuesLookup: function(cell) {
                        const values = cell.getTable().getData().map(row => row["Player Prop Type"]);
                        return [...new Set(values)].filter(v => v != null && v !== '').sort();
                    }
                },
                resizable: false,
                hozAlign: "center",
                formatter: propFormatter
            },
            {
                title: "Label", 
                field: "Player Over/Under", 
                widthGrow: 0,
                minWidth: 50,
                sorter: "string", 
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Line", 
                field: "Player Prop Line", 
                widthGrow: 0,
                minWidth: 50,
                sorter: "number", 
                headerFilter: createMinMaxFilter,
                headerFilterFunc: minMaxFilterFunction,
                headerFilterLiveFilter: false,
                resizable: false,
                formatter: lineFormatter,
                hozAlign: "center"
            },
            {
                title: "Book", 
                field: "Player Book", 
                widthGrow: 0,
                minWidth: 60,
                sorter: "string", 
                headerFilter: createCustomMultiSelect,
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Book Odds", 
                field: "Player Prop Odds", 
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
                field: "Player Median Odds", 
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
                field: "Player Best Odds", 
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
                field: "Player Best Odds Books", 
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
                headerFilterParams: { bankrollKey: 'NHL Quarter Kelly %' },
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
