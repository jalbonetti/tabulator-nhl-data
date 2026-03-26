// tables/nhlMatchups.js - NHL Matchups Table
// Follows the EXACT same width management pattern as nhlPlayerPropOdds.js:
// - fitData layout, measure content, set column widths
// - Desktop: pixel widths on tabulator element (NOT container), container=fit-content via CSS
// - Mobile: removeProperty on tabulator, let CSS handle
// - tableholder overflow-y: scroll on desktop via CSS

import { BaseTable } from './baseTable.js';
import { isMobile, isTablet } from '../shared/config.js';
import { API_CONFIG } from '../shared/config.js';

export class NHLMatchupsTable extends BaseTable {
    constructor(elementId) {
        super(elementId, 'HockeyMatchupsGame');
        this.ENDPOINTS = { GAME: 'HockeyMatchupsGame', GOALIE: 'HockeyMatchupsGoalie', SKATER: 'HockeyMatchupsSkater' };
        this.goalieDataCache = new Map();
        this.skaterDataCache = new Map();
        this.subtableDataReady = false;
        this._firstCalcDone = false;
        this.teamNameMap = {
            'ANA':'Anaheim Ducks','BOS':'Boston Bruins','BUF':'Buffalo Sabres','CGY':'Calgary Flames',
            'CAR':'Carolina Hurricanes','CHI':'Chicago Blackhawks','COL':'Colorado Avalanche',
            'CBJ':'Columbus Blue Jackets','DAL':'Dallas Stars','DET':'Detroit Red Wings',
            'EDM':'Edmonton Oilers','FLA':'Florida Panthers','LAK':'Los Angeles Kings',
            'MIN':'Minnesota Wild','MTL':'Montréal Canadiens','NSH':'Nashville Predators',
            'NJD':'New Jersey Devils','NYI':'New York Islanders','NYR':'New York Rangers',
            'OTT':'Ottawa Senators','PHI':'Philadelphia Flyers','PIT':'Pittsburgh Penguins',
            'SJS':'San Jose Sharks','SEA':'Seattle Kraken','STL':'St Louis Blues',
            'TBL':'Tampa Bay Lightning','TOR':'Toronto Maple Leafs','UTA':'Utah Mammoths',
            'VAN':'Vancouver Canucks','VGK':'Vegas Golden Knights','WSH':'Washington Capitals',
            'WPG':'Winnipeg Jets','ARI':'Arizona Coyotes'
        };
        this.teamAbbrevMap = {};
        Object.entries(this.teamNameMap).forEach(([a,f]) => { this.teamAbbrevMap[f] = a; });
    }

