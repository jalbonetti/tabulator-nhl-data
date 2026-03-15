// tables/nhlPlayerPropClearances.js - NHL Player Prop Clearances Table
// Based on NBA basketPlayerPropClearances.js with NHL-specific changes:
// - Supabase endpoint: HockeyPlayerPropClearances
// - Blue theme (#1e40af) instead of orange (#f97316)
// - NHL prop abbreviations (SOG, PPP, Blk, etc.)
// - Removed: Opponent Prop Rank, Opponent Pace Rank columns (entire Opponent group)
// - Removed: cluster-b equalization (opponent columns)
// - Kept: Expandable rows with Matchup Details, Minutes Data, Best Books subtables
// - Mobile frozen column fix: Does NOT set pixel widths on tabulator element on mobile

import { BaseTable } from './baseTable.js';
import { createCustomMultiSelect } from '../components/customMultiSelect.js';
import { createMinMaxFilter, minMaxFilterFunction } from '../components/minMaxFilter.js';
import { isMobile, isTablet } from '../shared/config.js';

const NAME_COLUMN_MIN_WIDTH = 205;
const LINEUP_COLUMN_MIN_WIDTH = 85;
const SPLIT_COLUMN_MIN_WIDTH = 62;

export class NHLPlayerPropClearancesTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyPlayerPropClearances');
        this._subtableWidthMeasured = false;
        this._measuredSubtableWidth = null;
        this._firstCalcDone = false;

        this.propAbbrevMap = {
            'Goals': 'Goals', 'Assists': 'Asts', 'Points': 'Pts',
            'Shots on Goal': 'SOG', 'Saves': 'Saves', 'Blocked Shots': 'Blk',
            'Hits': 'Hits', 'Power Play Points': 'PPP', 'Goals + Assists': 'G+A',
        };
    }

    _injectClearancesStyles() {
        const styleId = 'nhl-prop-clearances-width-override';
        if (document.querySelector(`#${styleId}`)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @media screen and (min-width: 1025px) {
                #table1-container { width: fit-content !important; max-width: none !important; overflow-x: visible !important; }
                #table1-container .tabulator { width: auto !important; max-width: none !important; }
                #table1-container .tabulator .tabulator-tableholder { overflow-y: auto !important; }
            }
            @media screen and (max-width: 1024px) {
                #table1-container { width: 100% !important; max-width: 100vw !important; overflow-x: hidden !important; }
                #table1-container .tabulator { width: 100% !important; max-width: 100% !important; min-width: 0 !important; }
                #table1-container .tabulator .tabulator-tableholder { overflow-x: auto !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important; }
            }
        `;
        document.head.appendChild(style);
    }

    initialize() {
        this._injectClearancesStyles();
        const isSmallScreen = isMobile() || isTablet();
        const baseConfig = this.getBaseConfig();

        const config = {
            ...baseConfig,
            virtualDom: true, virtualDomBuffer: 500,
            renderVertical: "virtual", renderHorizontal: "basic",
            pagination: false, paginationSize: false,
            layoutColumnsOnNewData: false, responsiveLayout: false,
            maxHeight: "600px", height: "600px",
            placeholder: "Loading prop clearances...",
            layout: "fitData",
            columns: this.getColumns(isSmallScreen),
            initialSort: [
                { column: "Player Name", dir: "asc" },
                { column: "Player Team", dir: "asc" },
                { column: "Player Prop", dir: "asc" }
            ],
            rowFormatter: this.createRowFormatter(),
            dataLoaded: (data) => {
                console.log(`NHL Prop Clearances loaded ${data.length} records`);
                this.dataLoaded = true;
                data.forEach(row => { if (row._expanded === undefined) row._expanded = false; });
                const element = document.querySelector(this.elementId);
                if (element) { const ld = element.querySelector('.loading-indicator'); if (ld) ld.remove(); }
            },
            ajaxError: (error) => { console.error("Error loading NHL prop clearances:", error); }
        };

        this.table = new Tabulator(this.elementId, config);
        this.setupRowExpansion();

        this.table.on("tableBuilt", () => {
            console.log("NHL Prop Clearances table built");
            setTimeout(() => {
                const data = this.table ? this.table.getData() : [];
                if (data.length > 0) {
                    this.scanDataForMaxWidths(data);
                    this.equalizeClusteredColumns();
                    this._doCalculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                    this._firstCalcDone = true;
                }
            }, 200);

            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this.table.getDataCount() > 0 && this._firstCalcDone) {
                    this._doCalculateAndApplyWidths();
                    this.ensureNameColumnWidth();
                }
            }, 250));
        });
    }

    ensureNameColumnWidth() {
        if (!this.table) return;
        const nameCol = this.table.getColumn("Player Name");
        if (nameCol && nameCol.getWidth() < NAME_COLUMN_MIN_WIDTH) nameCol.setWidth(NAME_COLUMN_MIN_WIDTH);
    }

    debounce(func, wait) {
        let timeout;
        return (...args) => { clearTimeout(timeout); timeout = setTimeout(() => func.apply(this, args), wait); };
    }

    setupRowExpansion() {
        this.table.on("cellClick", (e, cell) => {
            if (cell.getColumn().getField() !== "Player Name") return;
            const row = cell.getRow();
            const data = row.getData();
            data._expanded = !data._expanded;
            row.update(data);
        });
    }

    createRowFormatter() {
        const self = this;
        return (row) => {
            const data = row.getData();
            const rowElement = row.getElement();
            if (data._expanded) {
                rowElement.classList.add('row-expanded');
                if (!rowElement.querySelector('.subrow-container')) {
                    setTimeout(() => {
                        if (rowElement.querySelector('.subrow-container')) return;
                        const holderEl = document.createElement("div");
                        holderEl.classList.add('subrow-container');
                        holderEl.style.cssText = 'padding: 15px 20px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-top: 2px solid #1e40af; margin: 0; display: block; width: 100%; position: relative; z-index: 1;';
                        try { self.createSubtableContent(holderEl, data); }
                        catch (error) { holderEl.innerHTML = '<div style="padding: 10px; color: red;">Error loading details</div>'; }
                        rowElement.appendChild(holderEl);
                        setTimeout(() => { row.normalizeHeight(); }, 50);
                    });
                }
            } else {
                const existingSubrow = rowElement.querySelector('.subrow-container');
                if (existingSubrow) {
                    existingSubrow.remove();
                    rowElement.classList.remove('row-expanded');
                    setTimeout(() => { row.normalizeHeight(); }, 50);
                }
            }
        };
    }

    formatMinutes(value) {
        if (value == null || value === '' || value === '-') return '-';
        const num = parseFloat(value);
        return isNaN(num) ? '-' : num.toFixed(1);
    }

    formatMatchupTotal(value) {
        if (value == null || value === '' || value === '-') return '-';
        const str = String(value);
        if (str.includes('O/U')) {
            const match = str.match(/O\/U\s*([\d.]+)/);
            if (match && match[1]) { const num = parseFloat(match[1]); if (!isNaN(num)) return 'O/U ' + num.toFixed(1); }
            return str;
        }
        const num = parseFloat(str);
        return isNaN(num) ? str : num.toFixed(1);
    }

    createSubtableContent(container, data) {
        const matchup = data["Matchup"] || '-';
        const spread = data["Matchup Spread"] || '-';
        const total = this.formatMatchupTotal(data["Matchup Total"]);
        const medianMinutes = this.formatMinutes(data["Player Median Minutes"]);
        const avgMinutes = this.formatMinutes(data["Player Average Minutes"]);

        // Best books with deep links
        const bestOverBookRaw = data["Player Best Over Odds Books"] || '-';
        const bestUnderBookRaw = data["Player Best Under Odds Books"] || '-';
        const bestOverLinkRaw = data["Player Best Over Link"] || '';
        const bestUnderLinkRaw = data["Player Best Under Link"] || '';
        const bestOverBook = this.linkifyBooks(bestOverBookRaw, bestOverLinkRaw);
        const bestUnderBook = this.linkifyBooks(bestUnderBookRaw, bestUnderLinkRaw);

        const isSmallScreen = isMobile() || isTablet();
        const containerGap = isSmallScreen ? '10px' : '15px';
        const cardPadding = isSmallScreen ? '8px' : '12px';
        const fontSize = isSmallScreen ? '11px' : '12px';
        const titleSize = isSmallScreen ? '12px' : '13px';

        container.innerHTML = `
            <div style="display: flex; flex-wrap: nowrap; gap: ${containerGap}; justify-content: flex-start;">
                <div style="background: white; padding: ${cardPadding}; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: inline-block; min-width: fit-content; flex-shrink: 0;">
                    <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: ${titleSize}; font-weight: 600;">Matchup Details</h4>
                    <div style="font-size: ${fontSize}; color: #333;">
                        <div style="margin-bottom: 4px;"><strong>Game:</strong> ${matchup}</div>
                        <div style="margin-bottom: 4px;"><strong>Spread:</strong> ${spread}</div>
                        <div><strong>Total:</strong> ${total}</div>
                    </div>
                </div>
                <div style="background: white; padding: ${cardPadding}; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: inline-block; min-width: fit-content; flex-shrink: 0;">
                    <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: ${titleSize}; font-weight: 600;">Minutes Data</h4>
                    <div style="font-size: ${fontSize}; color: #333;">
                        <div style="margin-bottom: 4px;"><strong>Median:</strong> ${medianMinutes}</div>
                        <div><strong>Average:</strong> ${avgMinutes}</div>
                    </div>
                </div>
                <div style="background: white; padding: ${cardPadding}; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); display: inline-block; min-width: fit-content; flex-shrink: 0;">
                    <h4 style="margin: 0 0 8px 0; color: #1e40af; font-size: ${titleSize}; font-weight: 600;">Best Books</h4>
                    <div style="font-size: ${fontSize}; color: #333;">
                        <div style="margin-bottom: 4px;"><strong>Over:</strong> ${bestOverBook}</div>
                        <div><strong>Under:</strong> ${bestUnderBook}</div>
                    </div>
                </div>
            </div>
        `;
    }

    linkifyBooks(booksStr, linksStr) {
        if (!booksStr || booksStr === '-') return '-';
        const books = booksStr.split('/').map(b => b.trim());
        const links = linksStr ? linksStr.split(' / ').map(l => l.trim()).filter(l => l) : [];
        const bookSearchKeys = { 'draftkings': 'draftkings', 'fanduel': 'fanduel', 'caesars': 'caesars', 'pinnacle': 'pinnacle', 'fliff': 'fliff', 'betmgm': 'betmgm', 'betrivers': 'betrivers' };
        const parts = books.map(book => {
            const bookLower = book.toLowerCase();
            if (bookLower.includes('fanatics')) return book;
            let matchedLink = null;
            for (const link of links) {
                const linkLower = link.toLowerCase();
                for (const [bookKey, searchTerm] of Object.entries(bookSearchKeys)) {
                    if (bookLower.includes(bookKey) && linkLower.includes(searchTerm)) { matchedLink = link; break; }
                }
                if (matchedLink) break;
            }
            if (matchedLink) return `<a href="${matchedLink}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline; font-weight: 500;">${book}</a>`;
            return book;
        });
        return parts.join('/');
    }

    forceRecalculateWidths() {
        if (!this.table || !this._firstCalcDone) return;
        const data = this.table.getData() || [];
        if (data.length > 0) { this.scanDataForMaxWidths(data); this.equalizeClusteredColumns(); }
        this._doCalculateAndApplyWidths();
        this.ensureNameColumnWidth();
    }

    expandNameColumnToFill() { this.forceRecalculateWidths(); }
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
                const tc = tableElement.closest('.table-container');
                if (tc) { tc.style.width = ''; tc.style.minWidth = ''; tc.style.overflowX = ''; }
                tableElement.style.removeProperty('width');
                tableElement.style.removeProperty('min-width');
                tableElement.style.removeProperty('max-width');
            } else {
                const SCROLLBAR_WIDTH = 17;
                const finalWidth = this._measuredSubtableWidth ? Math.max(totalColumnWidth, this._measuredSubtableWidth) : totalColumnWidth;
                const totalWidth = finalWidth + SCROLLBAR_WIDTH;
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
            this.ensureNameColumnWidth();
        } catch (error) { console.error('Error in NHL Prop Clearances calculateAndApplyWidths:', error); }
    }

    scanDataForMaxWidths(data) {
        if (!data || data.length === 0 || !this.table) return;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidths = { "Lineup Status": 0, "Player Team": 0, "Player Prop": 0 };
        ctx.font = '600 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        const HP = 16, SI = 16;
        const ftt = { "Lineup Status": "Lineup", "Player Team": "Team", "Player Prop": "Prop" };
        Object.keys(maxWidths).forEach(f => { maxWidths[f] = ctx.measureText(ftt[f] || f).width + HP + SI; });
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        data.forEach(row => {
            Object.keys(maxWidths).forEach(f => {
                let v = row[f];
                if (v != null && v !== '') {
                    if (f === "Lineup Status") v = String(v).replace('(Expected)', '(Exp)').replace('(Confirmed)', '(Conf)');
                    else if (f === "Player Prop") v = this.propAbbrevMap[v] || v;
                    const tw = ctx.measureText(String(v)).width;
                    if (tw > maxWidths[f]) maxWidths[f] = tw;
                }
            });
        });
        const CP = 16, BF = 8;
        Object.keys(maxWidths).forEach(f => {
            if (maxWidths[f] > 0) { const col = this.table.getColumn(f); if (col) { const rw = maxWidths[f] + CP + BF; if (rw > col.getWidth()) col.setWidth(Math.ceil(rw)); } }
        });
        this.ensureNameColumnWidth();
    }

    equalizeClusteredColumns() {
        if (!this.table) return;
        const clusters = {
            'cluster-a': ['Player Clearance', 'Player Games'],
            'cluster-c': ['Player Prop Median', 'Player Prop Average', 'Player Prop High', 'Player Prop Low', 'Player Prop Mode'],
            'cluster-d-median': ['Player Median Over Odds', 'Player Median Under Odds'],
            'cluster-d-best': ['Player Best Over Odds', 'Player Best Under Odds']
        };
        Object.keys(clusters).forEach(cn => {
            const fields = clusters[cn];
            let mw = 0;
            fields.forEach(f => { const c = this.table.getColumn(f); if (c && c.getWidth() > mw) mw = c.getWidth(); });
            if (mw > 0) fields.forEach(f => { const c = this.table.getColumn(f); if (c) c.setWidth(mw); });
        });
    }

    // Custom sorters
    gamesPlayedSorter(a, b) {
        const g = v => { if (!v || v === '-') return -1; const m = String(v).match(/^(\d+)/); return m ? parseInt(m[1], 10) : -1; };
        return g(a) - g(b);
    }
    oddsSorter(a, b) {
        const g = v => {
            if (v == null || v === '' || v === '-') return -99999;
            const s = String(v).trim();
            if (s.startsWith('+')) return parseInt(s.substring(1), 10) || -99999;
            return parseInt(s, 10) || -99999;
        };
        return g(a) - g(b);
    }

    createNameFormatter() {
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
            const nameSpan = document.createElement('span');
            nameSpan.textContent = value;
            container.appendChild(icon);
            container.appendChild(nameSpan);
            return container;
        };
    }

    getColumns(isSmallScreen = false) {
        const self = this;

        const clearanceFormatter = (cell) => {
            const v = cell.getValue(); if (v == null || v === '') return '-';
            const s = String(v).replace('%', '').trim(); const n = parseFloat(s);
            if (isNaN(n)) return '-'; return (n * 100).toFixed(1) + '%';
        };
        const oneDecimalFormatter = (cell) => {
            const v = cell.getValue(); if (v == null || v === '') return '-';
            const n = parseFloat(v); return isNaN(n) ? '-' : n.toFixed(1);
        };
        const propFormatter = (cell) => {
            const v = cell.getValue(); if (v == null || v === '') return '-';
            return self.propAbbrevMap[v] || v;
        };
        const splitFormatter = (cell) => {
            const v = cell.getValue(); if (v == null || v === '') return '-';
            let s = String(v); if (s === 'Full Season') return 'Season'; if (s === 'Last 30 Days') return 'L30 Days'; return s;
        };
        const lineupFormatter = (cell) => {
            const v = cell.getValue(); if (v == null || v === '') return '-';
            return String(v).replace('(Expected)', '(Exp)').replace('(Confirmed)', '(Conf)');
        };
        const oddsFormatter = (cell) => {
            const v = cell.getValue(); if (v == null || v === '' || v === '-') return '-';
            const n = parseInt(v, 10); if (isNaN(n)) return '-'; return n > 0 ? `+${n}` : `${n}`;
        };

        return [
            // NAME - frozen, expandable
            { title: "Name", field: "Player Name", frozen: true, widthGrow: 0, minWidth: NAME_COLUMN_MIN_WIDTH, sorter: "string", headerFilter: true, resizable: false, formatter: this.createNameFormatter(), hozAlign: "left", cssClass: "standalone-header" },
            // TEAM - standalone
            { title: "Team", field: "Player Team", widthGrow: 0, minWidth: 45, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center", cssClass: "standalone-header" },
            // LINEUP - standalone
            { title: "Lineup", field: "Lineup Status", widthGrow: 0, minWidth: LINEUP_COLUMN_MIN_WIDTH, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center", formatter: lineupFormatter, cssClass: "standalone-header" },
            // PROP INFO group
            { title: "Prop Info", columns: [
                { title: "Prop", field: "Player Prop", widthGrow: 0, minWidth: 75, sorter: "string", headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center", formatter: propFormatter },
                { title: "Line", field: "Player Prop Value", widthGrow: 0, minWidth: 40, sorter: "number", headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, hozAlign: "center" }
            ]},
            // CLEARANCE group
            { title: "Clearance", columns: [
                { title: "Split", field: "Split", widthGrow: 0, minWidth: SPLIT_COLUMN_MIN_WIDTH, headerFilter: createCustomMultiSelect, resizable: false, hozAlign: "center", formatter: splitFormatter },
                { title: "% Over", field: "Player Clearance", widthGrow: 0, minWidth: 50, sorter: "number", resizable: false, formatter: clearanceFormatter, hozAlign: "center", cssClass: "cluster-a" },
                { title: "Games", field: "Player Games", widthGrow: 0, minWidth: 50, sorter: function(a, b) { return self.gamesPlayedSorter(a, b); }, resizable: false, hozAlign: "center", cssClass: "cluster-a" }
            ]},
            // NOTE: Opponent group intentionally removed for NHL (no Prop Rank, no Pace Rank)
            // PLAYER STATS group
            { title: "Player Stats", columns: [
                { title: "Med", field: "Player Prop Median", widthGrow: 0, minWidth: 40, sorter: "number", resizable: false, hozAlign: "center", formatter: oneDecimalFormatter, cssClass: "cluster-c" },
                { title: "Avg", field: "Player Prop Average", widthGrow: 0, minWidth: 40, sorter: "number", resizable: false, hozAlign: "center", formatter: oneDecimalFormatter, cssClass: "cluster-c" },
                { title: "High", field: "Player Prop High", widthGrow: 0, minWidth: 40, sorter: "number", resizable: false, hozAlign: "center", cssClass: "cluster-c" },
                { title: "Low", field: "Player Prop Low", widthGrow: 0, minWidth: 40, sorter: "number", resizable: false, hozAlign: "center", cssClass: "cluster-c" },
                { title: "Mode", field: "Player Prop Mode", widthGrow: 0, minWidth: 40, sorter: "number", resizable: false, hozAlign: "center", cssClass: "cluster-c" }
            ]},
            // MEDIAN ODDS group
            { title: "Median Odds", columns: [
                { title: "Over", field: "Player Median Over Odds", widthGrow: 0, minWidth: 45, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-d-median" },
                { title: "Under", field: "Player Median Under Odds", widthGrow: 0, minWidth: 45, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-d-median" }
            ]},
            // BEST ODDS group
            { title: "Best Odds", columns: [
                { title: "Over", field: "Player Best Over Odds", widthGrow: 0, minWidth: 45, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-d-best" },
                { title: "Under", field: "Player Best Under Odds", widthGrow: 0, minWidth: 45, sorter: function(a, b) { return self.oddsSorter(a, b); }, headerFilter: createMinMaxFilter, headerFilterFunc: minMaxFilterFunction, headerFilterLiveFilter: false, resizable: false, formatter: oddsFormatter, hozAlign: "center", cssClass: "cluster-d-best" }
            ]}
        ];
    }
}
