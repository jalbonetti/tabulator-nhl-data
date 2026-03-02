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
                display: block !important;
                background: #f1f1f1 !important;
                border-radius: 8px !important;
                visibility: visible !important;
            }
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb {
                display: block !important;
                background: #888 !important;
                border-radius: 8px !important;
                border: 2px solid #f1f1f1 !important;
                visibility: visible !important;
                min-height: 40px !important;
            }
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb:hover,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb:hover {
                background: #666 !important;
            }
            html body .tabulator .tabulator-tableholder,
            html body div.tabulator div.tabulator-tableholder {
                scrollbar-width: thin !important;
                scrollbar-color: #888 #f1f1f1 !important;
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
    const webflowStyle = document.querySelector('style[data-table-styles="webflow"]');
    if (webflowStyle && webflowStyle.parentNode) {
        webflowStyle.parentNode.insertBefore(style, webflowStyle.nextSibling);
    } else {
        document.head.appendChild(style);
    }
}

/**
 * MINIMAL STYLES - Pure copy of NBA injectMinimalStyles.
 * NO header colors, NO row colors, NO cell padding.
 * Webflow provides all visual styling.
 * We only add technical layout fixes.
 *
 * FIXES vs previous version:
 * 1) Added header filter input bold/dark text rules
 * 2) Added desktop-level frozen cell background rules (was mobile-only before)
 * 3) Fixed frozen cell colors: #f5f5f5 -> #fafafa, #fff7ed -> #eff6ff
 */
