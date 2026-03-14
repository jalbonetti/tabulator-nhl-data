// styles/tableStyles.js - NHL Table Styles
// PURE COPY of NBA injectMinimalStyles with ZERO color additions.
// Webflow provides ALL visual styling (headers, rows, cells, alternating, hover).
// We only add technical fixes (visibility, ellipsis, dropdowns, min-max, frozen, grey bg, mobile).
// The ONLY color difference from NBA is in tabManager.js (tab button gradient).
//
// FIXES APPLIED:
// - Header filter inputs now have font-weight: 700 + color: #111 to match NBA Webflow bold/dark text
// - Frozen column backgrounds use #fafafa/#ffffff/#eff6ff on ALL screen sizes (not just mobile)
// - Previous frozen colors (#f5f5f5, #fff7ed) corrected to match NBA's Webflow alternating rows
// - FIXED: Removed font-weight: 600 and color: #333 from .tabulator-col-title
//   NBA does NOT set these — Webflow provides header font-weight/color.
//   Bold text is physically wider, causing headers to wrap inside minWidth columns on mobile.
// - FIXED: Added blue theme gradient on frozen header column for mobile/tablet
//   Previously missing — caused frozen header to have no background color on mobile
// - FIXED: Added standalone header alignment block for mobile/tablet
//   Previously missing — caused extraneous vertical space in NHL headers
// - FIXED: Desktop frozen column now has explicit even/odd/hover background colors
//   Previously used 'inherit' which doesn't cascade through sticky positioning

import { isMobile, isTablet, getDeviceScale } from '../shared/config.js';

export function injectStyles() {
    if (document.querySelector('style[data-table-styles="webflow"]')) {
        console.log('Webflow detected, applying minimal overrides only');
        injectMinimalStyles();
        injectScrollbarFix();
        return;
    }
    injectFullStyles();
}

function injectScrollbarFix() {
    if (document.querySelector('#nhl-scrollbar-fix')) return;
    
    const style = document.createElement('style');
    style.id = 'nhl-scrollbar-fix';
    style.textContent = `
        @media screen and (min-width: 1025px) {
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar {
                display: block !important;
                width: 16px !important;
                height: 16px !important;
                visibility: visible !important;
                -webkit-appearance: scrollbar !important;
            }
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-track,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-track {
                background: #f1f1f1 !important;
                border-radius: 8px !important;
            }
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb {
                background: #888 !important;
                border-radius: 8px !important;
                border: 2px solid #f1f1f1 !important;
            }
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb:hover,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb:hover {
                background: #1e40af !important;
            }
            html body .tabulator .tabulator-tableholder,
            html body div.tabulator div.tabulator-tableholder {
                scrollbar-width: thin !important;
                scrollbar-color: #2563eb #f1f1f1 !important;
            }
        }
        
        @media screen and (max-width: 1024px) {
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar {
                display: block !important;
                width: 4px !important;
                height: 4px !important;
                visibility: visible !important;
            }
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb {
                display: block !important;
                background: #ccc !important;
                border-radius: 2px !important;
                visibility: visible !important;
            }
        }
    `;
    
    // Insert AFTER any Webflow styles
    const webflowStyle = document.querySelector('style[data-table-styles="webflow"]');
    if (webflowStyle && webflowStyle.nextSibling) {
        webflowStyle.parentNode.insertBefore(style, webflowStyle.nextSibling);
    } else {
        document.head.appendChild(style);
    }
}

/**
 * MINIMAL STYLES - For Webflow environments
 * NO header colors, NO row colors, NO cell padding, NO header font-weight/color.
 * Webflow provides all visual styling including header font-weight and color.
 * We only add technical layout fixes.
 */