    // =========================================================================
    // STYLES — exact same pattern as nhlPlayerPropOdds._injectPropOddsStyles
    // =========================================================================
    _injectMatchupsStyles() {
        const styleId = 'nhl-matchups-width-override';
        if (document.querySelector(`#${styleId}`)) return;
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            @media screen and (min-width: 1025px) {
                #table0-container {
                    width: fit-content !important;
                    max-width: none !important;
                    overflow-x: visible !important;
                }
                #table0-container .tabulator {
                    width: auto !important;
                    max-width: none !important;
                }
                #table0-container .tabulator .tabulator-tableholder {
                    overflow-y: scroll !important;
                }
            }
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
                #table0-container .tabulator .tabulator-tableholder {
                    overflow-x: auto !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                #table0-container .tabulator-row {
                    overflow: visible !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // =========================================================================
    // INITIALIZE
    // =========================================================================
    initialize() {
        this._injectMatchupsStyles();
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
            ajaxError: (e) => { console.error("Error loading NHL matchups:", e); }
        };
        this.table = new Tabulator(this.elementId, config);

        this.table.on("dataLoaded", (data) => {
            this.dataLoaded = true;
            data.forEach(row => { if (row._expanded === undefined) row._expanded = false; });
            this.prefetchSubtableData(data);
            const el = document.querySelector(this.elementId);
            if (el) { const ld = el.querySelector('.loading-indicator'); if (ld) ld.remove(); }
            setTimeout(() => {
                this._setColumnWidths();
                this._doCalculateAndApplyWidths();
                this._firstCalcDone = true;
            }, 150);
        });

        this.table.on("cellClick", (e, cell) => {
            if (cell.getColumn().getField() !== "Matchup") return;
            const row = cell.getRow();
            const data = row.getData();
            data._expanded = !data._expanded;
            row.update(data);
            setTimeout(() => row.reformat(), 50);
        });

        this.table.on("tableBuilt", () => {
            window.addEventListener('resize', this.debounce(() => {
                if (this.table && this._firstCalcDone) {
                    this._setColumnWidths();
                    this._doCalculateAndApplyWidths();
                }
            }, 250));
        });
    }

    // =========================================================================
    // COLUMN WIDTH MEASUREMENT
    // =========================================================================
    _setColumnWidths() {
        if (!this.table) return;
        const data = this.table.getData() || [];
        if (data.length === 0) return;

        // Measure longest matchup string
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '500 12px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
        let maxMatchupW = 0;
        data.forEach(row => {
            const w = ctx.measureText(row["Matchup"] || '').width;
            if (w > maxMatchupW) maxMatchupW = w;
        });
        maxMatchupW += 80; // expand icon (18) + cell padding (18) + sort icon (16) + font weight buffer (28)

        // Measure longest abbreviated spread
        let maxSpreadW = 0;
        data.forEach(row => {
            const abbr = this.abbreviateSpread(row["Spread"]);
            const w = ctx.measureText(abbr).width;
            if (w > maxSpreadW) maxSpreadW = w;
        });
        maxSpreadW += 24; // cell padding + sort icon

        // Total column: "O/U XXX.X" is the longest format
        const maxTotalW = ctx.measureText('O/U 999.9').width + 24;

        const mc = this.table.getColumn("Matchup");
        const sc = this.table.getColumn("Spread");
        const tc = this.table.getColumn("Total");
        if (mc) mc.setWidth(Math.ceil(maxMatchupW));
        if (sc) sc.setWidth(Math.ceil(Math.max(maxSpreadW, 90)));
        if (tc) tc.setWidth(Math.ceil(Math.max(maxTotalW, 90)));
    }

    // =========================================================================
    // WIDTH APPLICATION — exact same pattern as nhlPlayerPropOdds._doCalculateAndApplyWidths
    // =========================================================================
    _doCalculateAndApplyWidths() {
        if (!this.table) return;
        const te = this.table.element;
        if (!te) return;
        const isSmallScreen = isMobile() || isTablet();

        try {
            const columns = this.table.getColumns();
            let totalColumnWidth = 0;
            columns.forEach(col => { if (col.isVisible()) totalColumnWidth += col.getWidth(); });

            if (isSmallScreen) {
                // Mobile: clear pixel widths, CSS handles everything
                const tc = te.closest('.table-container');
                if (tc) { tc.style.width = ''; tc.style.minWidth = ''; tc.style.overflowX = ''; }
                te.style.removeProperty('width');
                te.style.removeProperty('min-width');
                te.style.removeProperty('max-width');
            } else {
                // Desktop: set pixel widths on tabulator element (container stays fit-content via CSS)
                const SCROLLBAR_WIDTH = 17;
                const totalWidth = totalColumnWidth + SCROLLBAR_WIDTH;
                te.style.width = totalWidth + 'px';
                te.style.minWidth = totalWidth + 'px';
                te.style.maxWidth = totalWidth + 'px';
                const th = te.querySelector('.tabulator-tableholder');
                if (th) { th.style.width = totalWidth + 'px'; th.style.maxWidth = totalWidth + 'px'; }
                const hdr = te.querySelector('.tabulator-header');
                if (hdr) hdr.style.width = totalWidth + 'px';
            }
        } catch (e) { console.error('NHL Matchups width error:', e); }
    }

    forceRecalculateWidths() { if (this._firstCalcDone) { this._setColumnWidths(); this._doCalculateAndApplyWidths(); } }
    expandNameColumnToFill() { this.forceRecalculateWidths(); }
    calculateAndApplyWidths() { if (this._firstCalcDone) this._doCalculateAndApplyWidths(); }
    debounce(func, wait) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => func.apply(this, a), wait); }; }

    // =========================================================================
    // DATA FETCHING
    // =========================================================================
    async fetchFromEndpoint(endpoint) {
        const url = `${API_CONFIG.baseURL}${endpoint}`;
        try { const r = await fetch(url, { method:"GET", headers:API_CONFIG.headers }); if(!r.ok)throw new Error(`HTTP ${r.status}`); return await r.json(); }
        catch(e) { console.error(`Error fetching ${endpoint}:`,e); return null; }
    }
    async prefetchSubtableData(mainData) {
        try {
            const [gd,sd] = await Promise.all([this.fetchFromEndpoint(this.ENDPOINTS.GOALIE), this.fetchFromEndpoint(this.ENDPOINTS.SKATER)]);
            if(gd)gd.forEach(r=>{const m=String(r["Matchup ID"]);if(!this.goalieDataCache.has(m))this.goalieDataCache.set(m,[]);this.goalieDataCache.get(m).push(r);});
            if(sd)sd.forEach(r=>{const m=String(r["Matchup ID"]);if(!this.skaterDataCache.has(m))this.skaterDataCache.set(m,[]);this.skaterDataCache.get(m).push(r);});
            this.subtableDataReady=true;
            if(this.table)this.restoreExpandedSubtables();
        } catch(e) { console.error("Error prefetching:",e); }
    }
    restoreExpandedSubtables() {
        if(!this.table||!this.subtableDataReady)return;
        this.table.getRows().forEach(row=>{const d=row.getData();if(d._expanded){const el=row.getElement();if(el&&!el.querySelector('.subrow-container:not(.subrow-loading)')){const ld=el.querySelector('.subrow-loading');if(ld)ld.remove();this.createAndAppendSubtable(el,d);}}});
    }

    // =========================================================================
    // PARSING & ABBREVIATION
    // =========================================================================
    parseMatchup(s) {
        if(!s)return{away:null,home:null};const p=s.split('@');if(p.length!==2)return{away:null,home:null};
        return{away:p[0].trim(),home:p[1].replace(/,?\s*(Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec).*$/i,'').replace(/\s+\d{1,2}:\d{2}.*$/i,'').replace(/\s*\d{1,2}\/\d{1,2}.*$/,'').trim()};
    }
    getTeamAbbrev(name){if(!name)return null;if(this.teamAbbrevMap[name])return this.teamAbbrevMap[name];for(const[n,a]of Object.entries(this.teamAbbrevMap)){if(name.includes(n)||n.includes(name))return a;}return null;}
    getTeamFullName(a){return this.teamNameMap[a]||a;}
    abbreviateSpread(spread){if(!spread)return'-';let r=spread;const sorted=Object.entries(this.teamAbbrevMap).sort((a,b)=>b[0].length-a[0].length);for(const[f,a]of sorted){if(r.includes(f)){r=r.replace(f,a);break;}}return r;}

    // =========================================================================
    // ROW FORMATTER
    // =========================================================================
    createRowFormatter(){
        const self=this;
        return(row)=>{const d=row.getData(),el=row.getElement();
            if(d._expanded){el.classList.add('row-expanded');
                if(!el.querySelector('.subrow-container:not(.subrow-loading)')){
                    if(!self.subtableDataReady){if(!el.querySelector('.subrow-loading')){const ld=document.createElement("div");ld.classList.add('subrow-container','subrow-loading');ld.style.cssText='padding:15px 20px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-top:2px solid #1e40af;text-align:center;color:#666;';ld.innerHTML='Loading matchup data...';el.appendChild(ld);}return;}
                    const loading=el.querySelector('.subrow-loading');if(loading)loading.remove();
                    self.createAndAppendSubtable(el,d);
                }
            }else{const ex=el.querySelector('.subrow-container');if(ex){ex.remove();el.classList.remove('row-expanded');}}
        };
    }
    createAndAppendSubtable(rowElement,data){
        if(rowElement.querySelector('.subrow-container:not(.subrow-loading)'))return;
        const ld=rowElement.querySelector('.subrow-loading');if(ld)ld.remove();
        const h=document.createElement("div");h.classList.add('subrow-container');
        h.style.cssText='padding:15px 20px;background:linear-gradient(135deg,#eff6ff,#dbeafe);border-top:2px solid #1e40af;margin:0;display:block;position:relative;z-index:1;overflow:hidden;';
        try{this.createSubtableContent(h,data);}catch(e){h.innerHTML='<div style="padding:10px;color:red;">Error loading details</div>';}
        rowElement.appendChild(h);
    }

    // =========================================================================
    // SUBTABLE CONTENT
    // =========================================================================
    createSubtableContent(container,data){
        const mid=String(data["Matchup ID"]);
        const{away:awayFull,home:homeFull}=this.parseMatchup(data["Matchup"]);
        const awayA=this.getTeamAbbrev(awayFull),homeA=this.getTeamAbbrev(homeFull);
        const gd=this.goalieDataCache.get(mid)||[],sd=this.skaterDataCache.get(mid)||[];
        const b2bAway=data["B2B Away"]==='Yes'||data["B2BAway"]==='Yes';
        const b2bHome=data["B2B Home"]==='Yes'||data["B2BHome"]==='Yes';
        const sm=isMobile()||isTablet();
        const w=document.createElement('div');w.className='subtable-scroll-wrapper';
        w.style.cssText=`display:flex;flex-direction:column;gap:${sm?'8px':'15px'};max-height:${sm?'350px':'450px'};overflow-y:auto;overflow-x:hidden;`;
        if(!document.getElementById('nhl-subtable-scrollbar-styles')){const s=document.createElement('style');s.id='nhl-subtable-scrollbar-styles';s.textContent=`.subtable-scroll-wrapper::-webkit-scrollbar{width:8px}.subtable-scroll-wrapper::-webkit-scrollbar-track{background:#f1f1f1;border-radius:4px}.subtable-scroll-wrapper::-webkit-scrollbar-thumb{background:#c1c1c1;border-radius:4px}.subtable-scroll-wrapper{scrollbar-width:thin;scrollbar-color:#c1c1c1 #f1f1f1}`;document.head.appendChild(s);}
        w.appendChild(this.mkGoalie(gd.filter(g=>g["Team"]===awayA),`${awayFull||awayA} (Away) Goalie`));
        w.appendChild(this.mkSkater(sd.filter(s=>s["Team"]===homeA),`${homeFull||homeA} (Home) Lineup${b2bHome?' - B2B Game':''}`));
        w.appendChild(this.mkGoalie(gd.filter(g=>g["Team"]===homeA),`${homeFull||homeA} (Home) Goalie`));
        w.appendChild(this.mkSkater(sd.filter(s=>s["Team"]===awayA),`${awayFull||awayA} (Away) Lineup${b2bAway?' - B2B Game':''}`));
        container.appendChild(w);
    }

    // =========================================================================
    // GOALIE TABLE
    // =========================================================================
    mkGoalie(data,title){
        const c=document.createElement('div');c.style.cssText='background:white;padding:12px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        const h=document.createElement('h4');h.textContent=title;h.style.cssText='margin:0 0 10px 0;color:#1e40af;font-size:13px;font-weight:600;';c.appendChild(h);
        if(!data||data.length===0){const n=document.createElement('div');n.textContent='No goalie data available';n.style.cssText='color:#666;font-size:12px;padding:10px;';c.appendChild(n);return c;}
        const sm=isMobile()||isTablet(),cp=sm?'2px 4px':'4px 8px',fs=sm?'10px':'12px',sw=sm?'45px':'60px';
        const t=document.createElement('table');t.style.cssText=`font-size:${fs};border-collapse:collapse;width:100%;table-layout:fixed;`;
        t.innerHTML=`<colgroup><col style="width:auto"><col style="width:${sw}"><col style="width:${sw}"><col style="width:${sw}"><col style="width:${sw}"></colgroup>`;
        const hd=document.createElement('thead');hd.innerHTML=`<tr style="background:#f8f9fa"><th style="padding:${cp};text-align:left;border-bottom:1px solid #ddd">Player</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">GAA</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">SA</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">SV%</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">Saves</th></tr>`;
        t.appendChild(hd);const tb=document.createElement('tbody');
        this.sortByInjury(data,"Goalie Name").forEach((r,i)=>{const tr=document.createElement('tr');tr.style.cssText=i%2===1?'background:#fafafa;':'';const g=parseInt(r["Games"]||'0',10);const info=`${r["Goalie Name"]||'-'} - ${this.fmtSplit(r["Split"])} - ${g===1?'1 Game':g+' Games'} - ${r["W-L-OTL"]||'-'}`;tr.innerHTML=`<td style="padding:${cp};text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${info}</td><td style="padding:${cp};text-align:center">${this.fmtGAA(r["Goals Against"])}</td><td style="padding:${cp};text-align:center">${this.fmt1(r["Shots Against"])}</td><td style="padding:${cp};text-align:center">${this.fmtSvPct(r["Save %"])}</td><td style="padding:${cp};text-align:center">${this.fmt1(r["Total Saves"])}</td>`;tb.appendChild(tr);});
        t.appendChild(tb);c.appendChild(t);return c;
    }

    // =========================================================================
    // SKATER TABLE
    // =========================================================================
    mkSkater(data,title){
        const c=document.createElement('div');c.style.cssText='background:white;padding:12px;border-radius:6px;box-shadow:0 1px 3px rgba(0,0,0,0.1);';
        const h=document.createElement('h4');h.textContent=title;h.style.cssText='margin:0 0 10px 0;color:#1e40af;font-size:13px;font-weight:600;';c.appendChild(h);
        if(!data||data.length===0){const n=document.createElement('div');n.textContent='No skater data available';n.style.cssText='color:#666;font-size:12px;padding:10px;';c.appendChild(n);return c;}
        const sm=isMobile()||isTablet(),cp=sm?'2px 4px':'4px 8px',fs=sm?'10px':'12px',sw=sm?'45px':'60px';
        const t=document.createElement('table');t.style.cssText=`font-size:${fs};border-collapse:collapse;width:100%;table-layout:fixed;`;
        t.innerHTML=`<colgroup><col style="width:auto"><col style="width:${sw}"><col style="width:${sw}"><col style="width:${sw}"><col style="width:${sw}"></colgroup>`;
        const hd=document.createElement('thead');hd.innerHTML=`<tr style="background:#f8f9fa"><th style="padding:${cp};text-align:left;border-bottom:1px solid #ddd">Player</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">Pts</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">G</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">A</th><th style="padding:${cp};text-align:center;border-bottom:1px solid #ddd">SOG</th></tr>`;
        t.appendChild(hd);const tb=document.createElement('tbody');
        this.sortByInjury(data,"Skater Name").forEach((r,i)=>{const tr=document.createElement('tr');tr.style.cssText=i%2===1?'background:#fafafa;':'';const g=parseInt(r["Games"]||'0',10);const info=`${r["Skater Name"]||'-'} - ${this.fmtSplit(r["Split"])} - ${g===1?'1 Game':g+' Games'} - ${this.fmt1(r["TOI"])} min`;tr.innerHTML=`<td style="padding:${cp};text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${info}</td><td style="padding:${cp};text-align:center">${this.fmt1(r["Points"])}</td><td style="padding:${cp};text-align:center">${this.fmt1(r["Goals"])}</td><td style="padding:${cp};text-align:center">${this.fmt1(r["Assists"])}</td><td style="padding:${cp};text-align:center">${this.fmt1(r["SOG"])}</td>`;tb.appendChild(tr);});
        t.appendChild(tb);c.appendChild(t);return c;
    }

    // =========================================================================
    // FORMATTERS
    // =========================================================================
    sortByInjury(data,nf){const p=n=>{if(!n)return 0;const u=n.toUpperCase();if(u.includes('(LTIR)'))return 4;if(u.includes('(IR)'))return 3;if(u.includes('(OUT)'))return 2;if(u.includes('(DTD)'))return 1;return 0;};return[...data].sort((a,b)=>{const ap=p(a[nf]),bp=p(b[nf]);return ap!==bp?ap-bp:(a[nf]||'').localeCompare(b[nf]||'');});}
    fmt1(v){if(v==null||v===''||v==='-')return'-';const n=parseFloat(v);return isNaN(n)?String(v):n.toFixed(1);}
    fmtGAA(v){if(v==null||v===''||v==='-')return'-';const n=parseFloat(v);return isNaN(n)?String(v):n.toFixed(2);}
    fmtSvPct(v){if(v==null||v===''||v==='-')return'-';const n=parseFloat(v);if(isNaN(n))return String(v);if(n>1)return'.'+(n/100).toFixed(3).substring(2);return'.'+n.toFixed(3).substring(2);}
    fmtSplit(v){if(!v)return'-';if(v==='Full Season')return'Season';if(v==='Last 30 Days')return'L30 Days';return v;}
    fmtTotal(v){if(v==null||v===''||v==='-')return'-';const s=String(v);if(s.includes('O/U')){const m=s.match(/O\/U\s*([\d.]+)/);if(m){const n=parseFloat(m[1]);if(!isNaN(n))return'O/U '+n.toFixed(1);}return s;}const n=parseFloat(s);return isNaN(n)?s:n.toFixed(1);}
    createMatchupFormatter(){return(cell)=>{const v=cell.getValue();if(!v)return'-';const d=cell.getRow().getData();const c=document.createElement('div');c.style.cssText='display:flex;align-items:center;cursor:pointer;';const i=document.createElement('span');i.className='expand-icon';i.style.cssText='margin-right:6px;font-size:10px;color:#1e40af;display:inline-flex;width:12px;';i.innerHTML=d._expanded?'&#9660;':'&#9654;';const t=document.createElement('span');t.textContent=v;c.appendChild(i);c.appendChild(t);return c;};}

    // =========================================================================
    // COLUMNS
    // =========================================================================
    getColumns(isSmallScreen=false){const self=this;return[
        {title:"Matchup ID",field:"Matchup ID",visible:false,sorter:"number"},
        {title:"Matchup",field:"Matchup",widthGrow:0,minWidth:250,sorter:"string",headerFilter:true,resizable:false,hozAlign:"left",formatter:this.createMatchupFormatter()},
        {title:"Spread",field:"Spread",widthGrow:0,minWidth:90,sorter:"string",resizable:false,hozAlign:"center",formatter:(cell)=>self.abbreviateSpread(cell.getValue())},
        {title:"Total",field:"Total",widthGrow:0,minWidth:80,sorter:"string",resizable:false,hozAlign:"center",formatter:(cell)=>self.fmtTotal(cell.getValue())}
    ];}
}