function injectMinimalStyles() {
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
        
        /* Headers: word wrap + center + bold dark text */
        /* Webflow provides bold headers for NBA; NHL needs it explicitly */
        .tabulator-col-title {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            text-align: center !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-weight: 600 !important;
            color: #333 !important;
        }
        
        /* =====================================================
           FIX #1: Header filter inputs — bold dark text
           NBA gets this from Webflow theme; NHL Webflow theme
           does not provide it, so we add it explicitly.
           Webflow's native bold = 700, native dark text = near-black
           ===================================================== */
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
        /* These are <button> elements, not <input>, created by customMultiSelect.js */
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
            box-shadow: 0 -4px 12px rgba(0,0,0,0.15) !important;
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
        }
        
        .min-max-input::-webkit-outer-spin-button,
        .min-max-input::-webkit-inner-spin-button {
            -webkit-appearance: none !important;
            margin: 0 !important;
        }
        
        /* Mobile header alignment */
        @media screen and (max-width: 1024px) {
            .tabulator-header {
                display: flex !important;
                align-items: stretch !important;
            }
            .tabulator-headers {
                display: flex !important;
                align-items: stretch !important;
            }
            .tabulator-headers > .tabulator-col {
                display: flex !important;
                flex-direction: column !important;
            }
            .tabulator-col.standalone-header {
                justify-content: flex-start !important;
            }
            .tabulator-col.standalone-header > .tabulator-col-content {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                align-items: center !important;
                height: 100% !important;
                padding-top: 6px !important;
            }
            .tabulator-col:not(.tabulator-col-group) .tabulator-col-title {
                text-align: center !important;
                padding-top: 4px !important;
            }
            .tabulator-header .tabulator-col.tabulator-frozen {
                z-index: 100 !important;
            }
        }
        
        /* Base overflow for tableholder */
        .tabulator .tabulator-tableholder {
            overflow-y: auto !important;
            overflow-x: auto !important;
        }
        
        /* =====================================================
           FIX #2: Frozen cell backgrounds — ALL screen sizes
           Matches NBA pattern exactly: explicit white base,
           :nth-child(even) for alternating, :hover for highlight.
           NO background:inherit — that inherits from ROW which has
           no background (Webflow sets colors on CELLS not ROWS).
           Uses .tabulator-frozen (not .tabulator-cell.tabulator-frozen)
           matching the selector pattern that works in NBA.
           ===================================================== */
        .tabulator-frozen {
            z-index: 11 !important;
        }
        .tabulator-frozen.tabulator-frozen-left {
            border-right: 2px solid rgba(30, 64, 175, 0.4) !important;
            box-shadow: 2px 0 4px rgba(0,0,0,0.08) !important;
        }
        .tabulator-header .tabulator-frozen {
            z-index: 100 !important;
        }
        .tabulator-row .tabulator-frozen {
            background-color: white !important;
        }
        .tabulator-row:nth-child(even) .tabulator-frozen {
            background-color: #f5f5f5 !important;
        }
        .tabulator-row:hover .tabulator-frozen {
            background-color: #eff6ff !important;
        }
        
        /* Desktop: grey background fills empty space */
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
            .tabulator-row .tabulator-cell.tabulator-frozen {
                position: sticky !important;
                left: 0 !important;
                z-index: 10 !important;
                background-color: white !important;
            }
            .tabulator-row:nth-child(even) .tabulator-cell.tabulator-frozen {
                background-color: #f5f5f5 !important;
            }
            .tabulator-row:hover .tabulator-cell.tabulator-frozen {
                background-color: #eff6ff !important;
            }
            .tabulator-header .tabulator-col.tabulator-frozen {
                position: sticky !important;
                left: 0 !important;
                z-index: 101 !important;
            }
        }
    `;
    document.head.appendChild(style);
    console.log('NHL minimal styles injected (with header filter bold text, fixed frozen colors, desktop frozen rules)');
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
        .tabulator-col .tabulator-col-sorter .tabulator-arrow {
            border-bottom-color: rgba(255,255,255,0.7) !important;
        }
        .tabulator-col-group-cols {
            border-top: 1px solid rgba(255,255,255,0.3);
        }
        .tabulator-row {
            border-bottom: 1px solid #e8e8e8;
            min-height: 32px;
        }
        .tabulator-row:nth-child(even) {
            background-color: #fafafa;
        }
        .tabulator-row:hover {
            background-color: #eff6ff;
        }
        .tabulator-cell {
            padding: 6px 4px;
            border-right: 1px solid #f0f0f0;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        /* Header filter inputs: bold dark text */
        .tabulator-header-filter input[type="search"],
        .tabulator-header-filter input[type="text"],
        .tabulator-header-filter input[type="number"],
        .tabulator-header-filter input {
            font-weight: 700 !important;
            color: #111 !important;
        }
        .min-max-input,
        .min-max-filter-container input {
            font-weight: 700 !important;
            color: #111 !important;
        }
        .bankroll-input,
        .bankroll-input-field,
        .bankroll-input-container input {
            font-weight: 700 !important;
            color: #111 !important;
        }
        .custom-multiselect-button,
        .tabulator-header-filter .custom-multiselect-button,
        .tabulator-header-filter button {
            font-weight: 700 !important;
            color: #111 !important;
        }
        .tabulator-frozen.tabulator-frozen-left {
            border-right: 2px solid rgba(30, 64, 175, 0.4) !important;
            box-shadow: 2px 0 4px rgba(0,0,0,0.08) !important;
        }
        .tabulator-header .tabulator-frozen {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
            z-index: 100 !important;
        }
        /* Frozen cell backgrounds - explicit white base, no inherit */
        .tabulator-row .tabulator-frozen { background-color: white !important; }
        .tabulator-row:nth-child(even) .tabulator-frozen { background-color: #f5f5f5 !important; }
        .tabulator-row:hover .tabulator-frozen { background-color: #eff6ff !important; }
        .min-max-filter-container, .tabulator .min-max-filter-container,
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
            -moz-appearance: textfield !important;
        }
        .min-max-input::-webkit-outer-spin-button,
        .min-max-input::-webkit-inner-spin-button {
            -webkit-appearance: none !important; margin: 0 !important;
        }
        .min-max-input:focus {
            outline: none !important; border-color: #1e40af !important;
            box-shadow: 0 0 0 1px rgba(30, 64, 175, 0.2) !important;
        }
        .custom-multiselect-dropdown, [id^="dropdown_"] {
            z-index: 2147483647 !important;
            position: fixed !important;
            background: white !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.15) !important;
        }
        @media screen and (max-width: 1024px) {
            .tabulator-header { display: flex !important; align-items: stretch !important; }
            .tabulator-headers { display: flex !important; align-items: stretch !important; }
            .tabulator-headers > .tabulator-col { display: flex !important; flex-direction: column !important; }
            .tabulator-col.standalone-header { justify-content: flex-start !important; }
            .tabulator-col.standalone-header > .tabulator-col-content {
                display: flex !important; flex-direction: column !important;
                justify-content: flex-start !important; align-items: center !important;
                height: 100% !important; padding-top: 6px !important;
            }
            .tabulator-col:not(.tabulator-col-group) .tabulator-col-title {
                text-align: center !important; padding-top: 4px !important;
            }
            .tabulator-header .tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
                z-index: 100 !important;
            }
        }
        .tabulator .tabulator-tableholder {
            overflow-y: auto !important; overflow-x: auto !important;
        }
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
                background-color: white !important; position: sticky !important;
                left: 0 !important; z-index: 10 !important;
            }
            .tabulator-row:nth-child(even) .tabulator-cell.tabulator-frozen { background-color: #f5f5f5 !important; }
            .tabulator-row:hover .tabulator-cell.tabulator-frozen { background-color: #eff6ff !important; }
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