function injectMinimalStyles() {
    if (document.querySelector('style[data-source="github-nhl-minimal"]')) return;
    
    const style = document.createElement('style');
    style.setAttribute('data-source', 'github-nhl-minimal');
    style.textContent = `
        /* Force visibility */
        .table-wrapper {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
        }
        .tabulator {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            width: 100% !important;
            background: #e8e8e8 !important;
        }
        .table-container {
            display: block !important;
            visibility: visible !important;
            background: #e8e8e8 !important;
        }
        
        /* Headers: word wrap + center */
        /* MATCHES NBA: No font-weight or color override — Webflow provides those. */
        /* Bold text (font-weight: 600) is physically wider than normal weight, */
        /* causing "Median Odds" etc. to exceed minWidth and wrap on mobile. */
        .tabulator-col-title {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            text-align: center !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        /* Header filter inputs — bold dark text */
        /* NBA gets this from Webflow theme; NHL needs it explicitly */
        .tabulator-header-filter input[type="search"],
        .tabulator-header-filter input[type="text"],
        .tabulator-header-filter input[type="number"],
        .tabulator-header-filter input {
            font-weight: 700 !important;
            color: #111 !important;
        }
        
        /* Min/Max filter inputs in headers: bold dark text */
        .min-max-input,
        .min-max-filter-container input {
            font-weight: 700 !important;
            color: #111 !important;
        }
        
        /* Bankroll input in headers: bold dark text */
        .bankroll-input,
        .bankroll-input-field,
        .bankroll-input-container input {
            font-weight: 700 !important;
            color: #111 !important;
        }
        
        /* Custom multi-select dropdown BUTTON in headers: bold dark text */
        .custom-multiselect-button,
        .tabulator-header-filter .custom-multiselect-button,
        .tabulator-header-filter button {
            font-weight: 700 !important;
            color: #111 !important;
        }
        
        /* Data cells: single-line with ellipsis (no padding/border - Webflow provides those) */
        .tabulator-cell {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        
        /* Dropdowns: position above table */
        .custom-multiselect-dropdown,
        [id^="dropdown_"] {
            z-index: 2147483647 !important;
            position: fixed !important;
            background: white !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.3) !important;
        }
        
        /* Min/Max filter stacking */
        .min-max-filter-container,
        .tabulator .min-max-filter-container,
        .tabulator-header .min-max-filter-container,
        .tabulator-header-filter .min-max-filter-container {
            display: flex !important;
            flex-direction: column !important;
            flex-wrap: nowrap !important;
            gap: 2px !important;
            max-width: 45px !important;
            margin: 0 auto !important;
        }
        
        .min-max-input,
        .min-max-filter-container > input {
            width: 100% !important;
            flex-shrink: 0 !important;
            padding: 2px 3px !important;
            font-size: 9px !important;
            border: 1px solid #ccc !important;
            border-radius: 2px !important;
            text-align: center !important;
            box-sizing: border-box !important;
            -moz-appearance: textfield !important;
            -webkit-appearance: none !important;
            appearance: none !important;
        }
        
        .min-max-input::-webkit-outer-spin-button,
        .min-max-input::-webkit-inner-spin-button {
            -webkit-appearance: none !important;
            margin: 0 !important;
        }
        
        .min-max-input:focus {
            outline: none !important;
            border-color: #1e40af !important;
            box-shadow: 0 0 0 1px rgba(30, 64, 175, 0.2) !important;
        }
        
        /* Bankroll input styling */
        .bankroll-input-container {
            display: flex !important;
            align-items: center !important;
            gap: 2px !important;
            max-width: 75px !important;
            margin: 0 auto !important;
        }
        
        .bankroll-input-container input {
            width: 100% !important;
            padding: 2px 3px !important;
            font-size: 9px !important;
            border: 1px solid #ccc !important;
            border-radius: 2px !important;
            text-align: center !important;
            box-sizing: border-box !important;
        }
        
        /* Text search input */
        .tabulator-header-filter input[type="search"],
        .tabulator-header-filter input[type="text"] {
            width: 100% !important;
            padding: 4px 6px !important;
            font-size: 11px !important;
            border: 1px solid #ccc !important;
            border-radius: 3px !important;
            box-sizing: border-box !important;
        }
        
        /* =====================================================
           FROZEN COLUMN BACKGROUNDS — ALL SCREEN SIZES
           FIXED: Use explicit colors instead of 'inherit' because
           sticky/frozen cells don't reliably inherit row backgrounds
           through Tabulator's positioning. This matches the NBA
           Webflow alternating row pattern exactly.
           ===================================================== */
        .tabulator-row .tabulator-cell.tabulator-frozen {
            position: sticky !important;
            left: 0 !important;
            z-index: 10 !important;
        }
        .tabulator-row .tabulator-frozen {
            position: sticky !important;
            left: 0 !important;
            z-index: 10 !important;
        }
        /* Even rows — explicit background on frozen cells */
        .tabulator-row.tabulator-row-even .tabulator-cell.tabulator-frozen,
        .tabulator-row:nth-child(even) .tabulator-cell.tabulator-frozen,
        .tabulator-row.tabulator-row-even .tabulator-frozen,
        .tabulator-row:nth-child(even) .tabulator-frozen {
            background: #fafafa !important;
        }
        /* Odd rows — explicit background on frozen cells */
        .tabulator-row.tabulator-row-odd .tabulator-cell.tabulator-frozen,
        .tabulator-row:nth-child(odd) .tabulator-cell.tabulator-frozen,
        .tabulator-row.tabulator-row-odd .tabulator-frozen,
        .tabulator-row:nth-child(odd) .tabulator-frozen {
            background: #ffffff !important;
        }
        /* Hover — explicit background on frozen cells */
        .tabulator-row:hover .tabulator-cell.tabulator-frozen,
        .tabulator-row:hover .tabulator-frozen {
            background: #eff6ff !important;
        }
        
        /* DESKTOP: Grey background fills empty space */
        @media screen and (min-width: 1025px) {
            .table-container {
                background: #e8e8e8 !important;
            }
            .table-wrapper {
                background: #e8e8e8 !important;
            }
            .tabulator {
                background-color: #e8e8e8 !important;
            }
            .tabulator .tabulator-tableholder {
                background-color: #e8e8e8 !important;
                overflow-y: scroll !important;
                overflow-x: auto !important;
            }
            
            /* DESKTOP: Frozen header needs sticky + z-index */
            .tabulator-header .tabulator-col.tabulator-frozen {
                position: sticky !important;
                left: 0 !important;
                z-index: 101 !important;
            }
        }
        
        /* =====================================================
           STANDALONE HEADER ALIGNMENT (mobile/tablet)
           Compresses header vertical space by top-aligning
           standalone columns (Name, Team, Prop, etc.)
           PREVIOUSLY MISSING — caused extraneous vertical space
           ===================================================== */
        @media screen and (max-width: 1024px) {
            .tabulator-header {
                display: flex !important;
                align-items: stretch !important;
            }
            
            .tabulator-header > .tabulator-headers > .tabulator-col {
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
            }
            
            .tabulator-col:not(.tabulator-col-group) > .tabulator-col-content {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                align-items: center !important;
                height: 100% !important;
                padding-top: 8px !important;
            }
            
            .tabulator-col:not(.tabulator-col-group) .tabulator-col-title {
                text-align: center !important;
                padding-top: 4px !important;
            }
            
            /* =====================================================
               FROZEN HEADER THEME COLOR (mobile/tablet)
               Blue gradient on frozen header column
               PREVIOUSLY MISSING — caused plain/white frozen header
               ===================================================== */
            .tabulator-header .tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
                z-index: 100 !important;
            }
            .tabulator-header .tabulator-col.tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
            }
            /* Frozen header text must be white against the dark blue background */
            .tabulator-header .tabulator-frozen .tabulator-col-title,
            .tabulator-header .tabulator-col.tabulator-frozen .tabulator-col-title {
                color: #ffffff !important;
            }
            .tabulator-header .tabulator-frozen .tabulator-col-content,
            .tabulator-header .tabulator-col.tabulator-frozen .tabulator-col-content {
                color: #ffffff !important;
            }
            /* Frozen header filter input stays dark text on white background */
            .tabulator-header .tabulator-frozen input,
            .tabulator-header .tabulator-col.tabulator-frozen input {
                color: #111 !important;
                background: #ffffff !important;
            }
        }
        
        /* Mobile: frozen column constraints */
        @media screen and (max-width: 1024px) {
            .table-container {
                width: 100% !important;
                max-width: 100vw !important;
                overflow-x: hidden !important;
            }
            .table-container .tabulator {
                width: 100% !important;
                min-width: 0 !important;
                max-width: 100% !important;
            }
            .table-container .tabulator .tabulator-tableholder {
                overflow-x: auto !important;
                -webkit-overflow-scrolling: touch !important;
            }
            /* Frozen cells need sticky positioning + explicit backgrounds */
            .tabulator-row .tabulator-cell.tabulator-frozen {
                position: sticky !important;
                left: 0 !important;
                z-index: 10 !important;
            }
            /* Even rows — use class selector (not :nth-child) to match Webflow */
            .tabulator-row.tabulator-row-even .tabulator-cell.tabulator-frozen {
                background: #fafafa !important;
            }
            /* Odd rows */
            .tabulator-row.tabulator-row-odd .tabulator-cell.tabulator-frozen {
                background: #ffffff !important;
            }
            /* Hover */
            .tabulator-row:hover .tabulator-cell.tabulator-frozen {
                background: #eff6ff !important;
            }
            .tabulator-header .tabulator-col.tabulator-frozen {
                position: sticky !important;
                left: 0 !important;
                z-index: 101 !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('NHL minimal styles injected (with frozen header blue theme + standalone header alignment fix + desktop frozen bg fix)');
}

/**
 * FULL STYLES - For non-Webflow environments only
 */
function injectFullStyles() {
    const mobile = isMobile();
    const tablet = isTablet();
    const baseFontSize = mobile ? 10 : tablet ? 11 : 12;
    
    const style = document.createElement('style');
    style.setAttribute('data-source', 'github-nhl-full');
    style.setAttribute('data-table-styles', 'github');
    style.textContent = `
        .tabulator, .tabulator *, .tabulator-table, .tabulator-table *,
        .tabulator-header, .tabulator-header *, .tabulator-row, .tabulator-row *,
        .tabulator-cell, .tabulator-cell * {
            font-size: ${baseFontSize}px !important;
            line-height: 1.3 !important;
        }
        .table-container {
            width: 100%; max-width: 100%; margin: 0 auto; position: relative;
            background: #e8e8e8; box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px; overflow: visible;
        }
        .table-wrapper { background: #e8e8e8; }
        .tabulator {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            font-size: ${baseFontSize}px !important; line-height: 1.3 !important;
            background-color: #e8e8e8; border: 1px solid #e0e0e0;
            border-radius: 6px; overflow: visible !important;
        }
        .tabulator .tabulator-tableholder { background-color: #e8e8e8; }
        .tabulator-header {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white; font-weight: 600;
        }
        .tabulator-col { background: transparent; border-right: 1px solid rgba(255,255,255,0.2); }
        .tabulator-col-title {
            white-space: normal !important; word-break: break-word !important;
            overflow-wrap: break-word !important; text-align: center !important;
            color: white !important;
            display: flex !important; align-items: center !important;
            justify-content: center !important; padding: 4px 2px !important;
        }
        .tabulator-row { background-color: #ffffff; }
        .tabulator-row:nth-child(even) { background-color: #f8f9fa; }
        .tabulator-row:hover { background-color: #eff6ff; }
        .tabulator-cell {
            white-space: nowrap !important; overflow: hidden !important;
            text-overflow: ellipsis !important; text-align: center;
            border-right: 1px solid #e8e8e8; padding: 6px 4px !important;
        }
        
        /* Dropdowns */
        .custom-multiselect-dropdown, [id^="dropdown_"] {
            z-index: 2147483647 !important; position: fixed !important;
            background: white !important; border: 1px solid #333 !important;
            border-radius: 4px !important; box-shadow: 0 -4px 12px rgba(0,0,0,0.3) !important;
        }
        .custom-multiselect-button {
            width: 100%; padding: 4px 8px; border: 1px solid #ccc;
            background: white; cursor: pointer; font-size: 11px !important;
            text-align: center; white-space: nowrap; overflow: hidden;
            text-overflow: ellipsis; border-radius: 3px; transition: border-color 0.2s ease;
        }
        .custom-multiselect-button:hover { border-color: #1e40af; }
        .custom-multiselect-button:focus {
            outline: none; border-color: #1e40af;
            box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.2);
        }
        
        /* Frozen columns */
        .tabulator-frozen {
            position: sticky !important; left: 0 !important;
            z-index: 10 !important; background: white !important;
        }
        .tabulator-frozen.tabulator-frozen-left {
            border-right: 1px solid rgba(30, 64, 175, 0.4) !important;
            box-shadow: 1px 0 3px rgba(0,0,0,0.05) !important;
        }
        .tabulator-header .tabulator-frozen {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
            z-index: 100 !important;
        }
        /* FIXED: Explicit even/odd/hover backgrounds for frozen cells */
        .tabulator-row .tabulator-frozen { background: #ffffff !important; }
        .tabulator-row:nth-child(even) .tabulator-frozen { background: #fafafa !important; }
        .tabulator-row:nth-child(odd) .tabulator-frozen { background: #ffffff !important; }
        .tabulator-row:hover .tabulator-frozen { background: #eff6ff !important; }
        
        /* Min/Max filters */
        .min-max-filter-container,
        .tabulator .min-max-filter-container,
        .tabulator-header .min-max-filter-container,
        .tabulator-header-filter .min-max-filter-container {
            display: flex !important; flex-direction: column !important;
            flex-wrap: nowrap !important; gap: 2px !important;
            max-width: 45px !important; margin: 0 auto !important;
        }
        .min-max-input, .min-max-filter-container > input {
            width: 100% !important; flex-shrink: 0 !important;
            padding: 2px 3px !important; font-size: 9px !important;
            border: 1px solid #ccc !important; border-radius: 2px !important;
            text-align: center !important; box-sizing: border-box !important;
            -moz-appearance: textfield !important; -webkit-appearance: none !important;
        }
        .min-max-input::-webkit-outer-spin-button,
        .min-max-input::-webkit-inner-spin-button {
            -webkit-appearance: none !important; margin: 0 !important;
        }
        .min-max-input:focus {
            outline: none !important; border-color: #1e40af !important;
            box-shadow: 0 0 0 1px rgba(30, 64, 175, 0.2) !important;
        }
        
        /* Bankroll input */
        .bankroll-input-container {
            display: flex !important; align-items: center !important;
            gap: 2px !important; max-width: 75px !important; margin: 0 auto !important;
        }
        .bankroll-input-container input {
            width: 100% !important; padding: 2px 3px !important;
            font-size: 9px !important; border: 1px solid #ccc !important;
            border-radius: 2px !important; text-align: center !important;
            box-sizing: border-box !important;
        }
        
        /* Text search input */
        .tabulator-header-filter input[type="search"],
        .tabulator-header-filter input[type="text"] {
            width: 100% !important; padding: 4px 6px !important;
            font-size: 11px !important; border: 1px solid #ccc !important;
            border-radius: 3px !important; box-sizing: border-box !important;
        }
        
        /* =====================================================
           STANDALONE HEADER ALIGNMENT (mobile/tablet)
           ===================================================== */
        @media screen and (max-width: 1024px) {
            .tabulator-header {
                display: flex !important;
                align-items: stretch !important;
            }
            .tabulator-header > .tabulator-headers > .tabulator-col {
                display: flex !important;
                flex-direction: column !important;
                align-items: stretch !important;
            }
            .tabulator-col:not(.tabulator-col-group) > .tabulator-col-content {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                align-items: center !important;
                height: 100% !important;
                padding-top: 8px !important;
            }
            .tabulator-col:not(.tabulator-col-group) .tabulator-col-title {
                text-align: center !important;
                padding-top: 4px !important;
            }
            /* Frozen header — blue theme */
            .tabulator-header .tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
                z-index: 100 !important;
            }
            .tabulator-header .tabulator-col.tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
            }
            .tabulator-header .tabulator-frozen .tabulator-col-title,
            .tabulator-header .tabulator-col.tabulator-frozen .tabulator-col-title {
                color: #ffffff !important;
            }
            .tabulator-header .tabulator-frozen input,
            .tabulator-header .tabulator-col.tabulator-frozen input {
                color: #111 !important;
                background: #ffffff !important;
            }
        }
        
        /* Mobile frozen column constraints */
        @media screen and (max-width: 1024px) {
            .table-container {
                width: 100% !important; max-width: 100vw !important;
                overflow-x: hidden !important;
            }
            .table-container .tabulator {
                width: 100% !important; min-width: 0 !important;
                max-width: 100% !important;
            }
            .table-container .tabulator .tabulator-tableholder {
                overflow-x: auto !important; -webkit-overflow-scrolling: touch !important;
            }
            .tabulator-row .tabulator-cell.tabulator-frozen {
                position: sticky !important;
                left: 0 !important; z-index: 10 !important;
            }
            .tabulator-row.tabulator-row-even .tabulator-cell.tabulator-frozen { background: #fafafa !important; }
            .tabulator-row.tabulator-row-odd .tabulator-cell.tabulator-frozen { background: #ffffff !important; }
            .tabulator-row:hover .tabulator-cell.tabulator-frozen { background: #eff6ff !important; }
            .tabulator-header .tabulator-col.tabulator-frozen {
                position: sticky !important; left: 0 !important; z-index: 101 !important;
            }
        }
        @media screen and (min-width: 1025px) {
            .tabulator .tabulator-tableholder::-webkit-scrollbar {
                display: block !important; width: 16px !important; height: 16px !important;
            }
            .tabulator .tabulator-tableholder::-webkit-scrollbar-track {
                background: #f1f1f1 !important; border-radius: 8px !important;
            }
            .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb {
                background: #888 !important; border-radius: 8px !important;
                border: 2px solid #f1f1f1 !important;
            }
            .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb:hover { background: #666 !important; }
            .tabulator .tabulator-tableholder {
                overflow-y: scroll !important; overflow-x: auto !important;
                scrollbar-width: auto !important;
            }
        }
    `;
    document.head.appendChild(style);
    injectScrollbarFix();
    console.log('NHL full styles injected');
}
