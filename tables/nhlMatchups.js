// tables/nhlMatchups.js - NHL Matchups Table
// Pulls from: HockeyMatchupsGame, HockeyMatchupsGoalie, HockeyMatchupsSkater
// Expandable rows with 4 stacked subtables (goalie/skater for each team)
// Blue theme (#1e40af).
//
// KEY DIFFERENCE FROM NBA: NHL subtables are MUCH smaller (4 stat cols vs 12+).
// The primary rows drive the table width, NOT the subtables.
// Uses fitColumns layout — Matchup gets 50%, Spread 25%, Total 25%.
// Desktop: always reserves vertical scrollbar. Subtables fill container width.

import { BaseTable } from './baseTable.js';
import { isMobile, isTablet } from '../shared/config.js';
import { API_CONFIG } from '../shared/config.js';

// Stat column widths — shared between goalie and skater subtables
const STAT_W = 60;
const STAT_W_MOBILE = 45;

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
        this.injectStyles();
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
            layout: "fitColumns",  // Primary rows drive width naturally
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
        });
    }

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
        console.log(`NHL Matchups: prefetching subtable data`);
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
                if (!el.querySelector('.subrow-container:not(.subrow-loading)')) {
                    const ld = el.querySelector('.subrow-loading');
                    if (ld) ld.remove();
                    this.createAndAppendSubtable(el, data);
                }
            }
        });
    }

    // =========================================================================
    // MATCHUP PARSING & TEAM ABBREVIATION
    // =========================================================================
    parseMatchup(s) {
        if (!s) return { away: null, home: null };
        const p = s.split('@');
        if (p.length !== 2) return { away: null, home: null };
        return {
            away: p[0].trim(),
            home: p[1].replace(/,?\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$/i, '')
                      .replace(/\s+\d{1,2}:\d{2}.*$/i, '').replace(/\s*\d{1,2}\/\d{1,2}.*$/, '').trim()
        };
    }
    getTeamAbbrev(name) {
        if (!name) return null;
        if (this.teamAbbrevMap[name]) return this.teamAbbrevMap[name];
        for (const [n, a] of Object.entries(this.teamAbbrevMap)) { if (name.includes(n) || n.includes(name)) return a; }
        return null;
    }
    getTeamFullName(a) { return this.teamNameMap[a] || a; }

    // Abbreviate team names in a spread string, e.g. "New Jersey Devils -1.5" -> "NJD -1.5"
    abbreviateSpread(spread) {
        if (!spread) return '-';
        let result = spread;
        // Sort by full name length descending to avoid partial matches
        const sorted = Object.entries(this.teamAbbrevMap).sort((a, b) => b[0].length - a[0].length);
        for (const [fullName, abbrev] of sorted) {
            if (result.includes(fullName)) {
                result = result.replace(fullName, abbrev);
                break;
            }
        }
        return result;
    }

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
                if (!el.querySelector('.subrow-container:not(.subrow-loading)')) {
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
        wrapper.style.cssText = `display:flex;flex-direction:column;gap:${isSmallScreen ? '8px' : '15px'};max-height:${isSmallScreen ? '350px' : '450px'};overflow-y:auto;overflow-x:hidden;box-sizing:border-box;`;

        if (!document.getElementById('nhl-subtable-scrollbar-styles')) {
            const s = document.createElement('style');
            s.id = 'nhl-subtable-scrollbar-styles';
            s.textContent = `.subtable-scroll-wrapper::-webkit-scrollbar{width:8px}.subtable-scroll-wrapper::-webkit-scrollbar-track{background:#f1f1f1;border-radius:4px}.subtable-scroll-wrapper::-webkit-scrollbar-thumb{background:#c1c1c1;border-radius:4px}.subtable-scroll-wrapper::-webkit-scrollbar-thumb:hover{background:#a1a1a1}.subtable-scroll-wrapper{scrollbar-width:thin;scrollbar-color:#c1c1c1 #f1f1f1}`;
            document.head.appendChild(s);
        }

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
        const t = document.createElement('h4'); t.textContent = title;
        t.style.cssText = 'margin:0 0 10px 0;color:#1e40af;font-size:13px;font-weight:600;';
        c.appendChild(t);
        if (!goalieData || goalieData.length === 0) {
            const nd = document.createElement('div'); nd.textContent = 'No goalie data available';
            nd.style.cssText = 'color:#666;font-size:12px;padding:10px;'; c.appendChild(nd); return c;
        }
        const sm = isMobile() || isTablet();
        const cp = sm ? '2px 4px' : '4px 8px';
        const fs = sm ? '10px' : '12px';
        const sw = (sm ? STAT_W_MOBILE : STAT_W) + 'px';

        const tbl = document.createElement('table');
        tbl.style.cssText = `font-size:${fs};border-collapse:collapse;width:100%;table-layout:fixed;`;
        const colgroup = document.createElement('colgroup');
        colgroup.innerHTML = `<col style="width:auto;"><col style="width:${sw};"><col style="width:${sw};"><col style="width:${sw};"><col style="width:${sw};">`;
        tbl.appendChild(colgroup);
        const hd = document.createElement('thead');
        hd.innerHTML = `<tr style="background:#f8f9fa;"><th style="padding:${cp};text-align:left;border-bottom:1px solid #ddd;">Player</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">GAA</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">SA</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">SV%</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">Saves</th></tr>`;
        tbl.appendChild(hd);
        const tb = document.createElement('tbody');
        this.sortByInjuryStatus(goalieData, "Goalie Name").forEach((r, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 1 ? 'background:#fafafa;' : '';
            const gl = parseInt(r["Games"] || '0', 10);
            const info = `${r["Goalie Name"] || '-'} - ${this.fmtSplit(r["Split"])} - ${gl === 1 ? '1 Game' : gl + ' Games'} - ${r["W-L-OTL"] || '-'}`;
            tr.innerHTML = `<td style="padding:${cp};text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${info}</td><td style="padding:${cp};text-align:center;">${this.fmtGAA(r["Goals Against"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Shots Against"])}</td><td style="padding:${cp};text-align:center;">${this.fmtSvPct(r["Save %"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Total Saves"])}</td>`;
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
        const t = document.createElement('h4'); t.textContent = title;
        t.style.cssText = 'margin:0 0 10px 0;color:#1e40af;font-size:13px;font-weight:600;';
        c.appendChild(t);
        if (!skaterData || skaterData.length === 0) {
            const nd = document.createElement('div'); nd.textContent = 'No skater data available';
            nd.style.cssText = 'color:#666;font-size:12px;padding:10px;'; c.appendChild(nd); return c;
        }
        const sm = isMobile() || isTablet();
        const cp = sm ? '2px 4px' : '4px 8px';
        const fs = sm ? '10px' : '12px';
        const sw = (sm ? STAT_W_MOBILE : STAT_W) + 'px';

        const tbl = document.createElement('table');
        tbl.style.cssText = `font-size:${fs};border-collapse:collapse;width:100%;table-layout:fixed;`;
        const colgroup = document.createElement('colgroup');
        colgroup.innerHTML = `<col style="width:auto;"><col style="width:${sw};"><col style="width:${sw};"><col style="width:${sw};"><col style="width:${sw};">`;
        tbl.appendChild(colgroup);
        const hd = document.createElement('thead');
        hd.innerHTML = `<tr style="background:#f8f9fa;"><th style="padding:${cp};text-align:left;border-bottom:1px solid #ddd;">Player</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">Pts</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">G</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">A</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd;">SOG</th></tr>`;
        tbl.appendChild(hd);
        const tb = document.createElement('tbody');
        this.sortByInjuryStatus(skaterData, "Skater Name").forEach((r, i) => {
            const tr = document.createElement('tr');
            tr.style.cssText = i % 2 === 1 ? 'background:#fafafa;' : '';
            const gl = parseInt(r["Games"] || '0', 10);
            const info = `${r["Skater Name"] || '-'} - ${this.fmtSplit(r["Split"])} - ${gl === 1 ? '1 Game' : gl + ' Games'} - ${this.fmt1(r["TOI"])} min`;
            tr.innerHTML = `<td style="padding:${cp};text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${info}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Points"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Goals"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["Assists"])}</td><td style="padding:${cp};text-align:center;">${this.fmt1(r["SOG"])}</td>`;
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
        if (u.includes('(LTIR)')) return 4; if (u.includes('(IR)')) return 3;
        if (u.includes('(OUT)')) return 2; if (u.includes('(DTD)')) return 1;
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
    // COLUMNS — fitColumns: Matchup 50%, Spread 25%, Total 25%
    // =========================================================================
    getColumns(isSmallScreen = false) {
        const self = this;
        return [
            { title: "Matchup ID", field: "Matchup ID", visible: false, sorter: "number" },
            { title: "Matchup", field: "Matchup", widthGrow: 2, sorter: "string", headerFilter: true, resizable: false, hozAlign: "left", formatter: this.createMatchupFormatter() },
            { title: "Spread", field: "Spread", widthGrow: 1, sorter: "string", resizable: false, hozAlign: "center",
                formatter: (cell) => self.abbreviateSpread(cell.getValue()) },
            { title: "Total", field: "Total", widthGrow: 1, sorter: "string", resizable: false, hozAlign: "center",
                formatter: (cell) => self.fmtTotal(cell.getValue()) }
        ];
    }

    // =========================================================================
    // STYLES — desktop scrollbar reservation + mobile containment
    // =========================================================================
    injectStyles() {
        if (document.getElementById('nhl-matchups-styles')) return;
        const style = document.createElement('style');
        style.id = 'nhl-matchups-styles';
        style.textContent = `
            /* Desktop: ALWAYS reserve vertical scrollbar space */
            @media screen and (min-width: 1025px) {
                #table0-container .tabulator .tabulator-tableholder {
                    overflow-y: scroll !important;
                }
            }
            /* Mobile: subtables contained, rows visible for expansion */
            @media screen and (max-width: 1024px) {
                #table0-container .tabulator-row { overflow: visible !important; }
                #table0-container .subrow-container {
                    width: 100% !important;
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table0-container .subtable-scroll-wrapper {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================================
    // WIDTH STUBS for TabManager compatibility
    // =========================================================================
    forceRecalculateWidths() {}
    expandNameColumnToFill() {}
    calculateAndApplyWidths() {}
    debounce(func, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), wait); }; }
}
