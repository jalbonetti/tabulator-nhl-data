// tables/nhlMatchups.js - NHL Matchups Table
// Pulls from: HockeyMatchupsGame, HockeyMatchupsGoalie, HockeyMatchupsSkater
// Expandable rows with 4 stacked subtables (goalie/skater for each team)
// Blue theme (#1e40af). Width managed to match subtable content.
// Desktop: always reserves scrollbar space. Mobile: subtables scroll independently.

import { BaseTable } from './baseTable.js';
import { isMobile, isTablet } from '../shared/config.js';
import { API_CONFIG } from '../shared/config.js';

// Subtable layout constants — shared between goalie and skater tables
const STAT_COL_WIDTH = 60;   // Each stat column (desktop)
const STAT_COL_WIDTH_MOBILE = 45;
const NUM_STAT_COLS = 4;     // Both goalie (GAA,SA,SV%,Saves) and skater (Pts,G,A,SOG) have 4
const SUBTABLE_PADDING = 24; // Container padding (12px × 2)
const SCROLLBAR_WIDTH = 17;
const SPREAD_TOTAL_WIDTH = 130; // Fixed width for Spread and Total columns

export class NHLMatchupsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyMatchupsGame');
        this.ENDPOINTS = { GAME: 'HockeyMatchupsGame', GOALIE: 'HockeyMatchupsGoalie', SKATER: 'HockeyMatchupsSkater' };
        this.goalieDataCache = new Map();
        this.skaterDataCache = new Map();
        this.subtableDataReady = false;
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
        this.teamAbbrevMap = {};
        Object.entries(this.teamNameMap).forEach(([a, f]) => { this.teamAbbrevMap[f] = a; });
    }

    // =========================================================================
    // INITIALIZE
    // =========================================================================
    initialize() {
        this.injectMobileStyles();
        const isSmallScreen = isMobile() || isTablet();
        const baseConfig = this.getBaseConfig();
        const config = {
            ...baseConfig,
            virtualDom: false,
            pagination: false,
            layoutColumnsOnNewData: false,
            responsiveLayout: false,
            maxHeight: "600px",
            height: "600px",
            placeholder: "Loading matchups...",
            layout: "fitData",
            columns: this.getColumns(isSmallScreen),
            initialSort: [{ column: "Matchup ID", dir: "asc" }],
            rowFormatter: this.createRowFormatter(),
            ajaxError: (error) => { console.error("Error loading NHL matchups:", error); }
        };
        this.table = new Tabulator(this.elementId, config);

        this.table.on("dataLoaded", (data) => {
            console.log(`NHL Matchups dataLoaded: ${data.length} records`);
            this.dataLoaded = true;
            data.forEach(row => { if (row._expanded === undefined) row._expanded = false; });
            this.prefetchSubtableData(data);
            const el = document.querySelector(this.elementId);
            if (el) { const ld = el.querySelector('.loading-indicator'); if (ld) ld.remove(); }
            // Calculate widths after data loads
            setTimeout(() => this.calculateAndApplyWidths(), 100);
        });

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
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0) this.calculateAndApplyWidths();
            }, 250));
        });
    }

    // =========================================================================
    // WIDTH MANAGEMENT
    // =========================================================================
    calculateMatchupContentWidth() {
        if (!this.table) return 300;
        const data = this.table.getData() || [];
        if (data.length === 0) return 300;
        const span = document.createElement('span');
        span.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-family:inherit;font-size:inherit;';
        document.body.appendChild(span);
        let maxW = 0;
        data.forEach(row => { span.textContent = row["Matchup"] || ''; if (span.offsetWidth > maxW) maxW = span.offsetWidth; });
        document.body.removeChild(span);
        return maxW + 18 + 16; // expand icon + cell padding
    }

    getSubtableRequiredWidth() {
        const isSmallScreen = isMobile() || isTablet();
        const statW = isSmallScreen ? STAT_COL_WIDTH_MOBILE : STAT_COL_WIDTH;
        // Player info column: longest goalie string ~350px, skater ~300px
        const playerInfoWidth = isSmallScreen ? 280 : 350;
        return playerInfoWidth + (NUM_STAT_COLS * statW) + SUBTABLE_PADDING + 20;
    }

    calculateAndApplyWidths() {
        if (!this.table) return;
        const tableElement = this.table.element;
        if (!tableElement) return;
        const isSmallScreen = isMobile() || isTablet();

        if (isSmallScreen) {
            // Mobile: clear pixel widths, let CSS handle it
            tableElement.style.removeProperty('width');
            tableElement.style.removeProperty('min-width');
            tableElement.style.removeProperty('max-width');
            const tc = tableElement.closest('.table-container');
            if (tc) { tc.style.width = ''; tc.style.minWidth = ''; tc.style.maxWidth = ''; }
            return;
        }

        try {
            // Force scrollbar reservation FIRST
            const tableHolder = tableElement.querySelector('.tabulator-tableholder');
            if (tableHolder) tableHolder.style.overflowY = 'scroll';

            const matchupWidth = this.calculateMatchupContentWidth();
            const subtableWidth = this.getSubtableRequiredWidth();
            const targetWidth = Math.max(matchupWidth + SPREAD_TOTAL_WIDTH * 2, subtableWidth);
            const totalWidth = targetWidth + SCROLLBAR_WIDTH;

            // Set Matchup column to fill remaining space after Spread+Total
            const matchupColWidth = targetWidth - (SPREAD_TOTAL_WIDTH * 2);
            const matchupCol = this.table.getColumn("Matchup");
            const spreadCol = this.table.getColumn("Spread");
            const totalCol = this.table.getColumn("Total");
            if (matchupCol) matchupCol.setWidth(matchupColWidth);
            if (spreadCol) spreadCol.setWidth(SPREAD_TOTAL_WIDTH);
            if (totalCol) totalCol.setWidth(SPREAD_TOTAL_WIDTH);

            tableElement.style.width = totalWidth + 'px';
            tableElement.style.minWidth = totalWidth + 'px';
            tableElement.style.maxWidth = totalWidth + 'px';
            if (tableHolder) { tableHolder.style.width = totalWidth + 'px'; tableHolder.style.maxWidth = totalWidth + 'px'; }
            const header = tableElement.querySelector('.tabulator-header');
            if (header) header.style.width = totalWidth + 'px';
            const tableContainer = tableElement.closest('.table-container');
            if (tableContainer) { tableContainer.style.width = 'fit-content'; tableContainer.style.minWidth = 'auto'; tableContainer.style.maxWidth = 'none'; }

            console.log(`NHL Matchups: width=${totalWidth}px (matchup=${matchupColWidth}, spread/total=${SPREAD_TOTAL_WIDTH}, scrollbar=${SCROLLBAR_WIDTH})`);
        } catch (error) { console.error('NHL Matchups calculateAndApplyWidths error:', error); }
    }

    forceRecalculateWidths() { this.calculateAndApplyWidths(); }
    expandNameColumnToFill() { this.calculateAndApplyWidths(); }
    debounce(func, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), wait); }; }

    // =========================================================================
    // DATA FETCHING
    // =========================================================================
    async fetchFromEndpoint(endpoint) {
        const url = `${API_CONFIG.baseURL}${endpoint}`;
        try {
            const r = await fetch(url, { method: "GET", headers: API_CONFIG.headers });
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            return await r.json();
        } catch (e) { console.error(`Error fetching ${endpoint}:`, e); return null; }
    }

    async prefetchSubtableData(mainData) {
        console.log(`NHL Matchups: prefetching subtable data for ${mainData.length} matchups`);
        try {
            const [gd, sd] = await Promise.all([
                this.fetchFromEndpoint(this.ENDPOINTS.GOALIE),
                this.fetchFromEndpoint(this.ENDPOINTS.SKATER)
            ]);
            console.log(`NHL Matchups: Fetched goalie=${gd ? gd.length : 0}, skater=${sd ? sd.length : 0}`);
            if (gd) gd.forEach(r => { const m = String(r["Matchup ID"]); if (!this.goalieDataCache.has(m)) this.goalieDataCache.set(m, []); this.goalieDataCache.get(m).push(r); });
            if (sd) sd.forEach(r => { const m = String(r["Matchup ID"]); if (!this.skaterDataCache.has(m)) this.skaterDataCache.set(m, []); this.skaterDataCache.get(m).push(r); });
            this.subtableDataReady = true;
            console.log(`NHL Matchups: Cached goalies for ${this.goalieDataCache.size}, skaters for ${this.skaterDataCache.size} matchups`);
            if (this.table) this.restoreExpandedSubtables();
        } catch (e) { console.error("Error prefetching subtable data:", e); }
    }

    restoreExpandedSubtables() {
        if (!this.table || !this.subtableDataReady) return;
        this.table.getRows().forEach(row => {
            const data = row.getData();
            if (data._expanded) {
                const el = row.getElement();
                if (!el) return;
                const hasReal = el.querySelector('.subrow-container:not(.subrow-loading)');
                if (!hasReal) {
                    const loading = el.querySelector('.subrow-loading');
                    if (loading) loading.remove();
                    this.createAndAppendSubtable(el, data);
                }
            }
        });
    }

    // =========================================================================
    // MATCHUP PARSING
    // =========================================================================
    parseMatchup(s) {
        if (!s) return { away: null, home: null };
        const p = s.split('@');
        if (p.length !== 2) return { away: null, home: null };
        return { away: p[0].trim(), home: p[1].replace(/,?\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$/i, '').replace(/\s+\d{1,2}:\d{2}.*$/i, '').replace(/\s*\d{1,2}\/\d{1,2}.*$/, '').trim() };
    }
    getTeamAbbrev(name) {
        if (!name) return null;
        if (this.teamAbbrevMap[name]) return this.teamAbbrevMap[name];
        for (const [n, a] of Object.entries(this.teamAbbrevMap)) { if (name.includes(n) || n.includes(name)) return a; }
        return null;
    }
    getTeamFullName(a) { return this.teamNameMap[a] || a; }

    // =========================================================================
    // ROW FORMATTER & EXPANSION
    // =========================================================================
    createRowFormatter() {
        const self = this;
        return (row) => {
            const data = row.getData();
            const el = row.getElement();
            if (data._expanded) {
                el.classList.add('row-expanded');
                const hasReal = el.querySelector('.subrow-container:not(.subrow-loading)');
                if (!hasReal) {
                    if (!self.subtableDataReady) {
                        if (!el.querySelector('.subrow-loading')) {
                            const ld = document.createElement("div");
                            ld.classList.add('subrow-container', 'subrow-loading');
                            ld.style.cssText = 'padding:15px 20px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-top:2px solid #1e40af;text-align:center;color:#666;width:100%;';
                            ld.innerHTML = 'Loading matchup data...';
                            el.appendChild(ld);
                        }
                        return;
                    }
                    const loading = el.querySelector('.subrow-loading');
                    if (loading) loading.remove();
                    self.createAndAppendSubtable(el, data);
                }
            } else {
                const ex = el.querySelector('.subrow-container');
                if (ex) { ex.remove(); el.classList.remove('row-expanded'); }
            }
        };
    }

    createAndAppendSubtable(rowElement, data) {
        if (rowElement.querySelector('.subrow-container:not(.subrow-loading)')) return;
        const loading = rowElement.querySelector('.subrow-loading');
        if (loading) loading.remove();
        const holder = document.createElement("div");
        holder.classList.add('subrow-container');
        holder.style.cssText = 'padding:15px 20px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-top:2px solid #1e40af;margin:0;display:block;width:100%;position:relative;z-index:1;';
        try { this.createSubtableContent(holder, data); }
        catch (e) { console.error("Subtable error:", e); holder.innerHTML = '<div style="padding:10px;color:red;">Error loading details</div>'; }
        rowElement.appendChild(holder);
    }

    // =========================================================================
    // SUBTABLE CONTENT — 4 stacked sections
    // =========================================================================
    createSubtableContent(container, data) {
        const matchupId = String(data["Matchup ID"]);
        const matchupStr = data["Matchup"];
        const { away: awayFull, home: homeFull } = this.parseMatchup(matchupStr);
        const awayAbbr = this.getTeamAbbrev(awayFull);
        const homeAbbr = this.getTeamAbbrev(homeFull);
        const goalieData = this.goalieDataCache.get(matchupId) || [];
        const skaterData = this.skaterDataCache.get(matchupId) || [];
        const b2bAway = data["B2B Away"] === 'Yes' || data["B2BAway"] === 'Yes';
        const b2bHome = data["B2B Home"] === 'Yes' || data["B2BHome"] === 'Yes';
        const awayGoalies = goalieData.filter(g => g["Team"] === awayAbbr);
        const homeGoalies = goalieData.filter(g => g["Team"] === homeAbbr);
        const awaySkaters = skaterData.filter(s => s["Team"] === awayAbbr);
        const homeSkaters = skaterData.filter(s => s["Team"] === homeAbbr);

        const isSmallScreen = isMobile() || isTablet();
        const wrapper = document.createElement('div');
        wrapper.className = 'subtable-scroll-wrapper';
        wrapper.style.cssText = `display:flex;flex-direction:column;gap:${isSmallScreen ? '8px' : '15px'};max-height:${isSmallScreen ? '350px' : '450px'};overflow-y:scroll;overflow-x:${isSmallScreen ? 'auto' : 'hidden'};box-sizing:border-box;${isSmallScreen ? 'max-width:calc(100vw - 40px);-webkit-overflow-scrolling:touch;' : ''}`;

        if (!document.getElementById('nhl-subtable-scrollbar-styles')) {
            const s = document.createElement('style');
            s.id = 'nhl-subtable-scrollbar-styles';
            s.textContent = `.subtable-scroll-wrapper::-webkit-scrollbar{width:8px}.subtable-scroll-wrapper::-webkit-scrollbar-track{background:#f1f1f1;border-radius:4px}.subtable-scroll-wrapper::-webkit-scrollbar-thumb{background:#c1c1c1;border-radius:4px}.subtable-scroll-wrapper::-webkit-scrollbar-thumb:hover{background:#a1a1a1}.subtable-scroll-wrapper{scrollbar-width:thin;scrollbar-color:#c1c1c1 #f1f1f1}`;
            document.head.appendChild(s);
        }

        // 1. Away Goalie  2. Home Skaters  3. Home Goalie  4. Away Skaters
        wrapper.appendChild(this.createGoalieSubtable(awayGoalies, `${awayFull || awayAbbr} (Away) Goalie`));
        wrapper.appendChild(this.createSkaterSubtable(homeSkaters, `${homeFull || homeAbbr} (Home) Lineup${b2bHome ? ' - B2B Game' : ''}`));
        wrapper.appendChild(this.createGoalieSubtable(homeGoalies, `${homeFull || homeAbbr} (Home) Goalie`));
        wrapper.appendChild(this.createSkaterSubtable(awaySkaters, `${awayFull || awayAbbr} (Away) Lineup${b2bAway ? ' - B2B Game' : ''}`));
        container.appendChild(wrapper);
    }

    // =========================================================================
    // GOALIE SUBTABLE — GAA, SA, SV%, Saves
    // =========================================================================
    createGoalieSubtable(goalieData, title) {
        const c = document.createElement('div');
        c.style.cssText = 'background:white;padding:12px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        const t = document.createElement('h4');
        t.textContent = title;
        t.style.cssText = 'margin:0 0 10px 0;color:#1e40af;font-size:13px;font-weight:600;';
        c.appendChild(t);
        if (!goalieData || goalieData.length === 0) {
            const nd = document.createElement('div'); nd.textContent = 'No goalie data available'; nd.style.cssText = 'color:#666;font-size:12px;padding:10px;'; c.appendChild(nd); return c;
        }
        const sm = isMobile() || isTablet();
        const cp = sm ? '2px 4px' : '4px 8px';
        const fs = sm ? '10px' : '12px';
        const sw = (sm ? STAT_COL_WIDTH_MOBILE : STAT_COL_WIDTH) + 'px';
        const tbl = document.createElement('table');
        tbl.style.cssText = `font-size:${fs};border-collapse:collapse;width:100%;`;
        const hd = document.createElement('thead');
        hd.innerHTML = `<tr style="background:#f8f9fa;"><th style="padding:${cp};text-align:left;border-bottom:1px solid #ddd;white-space:nowrap;">Player</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">GAA</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">SA</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">SV%</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">Saves</th></tr>`;
        tbl.appendChild(hd);
        const tb = document.createElement('tbody');
        this.sortByInjuryStatus(goalieData, "Goalie Name").forEach((r, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 1 ? 'background:#fafafa;' : '';
            const gl = parseInt(r["Games"] || '0', 10);
            const info = `${r["Goalie Name"] || '-'} - ${this.fmtSplit(r["Split"])} - ${gl === 1 ? '1 Game' : gl + ' Games'} - ${r["W-L-OTL"] || '-'}`;
            tr.innerHTML = `<td style="padding:${cp};text-align:left;white-space:nowrap;">${info}</td><td style="padding:${cp};text-align:center;">${this.fmtGAA(r["Goals Against"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Shots Against"])}</td><td style="padding:${cp};text-align:center;">${this.fmtSvPct(r["Save %"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Total Saves"])}</td>`;
            tb.appendChild(tr);
        });
        tbl.appendChild(tb); c.appendChild(tbl); return c;
    }

    // =========================================================================
    // SKATER SUBTABLE — Pts, G, A, SOG
    // =========================================================================
    createSkaterSubtable(skaterData, title) {
        const c = document.createElement('div');
        c.style.cssText = 'background:white;padding:12px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        const t = document.createElement('h4');
        t.textContent = title;
        t.style.cssText = 'margin:0 0 10px 0;color:#1e40af;font-size:13px;font-weight:600;';
        c.appendChild(t);
        if (!skaterData || skaterData.length === 0) {
            const nd = document.createElement('div'); nd.textContent = 'No skater data available'; nd.style.cssText = 'color:#666;font-size:12px;padding:10px;'; c.appendChild(nd); return c;
        }
        const sm = isMobile() || isTablet();
        const cp = sm ? '2px 4px' : '4px 8px';
        const fs = sm ? '10px' : '12px';
        const sw = (sm ? STAT_COL_WIDTH_MOBILE : STAT_COL_WIDTH) + 'px';
        const tbl = document.createElement('table');
        tbl.style.cssText = `font-size:${fs};border-collapse:collapse;width:100%;`;
        const hd = document.createElement('thead');
        hd.innerHTML = `<tr style="background:#f8f9fa;"><th style="padding:${cp};text-align:left;border-bottom:1px solid #ddd;white-space:nowrap;">Player</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">Pts</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">G</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">A</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;width:${sw};min-width:${sw};">SOG</th></tr>`;
        tbl.appendChild(hd);
        const tb = document.createElement('tbody');
        this.sortByInjuryStatus(skaterData, "Skater Name").forEach((r, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 1 ? 'background:#fafafa;' : '';
            const gl = parseInt(r["Games"] || '0', 10);
            const info = `${r["Skater Name"] || '-'} - ${this.fmtSplit(r["Split"])} - ${gl === 1 ? '1 Game' : gl + ' Games'} - ${this.fmt1(r["TOI"])} min`;
            tr.innerHTML = `<td style="padding:${cp};text-align:left;white-space:nowrap;">${info}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Points"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Goals"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Assists"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["SOG"])}</td>`;
            tb.appendChild(tr);
        });
        tbl.appendChild(tb); c.appendChild(tbl); return c;
    }

    // =========================================================================
    // FORMATTERS
    // =========================================================================
    getInjuryPriority(name) {
        if (!name) return 0;
        const u = name.toUpperCase();
        if (u.includes('(LTIR)')) return 4;
        if (u.includes('(IR)')) return 3;
        if (u.includes('(OUT)')) return 2;
        if (u.includes('(DTD)')) return 1;
        return 0;
    }
    sortByInjuryStatus(data, nameField) {
        return [...data].sort((a, b) => {
            const ap = this.getInjuryPriority(a[nameField]), bp = this.getInjuryPriority(b[nameField]);
            if (ap !== bp) return ap - bp;
            return (a[nameField] || '').localeCompare(b[nameField] || '');
        });
    }
    fmt1(v) { if (v == null || v === '' || v === '-') return '-'; const n = parseFloat(v); return isNaN(n) ? String(v) : n.toFixed(1); }
    fmtGAA(v) { if (v == null || v === '' || v === '-') return '-'; const n = parseFloat(v); return isNaN(n) ? String(v) : n.toFixed(2); }
    fmtSvPct(v) { if (v == null || v === '' || v === '-') return '-'; const n = parseFloat(v); if (isNaN(n)) return String(v); if (n > 1) return '.' + (n / 100).toFixed(3).substring(2); return '.' + n.toFixed(3).substring(2); }
    fmtSplit(v) { if (!v) return '-'; if (v === 'Full Season') return 'Season'; if (v === 'Last 30 Days') return 'L30 Days'; return v; }
    fmtTotal(v) { if (v == null || v === '' || v === '-') return '-'; const s = String(v); if (s.includes('O/U')) { const m = s.match(/O\/U\s*([\d.]+)/); if (m) { const n = parseFloat(m[1]); if (!isNaN(n)) return 'O/U ' + n.toFixed(1); } return s; } const n = parseFloat(s); return isNaN(n) ? s : n.toFixed(1); }

    // =========================================================================
    // MATCHUP FORMATTER (with expand icon)
    // =========================================================================
    createMatchupFormatter() {
        return (cell) => {
            const v = cell.getValue();
            if (!v) return '-';
            const d = cell.getRow().getData();
            const c = document.createElement('div');
            c.style.cssText = 'display:flex;align-items:center;cursor:pointer;';
            const i = document.createElement('span');
            i.className = 'expand-icon';
            i.style.cssText = 'margin-right:6px;font-size:10px;transition:transform 0.2s;color:#1e40af;display:inline-flex;width:12px;';
            i.innerHTML = d._expanded ? '&#9660;' : '&#9654;';
            const t = document.createElement('span');
            t.textContent = v;
            c.appendChild(i); c.appendChild(t);
            return c;
        };
    }

    // =========================================================================
    // COLUMNS
    // =========================================================================
    getColumns(isSmallScreen = false) {
        return [
            { title: "Matchup ID", field: "Matchup ID", visible: false, sorter: "number" },
            { title: "Matchup", field: "Matchup", widthGrow: 0, minWidth: isSmallScreen ? 200 : 350, sorter: "string", headerFilter: true, resizable: false, hozAlign: "left", formatter: this.createMatchupFormatter() },
            { title: "Spread", field: "Spread", widthGrow: 0, width: isSmallScreen ? 100 : SPREAD_TOTAL_WIDTH, sorter: "string", resizable: false, hozAlign: "center" },
            { title: "Total", field: "Total", widthGrow: 0, width: isSmallScreen ? 80 : SPREAD_TOTAL_WIDTH, sorter: "string", resizable: false, hozAlign: "center", formatter: (cell) => this.fmtTotal(cell.getValue()) }
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
            @media screen and (min-width: 1025px) {
                #table0-container .tabulator .tabulator-tableholder {
                    overflow-y: scroll !important;
                }
            }
            @media screen and (max-width: 1024px) {
                #table0-container { width:100%!important; max-width:100vw!important; overflow-x:hidden!important; }
                #table0-container .tabulator { width:100%!important; max-width:100%!important; min-width:0!important; }
                #table0-container .tabulator-tableholder { overflow-x:auto!important; -webkit-overflow-scrolling:touch!important; }
                #table0-container .tabulator-row { overflow:visible!important; }
                #table0-container .subrow-container { max-width:100vw!important; overflow-x:auto!important; -webkit-overflow-scrolling:touch!important; }
                #table0-container .subtable-scroll-wrapper { overflow-x:auto!important; max-width:calc(100vw - 40px)!important; -webkit-overflow-scrolling:touch!important; }
                #table0-container .subtable-scroll-wrapper table { width:auto!important; }
            }
        `;
        document.head.appendChild(style);
    }
}
