// tables/nhlMatchups.js - NHL Matchups Table
// Pulls from three Supabase tables: HockeyMatchupsGame, HockeyMatchupsGoalie, HockeyMatchupsSkater
// Features expandable rows with 4 stacked subtables:
//   1. Away Team Goalie
//   2. Home Team Skaters (lineup)
//   3. Home Team Goalie
//   4. Away Team Skaters (lineup)
//
// Blue theme (#1e40af). No rank coloring. No lineup confirmations.
// B2B flags present. All stats are averages displayed with 1 decimal.

import { BaseTable } from './baseTable.js';
import { isMobile, isTablet } from '../shared/config.js';
import { API_CONFIG } from '../shared/config.js';

export class NHLMatchupsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyMatchupsGame');

        this.ENDPOINTS = {
            GAME: 'HockeyMatchupsGame',
            GOALIE: 'HockeyMatchupsGoalie',
            SKATER: 'HockeyMatchupsSkater'
        };

        this.goalieDataCache = new Map();
        this.skaterDataCache = new Map();
        this.subtableDataReady = false;

        // Abbreviation -> full name
        this.teamNameMap = {
            'ANA': 'Anaheim Ducks', 'BOS': 'Boston Bruins', 'BUF': 'Buffalo Sabres',
            'CGY': 'Calgary Flames', 'CAR': 'Carolina Hurricanes', 'CHI': 'Chicago Blackhawks',
            'COL': 'Colorado Avalanche', 'CBJ': 'Columbus Blue Jackets', 'DAL': 'Dallas Stars',
            'DET': 'Detroit Red Wings', 'EDM': 'Edmonton Oilers', 'FLA': 'Florida Panthers',
            'LAK': 'Los Angeles Kings', 'MIN': 'Minnesota Wild', 'MTL': 'Montreal Canadiens',
            'NSH': 'Nashville Predators', 'NJD': 'New Jersey Devils', 'NYI': 'New York Islanders',
            'NYR': 'New York Rangers', 'OTT': 'Ottawa Senators', 'PHI': 'Philadelphia Flyers',
            'PIT': 'Pittsburgh Penguins', 'SJS': 'San Jose Sharks', 'SEA': 'Seattle Kraken',
            'STL': 'St. Louis Blues', 'TBL': 'Tampa Bay Lightning', 'TOR': 'Toronto Maple Leafs',
            'UTA': 'Utah Hockey Club', 'VAN': 'Vancouver Canucks', 'VGK': 'Vegas Golden Knights',
            'WSH': 'Washington Capitals', 'WPG': 'Winnipeg Jets', 'ARI': 'Arizona Coyotes',
        };

        // Full name -> abbreviation (reverse map)
        this.teamAbbrevMap = {};
        Object.entries(this.teamNameMap).forEach(([abbrev, fullName]) => {
            this.teamAbbrevMap[fullName] = abbrev;
        });
    }

    initialize() {
        this.injectMobileStyles();
        const isSmallScreen = isMobile() || isTablet();

        const baseConfig = this.getBaseConfig();

        const config = {
            ...baseConfig,
            virtualDom: false, // Required for subtable rendering
            pagination: false,
            layoutColumnsOnNewData: false,
            responsiveLayout: false,
            maxHeight: "600px",
            height: "600px",
            placeholder: "Loading matchups...",
            layout: "fitColumns",
            columns: this.getColumns(isSmallScreen),
            initialSort: [{ column: "Matchup ID", dir: "asc" }],
            rowFormatter: this.createRowFormatter(),
            ajaxError: (error) => { console.error("Error loading NHL matchups:", error); }
        };

        this.table = new Tabulator(this.elementId, config);

        // CRITICAL: Use event listener instead of config callback — 
        // config-level dataLoaded doesn't fire reliably with ajaxRequestFunc
        this.table.on("dataLoaded", (data) => {
            console.log(`NHL Matchups dataLoaded event: ${data.length} records`);
            this.dataLoaded = true;
            data.forEach(row => { if (row._expanded === undefined) row._expanded = false; });
            this.prefetchSubtableData(data);
            const element = document.querySelector(this.elementId);
            if (element) { const ld = element.querySelector('.loading-indicator'); if (ld) ld.remove(); }
        });

        // Row expansion via click on Matchup column
        this.table.on("cellClick", (e, cell) => {
            if (cell.getColumn().getField() !== "Matchup") return;
            const row = cell.getRow();
            const data = row.getData();
            data._expanded = !data._expanded;
            row.update(data);
            setTimeout(() => { row.reformat(); }, 50);
        });

        this.table.on("tableBuilt", () => {
            console.log("NHL Matchups table built");
        });
    }

    // =========================================================================
    // DATA FETCHING
    // =========================================================================

    async fetchFromEndpoint(endpoint) {
        const url = `${API_CONFIG.baseURL}${endpoint}`;
        try {
            const response = await fetch(url, { method: "GET", headers: API_CONFIG.headers });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching ${endpoint}:`, error);
            return null;
        }
    }

    async prefetchSubtableData(mainData) {
        console.log(`NHL Matchups: prefetchSubtableData called with ${mainData.length} rows`);

        try {
            const [goalieData, skaterData] = await Promise.all([
                this.fetchFromEndpoint(this.ENDPOINTS.GOALIE),
                this.fetchFromEndpoint(this.ENDPOINTS.SKATER)
            ]);

            console.log(`NHL Matchups: Fetched goalie=${goalieData ? goalieData.length : 0}, skater=${skaterData ? skaterData.length : 0}`);

            if (goalieData) {
                goalieData.forEach(row => {
                    const mid = String(row["Matchup ID"]);
                    if (!this.goalieDataCache.has(mid)) this.goalieDataCache.set(mid, []);
                    this.goalieDataCache.get(mid).push(row);
                });
            }
            if (skaterData) {
                skaterData.forEach(row => {
                    const mid = String(row["Matchup ID"]);
                    if (!this.skaterDataCache.has(mid)) this.skaterDataCache.set(mid, []);
                    this.skaterDataCache.get(mid).push(row);
                });
            }

            this.subtableDataReady = true;
            console.log(`NHL Matchups: Cached goalie data for ${this.goalieDataCache.size} matchups, skater data for ${this.skaterDataCache.size} matchups`);

            // Restore any rows that were expanded while data was loading
            if (this.table) this.restoreExpandedSubtables();
        } catch (error) {
            console.error("Error prefetching subtable data:", error);
        }
    }

    restoreExpandedSubtables() {
        if (!this.table || !this.subtableDataReady) return;
        console.log('NHL Matchups: restoreExpandedSubtables called');
        this.table.getRows().forEach(row => {
            const data = row.getData();
            if (data._expanded) {
                const el = row.getElement();
                if (!el) return;
                // Check if there's already a REAL subtable (not just a loading placeholder)
                const hasRealSubtable = el.querySelector('.subrow-container:not(.subrow-loading)');
                if (!hasRealSubtable) {
                    // Remove loading placeholder if present
                    const loadingEl = el.querySelector('.subrow-loading');
                    if (loadingEl) loadingEl.remove();
                    this.createAndAppendSubtable(el, data);
                }
            }
        });
    }

    // =========================================================================
    // MATCHUP PARSING
    // =========================================================================

    parseMatchup(matchupStr) {
        if (!matchupStr) return { away: null, home: null };
        const parts = matchupStr.split('@');
        if (parts.length !== 2) return { away: null, home: null };
        const awayTeam = parts[0].trim();
        const homeTeam = parts[1]
            .replace(/,?\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun).*$/i, '')
            .replace(/,?\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}.*$/i, '')
            .replace(/\s+\d{1,2}:\d{2}\s*(AM|PM)?.*$/i, '')
            .replace(/\s*\d{1,2}\/\d{1,2}.*$/, '')
            .trim();
        return { away: awayTeam, home: homeTeam };
    }

    getTeamAbbrev(fullName) {
        if (!fullName) return null;
        if (this.teamAbbrevMap[fullName]) return this.teamAbbrevMap[fullName];
        for (const [name, abbrev] of Object.entries(this.teamAbbrevMap)) {
            if (fullName.includes(name) || name.includes(fullName)) return abbrev;
        }
        return null;
    }

    getTeamFullName(abbrev) {
        return this.teamNameMap[abbrev] || abbrev;
    }

    // =========================================================================
    // ROW FORMATTER & EXPANSION
    // =========================================================================

    createRowFormatter() {
        const self = this;
        return (row) => {
            const data = row.getData();
            const rowElement = row.getElement();

            if (data._expanded) {
                rowElement.classList.add('row-expanded');
                const hasRealSubtable = rowElement.querySelector('.subrow-container:not(.subrow-loading)');
                if (!hasRealSubtable) {
                    if (!self.subtableDataReady) {
                        // Show loading placeholder only if not already showing one
                        if (!rowElement.querySelector('.subrow-loading')) {
                            const loadingEl = document.createElement("div");
                            loadingEl.classList.add('subrow-container', 'subrow-loading');
                            loadingEl.style.cssText = 'padding: 15px 20px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-top: 2px solid #1e40af; text-align: center; color: #666; width: 100%;';
                            loadingEl.innerHTML = 'Loading matchup data...';
                            rowElement.appendChild(loadingEl);
                        }
                        return;
                    }
                    // Data is ready — remove loading placeholder if present and build real subtable
                    const loadingEl = rowElement.querySelector('.subrow-loading');
                    if (loadingEl) loadingEl.remove();
                    self.createAndAppendSubtable(rowElement, data);
                }
            } else {
                const existing = rowElement.querySelector('.subrow-container');
                if (existing) {
                    existing.remove();
                    rowElement.classList.remove('row-expanded');
                }
            }
        };
    }

    createAndAppendSubtable(rowElement, data) {
        if (rowElement.querySelector('.subrow-container:not(.subrow-loading)')) return;
        // Remove loading placeholder if present
        const loading = rowElement.querySelector('.subrow-loading');
        if (loading) loading.remove();

        const holderEl = document.createElement("div");
        holderEl.classList.add('subrow-container');
        holderEl.style.cssText = 'padding: 15px 20px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-top: 2px solid #1e40af; margin: 0; display: block; width: 100%; position: relative; z-index: 1;';

        try {
            this.createSubtableContent(holderEl, data);
        } catch (error) {
            console.error("Error creating matchup subtable:", error);
            holderEl.innerHTML = '<div style="padding: 10px; color: red;">Error loading details</div>';
        }

        rowElement.appendChild(holderEl);
        setTimeout(() => {
            try { rowElement.closest('.tabulator-row') && Tabulator.prototype.findTable(this.elementId)?.[0]?.rowManager?.adjustTableSize(); } catch(e) {}
        }, 50);
    }

    // =========================================================================
    // SUBTABLE CONTENT — 4 stacked sections
    // =========================================================================

    createSubtableContent(container, data) {
        const matchupId = String(data["Matchup ID"]);
        const matchupStr = data["Matchup"];

        const { away: awayTeamFull, home: homeTeamFull } = this.parseMatchup(matchupStr);
        const awayAbbrev = this.getTeamAbbrev(awayTeamFull);
        const homeAbbrev = this.getTeamAbbrev(homeTeamFull);

        const goalieData = this.goalieDataCache.get(matchupId) || [];
        const skaterData = this.skaterDataCache.get(matchupId) || [];

        console.log(`NHL Matchups subtable: ID=${matchupId}, away=${awayAbbrev}, home=${homeAbbrev}, goalies=${goalieData.length}, skaters=${skaterData.length}`);
        if (goalieData.length > 0) console.log('  Goalie teams:', [...new Set(goalieData.map(g => g["Team"]))]);
        if (skaterData.length > 0) console.log('  Skater teams:', [...new Set(skaterData.map(s => s["Team"]))]);

        const b2bAway = data["B2B Away"] === 'Yes' || data["B2BAway"] === 'Yes';
        const b2bHome = data["B2B Home"] === 'Yes' || data["B2BHome"] === 'Yes';

        const awayGoalies = goalieData.filter(g => g["Team"] === awayAbbrev);
        const homeGoalies = goalieData.filter(g => g["Team"] === homeAbbrev);
        const awaySkaters = skaterData.filter(s => s["Team"] === awayAbbrev);
        const homeSkaters = skaterData.filter(s => s["Team"] === homeAbbrev);

        console.log(`  Filtered: awayGoalies=${awayGoalies.length}, homeGoalies=${homeGoalies.length}, awaySkaters=${awaySkaters.length}, homeSkaters=${homeSkaters.length}`);

        const isSmallScreen = isMobile() || isTablet();
        const wrapper = document.createElement('div');
        wrapper.className = 'subtable-scroll-wrapper';
        wrapper.style.cssText = `
            display: flex; flex-direction: column;
            gap: ${isSmallScreen ? '8px' : '15px'};
            max-height: ${isSmallScreen ? '350px' : '450px'};
            overflow-y: scroll; overflow-x: ${isSmallScreen ? 'auto' : 'hidden'};
            box-sizing: border-box;
            ${isSmallScreen ? 'max-width: 100%; -webkit-overflow-scrolling: touch;' : ''}
        `;

        // Inject scrollbar styles once
        if (!document.getElementById('nhl-subtable-scrollbar-styles')) {
            const style = document.createElement('style');
            style.id = 'nhl-subtable-scrollbar-styles';
            style.textContent = `
                .subtable-scroll-wrapper::-webkit-scrollbar { width: 8px; }
                .subtable-scroll-wrapper::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 4px; }
                .subtable-scroll-wrapper::-webkit-scrollbar-thumb { background: #c1c1c1; border-radius: 4px; }
                .subtable-scroll-wrapper::-webkit-scrollbar-thumb:hover { background: #a1a1a1; }
                .subtable-scroll-wrapper { scrollbar-width: thin; scrollbar-color: #c1c1c1 #f1f1f1; }
            `;
            document.head.appendChild(style);
        }

        // 1. Away Goalie
        wrapper.appendChild(this.createGoalieSubtable(
            awayGoalies,
            `${awayTeamFull || awayAbbrev} (Away) Goalie`
        ));

        // 2. Home Skaters
        wrapper.appendChild(this.createSkaterSubtable(
            homeSkaters,
            `${homeTeamFull || homeAbbrev} (Home) Lineup${b2bHome ? ' - B2B Game' : ''}`
        ));

        // 3. Home Goalie
        wrapper.appendChild(this.createGoalieSubtable(
            homeGoalies,
            `${homeTeamFull || homeAbbrev} (Home) Goalie`
        ));

        // 4. Away Skaters
        wrapper.appendChild(this.createSkaterSubtable(
            awaySkaters,
            `${awayTeamFull || awayAbbrev} (Away) Lineup${b2bAway ? ' - B2B Game' : ''}`
        ));

        container.appendChild(wrapper);
    }

    // =========================================================================
    // GOALIE SUBTABLE
    // Stats: Goals Against, Shots Against, Save %, Total Saves, Pts, G, A, SOG
    // Info: Name - Split - Games - Record
    // =========================================================================

    createGoalieSubtable(goalieData, title) {
        const container = document.createElement('div');
        container.style.cssText = 'background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';

        const titleEl = document.createElement('h4');
        titleEl.textContent = title;
        titleEl.style.cssText = 'margin: 0 0 10px 0; color: #1e40af; font-size: 13px; font-weight: 600;';
        container.appendChild(titleEl);

        if (!goalieData || goalieData.length === 0) {
            const noData = document.createElement('div');
            noData.textContent = 'No goalie data available';
            noData.style.cssText = 'color: #666; font-size: 12px; padding: 10px;';
            container.appendChild(noData);
            return container;
        }

        const isSmallScreen = isMobile() || isTablet();
        const cellPadding = isSmallScreen ? '2px 4px' : '4px 8px';
        const fontSize = isSmallScreen ? '10px' : '12px';
        const statMinWidth = isSmallScreen ? '35px' : '50px';

        const table = document.createElement('table');
        table.style.cssText = `font-size: ${fontSize}; border-collapse: collapse; width: auto;`;

        const thead = document.createElement('thead');
        thead.innerHTML = `<tr style="background: #f8f9fa;">
            <th style="padding: ${cellPadding}; text-align: left; border-bottom: 1px solid #ddd; white-space: nowrap;">Player</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">GA</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">SA</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">SV%</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">Saves</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">Pts</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">G</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">A</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">SOG</th>
        </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const sorted = this.sortByInjuryStatus(goalieData, "Goalie Name");

        sorted.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 1 ? 'background: #fafafa;' : '';

            const name = row["Goalie Name"] || '-';
            const split = this.formatSplit(row["Split"]);
            const games = row["Games"] || '0';
            const record = row["W-L-OTL"] || '-';
            const gamesLabel = parseInt(games, 10) === 1 ? '1 Game' : `${games} Games`;
            const playerInfo = `${name} - ${split} - ${gamesLabel} - ${record}`;

            tr.innerHTML = `
                <td style="padding: ${cellPadding}; text-align: left; white-space: nowrap;">${playerInfo}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Goals Against"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Shots Against"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtSavePct(row["Save %"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Total Saves"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Points"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Goals"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Assists"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["SOG"])}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    }

    // =========================================================================
    // SKATER SUBTABLE
    // Stats: Points, Goals, Assists, SOG
    // Info: Name - Split - Games - TOI min
    // =========================================================================

    createSkaterSubtable(skaterData, title) {
        const container = document.createElement('div');
        container.style.cssText = 'background: white; padding: 12px; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';

        const titleEl = document.createElement('h4');
        titleEl.textContent = title;
        titleEl.style.cssText = 'margin: 0 0 10px 0; color: #1e40af; font-size: 13px; font-weight: 600;';
        container.appendChild(titleEl);

        if (!skaterData || skaterData.length === 0) {
            const noData = document.createElement('div');
            noData.textContent = 'No skater data available';
            noData.style.cssText = 'color: #666; font-size: 12px; padding: 10px;';
            container.appendChild(noData);
            return container;
        }

        const isSmallScreen = isMobile() || isTablet();
        const cellPadding = isSmallScreen ? '2px 4px' : '4px 8px';
        const fontSize = isSmallScreen ? '10px' : '12px';
        const statMinWidth = isSmallScreen ? '35px' : '50px';

        const table = document.createElement('table');
        table.style.cssText = `font-size: ${fontSize}; border-collapse: collapse; width: auto;`;

        const thead = document.createElement('thead');
        thead.innerHTML = `<tr style="background: #f8f9fa;">
            <th style="padding: ${cellPadding}; text-align: left; border-bottom: 1px solid #ddd; white-space: nowrap;">Player</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">Pts</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">G</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">A</th>
            <th style="padding: ${cellPadding}; text-align: center; border-bottom: 1px solid #ddd; min-width: ${statMinWidth};">SOG</th>
        </tr>`;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        const sorted = this.sortByInjuryStatus(skaterData, "Skater Name");

        sorted.forEach((row, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 1 ? 'background: #fafafa;' : '';

            const name = row["Skater Name"] || '-';
            const split = this.formatSplit(row["Split"]);
            const games = row["Games"] || '0';
            const toi = this.fmtStat(row["TOI"]);
            const gamesLabel = parseInt(games, 10) === 1 ? '1 Game' : `${games} Games`;
            const playerInfo = `${name} - ${split} - ${gamesLabel} - ${toi} min`;

            tr.innerHTML = `
                <td style="padding: ${cellPadding}; text-align: left; white-space: nowrap;">${playerInfo}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Points"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Goals"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["Assists"])}</td>
                <td style="padding: ${cellPadding}; text-align: center;">${this.fmtStat(row["SOG"])}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        container.appendChild(table);
        return container;
    }

    // =========================================================================
    // INJURY STATUS SORT — parses status from player name
    // Healthy (no tag) = 0, (DTD) = 1, (Out) = 2, (IR) = 3, (LTIR) = 4
    // =========================================================================

    getInjuryPriority(name) {
        if (!name) return 0;
        const upper = name.toUpperCase();
        if (upper.includes('(LTIR)')) return 4;
        if (upper.includes('(IR)')) return 3;
        if (upper.includes('(OUT)')) return 2;
        if (upper.includes('(DTD)')) return 1;
        return 0; // Healthy
    }

    sortByInjuryStatus(data, nameField) {
        return [...data].sort((a, b) => {
            const aPriority = this.getInjuryPriority(a[nameField]);
            const bPriority = this.getInjuryPriority(b[nameField]);
            if (aPriority !== bPriority) return aPriority - bPriority;
            // Within same status, sort alphabetically
            const aName = (a[nameField] || '').toLowerCase();
            const bName = (b[nameField] || '').toLowerCase();
            return aName.localeCompare(bName);
        });
    }

    // =========================================================================
    // FORMATTERS
    // =========================================================================

    fmtStat(value) {
        if (value == null || value === '' || value === '-') return '-';
        const num = parseFloat(value);
        return isNaN(num) ? String(value) : num.toFixed(1);
    }

    fmtSavePct(value) {
        if (value == null || value === '' || value === '-') return '-';
        const num = parseFloat(value);
        if (isNaN(num)) return String(value);
        // If stored as 0.912, show as .912; if stored as 91.2, show as .912
        if (num > 1) return '.' + (num / 100).toFixed(3).substring(2);
        return '.' + num.toFixed(3).substring(2);
    }

    formatSplit(value) {
        if (!value) return '-';
        if (value === 'Full Season') return 'Season';
        if (value === 'Last 30 Days') return 'L30 Days';
        return value;
    }

    formatMatchupTotal(value) {
        if (value == null || value === '' || value === '-') return '-';
        const str = String(value);
        if (str.includes('O/U')) {
            const match = str.match(/O\/U\s*([\d.]+)/);
            if (match) { const n = parseFloat(match[1]); if (!isNaN(n)) return 'O/U ' + n.toFixed(1); }
            return str;
        }
        const num = parseFloat(str);
        return isNaN(num) ? str : num.toFixed(1);
    }

    // =========================================================================
    // MATCHUP COLUMN NAME FORMATTER (with expand icon)
    // =========================================================================

    createMatchupFormatter() {
        return (cell) => {
            const value = cell.getValue();
            if (!value) return '-';
            const data = cell.getRow().getData();
            const expanded = data._expanded || false;
            const container = document.createElement('div');
            container.style.cssText = 'display: flex; align-items: center; cursor: pointer;';
            const icon = document.createElement('span');
            icon.className = 'expand-icon';
            icon.style.cssText = 'margin-right: 6px; font-size: 10px; transition: transform 0.2s; color: #1e40af; display: inline-flex; width: 12px;';
            icon.innerHTML = expanded ? '&#9660;' : '&#9654;';
            const text = document.createElement('span');
            text.textContent = value;
            container.appendChild(icon);
            container.appendChild(text);
            return container;
        };
    }

    // =========================================================================
    // COLUMNS
    // =========================================================================

    getColumns(isSmallScreen = false) {
        return [
            {
                title: "Matchup ID", field: "Matchup ID",
                visible: false, sorter: "number"
            },
            {
                title: "Matchup", field: "Matchup",
                widthGrow: 2,
                sorter: "string",
                headerFilter: true,
                resizable: false,
                hozAlign: "left",
                formatter: this.createMatchupFormatter()
            },
            {
                title: "Spread", field: "Spread",
                widthGrow: 1,
                sorter: "string",
                resizable: false,
                hozAlign: "center"
            },
            {
                title: "Total", field: "Total",
                widthGrow: 1,
                sorter: "string",
                resizable: false,
                hozAlign: "center",
                formatter: (cell) => {
                    const v = cell.getValue();
                    return this.formatMatchupTotal(v);
                }
            }
        ];
    }

    // =========================================================================
    // MOBILE STYLES
    // =========================================================================

    injectMobileStyles() {
        if (document.getElementById('nhl-matchups-mobile-styles')) return;
        const style = document.createElement('style');
        style.id = 'nhl-matchups-mobile-styles';
        style.textContent = `
            @media screen and (max-width: 1024px) {
                #table0-container {
                    width: 100% !important;
                    max-width: 100vw !important;
                    overflow-x: hidden !important;
                }
                #table0-container .tabulator {
                    width: 100% !important;
                    max-width: 100% !important;
                    min-width: 0 !important;
                }
                #table0-container .tabulator-tableholder {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table0-container .tabulator-row { overflow: visible !important; }
                #table0-container .subrow-container { max-width: 100% !important; overflow-x: auto !important; }
                #table0-container .subtable-scroll-wrapper { overflow-x: auto !important; max-width: 100% !important; }
                #table0-container .subtable-scroll-wrapper table { width: auto !important; }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================================
    // WIDTH MANAGEMENT (stubs for TabManager compatibility)
    // =========================================================================

    forceRecalculateWidths() {}
    expandNameColumnToFill() {}
    calculateAndApplyWidths() {}
    debounce(func, wait) {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }
}
