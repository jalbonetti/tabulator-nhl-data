// styles/tableStyles.js - NHL Table Styles
// Blue theme: #1e40af (primary), #1e3a8a (darker), #eff6ff (hover), #dbeafe (alt)
// Includes: grey background, min/max stacking, frozen columns, scrollbar fix,
//   standalone header alignment, mobile frozen column support

import { isMobile, isTablet, getDeviceScale } from '../shared/config.js';

export function injectStyles() {
    // Check if Webflow custom styles are already applied
    if (document.querySelector('style[data-table-styles="webflow"]')) {
        console.log('Using Webflow custom styles, applying minimal overrides only');
        injectMinimalStyles();
        injectScrollbarFix();
        return;
    }

    // Full style injection for non-Webflow environments
    injectFullStyles();
}

function injectScrollbarFix() {
    if (document.querySelector('#nhl-scrollbar-fix')) return;
    
    const scrollbarStyle = document.createElement('style');
    scrollbarStyle.id = 'nhl-scrollbar-fix';
    scrollbarStyle.textContent = `
        /* =====================================================
           SCROLLBAR FIX - Counters Webflow's aggressive hiding
           ===================================================== */
        
        /* Desktop only - show scrollbar */
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
                visibility: visible !important;
            }
            
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb {
                background: #888 !important;
                border-radius: 8px !important;
                border: 2px solid #f1f1f1 !important;
                visibility: visible !important;
            }
            
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb:hover,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb:hover {
                background: #555 !important;
                visibility: visible !important;
            }
        }
    `;
    
    // Insert AFTER any Webflow styles
    const webflowStyle = document.querySelector('style[data-table-styles="webflow"]');
    if (webflowStyle && webflowStyle.nextSibling) {
        webflowStyle.parentNode.insertBefore(scrollbarStyle, webflowStyle.nextSibling);
    } else {
        document.head.appendChild(scrollbarStyle);
    }
}

function injectMinimalStyles() {
    if (document.querySelector('style[data-source="nhl-minimal"]')) return;
    
    const style = document.createElement('style');
    style.setAttribute('data-source', 'nhl-minimal');
    style.textContent = `
        /* Ensure table and containers are visible */
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
        
        /* HEADERS: Allow word wrapping, center-justified */
        .tabulator-col-title {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            text-align: center !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        /* DATA CELLS: Single-line with ellipsis */
        .tabulator-cell {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        
        /* DROPDOWNS: Position ABOVE the table */
        .custom-multiselect-dropdown,
        [id^="dropdown_"] {
            z-index: 2147483647 !important;
            position: fixed !important;
            background: white !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.15) !important;
        }
        
        /* Header filter inputs */
        .tabulator-header-filter input {
            background: white !important;
            border: 1px solid #ccc !important;
            font-size: 11px !important;
            padding: 3px 5px !important;
        }
        
        /* Min/Max filter stacking */
        .min-max-filter-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
        }
        
        /* Frozen column shadows */
        .tabulator-frozen {
            z-index: 11 !important;
        }
        .tabulator-frozen.tabulator-frozen-right {
            border-left: 2px solid #ddd !important;
        }
        .tabulator-frozen.tabulator-frozen-left {
            border-right: 2px solid #ddd !important;
        }
    `;
    document.head.appendChild(style);
}

function injectFullStyles() {
    if (document.querySelector('style[data-source="nhl-full"]')) return;
    
    const mobile = isMobile();
    const tablet = isTablet();
    const baseFontSize = mobile ? 10 : tablet ? 11 : 12;
    
    const style = document.createElement('style');
    style.setAttribute('data-source', 'nhl-full');
    style.setAttribute('data-table-styles', 'github');
    style.textContent = `
        /* ===================================
           NHL TABLE STYLES - Blue Theme
           =================================== */
        
        /* GLOBAL FONT SIZE - Responsive */
        .tabulator,
        .tabulator *,
        .tabulator-table,
        .tabulator-table *,
        .tabulator-header,
        .tabulator-header *,
        .tabulator-row,
        .tabulator-row *,
        .tabulator-cell,
        .tabulator-cell * {
            font-size: ${baseFontSize}px !important;
            line-height: 1.3 !important;
        }
        
        /* Base table container styles - grey background for empty space */
        .table-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            position: relative;
            background: #e8e8e8;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: visible;
        }
        
        /* Table wrapper - grey background */
        .table-wrapper {
            background: #e8e8e8;
        }
        
        /* Tabulator base styles - grey background */
        .tabulator {
            font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
            font-size: ${baseFontSize}px !important;
            line-height: 1.3 !important;
            background-color: #e8e8e8;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            overflow: visible !important;
        }
        
        /* Tableholder - grey background fills empty space */
        .tabulator .tabulator-tableholder {
            background-color: #e8e8e8;
        }
        
        /* Header styles - blue gradient */
        .tabulator-header {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%);
            color: white;
            font-weight: 600;
        }
        
        .tabulator-col {
            background: transparent;
            border-right: 1px solid rgba(255,255,255,0.2);
        }
        
        /* Header title - wrap at word boundaries, CENTER-JUSTIFIED */
        .tabulator-col-title {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            text-align: center !important;
            color: white;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        
        /* Sort arrow styles */
        .tabulator-col .tabulator-col-sorter .tabulator-arrow {
            border-bottom-color: rgba(255,255,255,0.6) !important;
        }
        
        .tabulator-col[aria-sort="ascending"] .tabulator-col-sorter .tabulator-arrow {
            border-bottom-color: white !important;
        }
        
        .tabulator-col[aria-sort="descending"] .tabulator-col-sorter .tabulator-arrow {
            border-top-color: white !important;
        }
        
        /* Header filter styles */
        .tabulator-header-filter {
            margin-top: 3px;
        }
        
        .tabulator-header-filter input {
            background: rgba(255,255,255,0.95) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
            border-radius: 3px;
            padding: 3px 5px !important;
            font-size: ${Math.max(baseFontSize - 1, 9)}px !important;
            color: #333 !important;
        }
        
        .tabulator-header-filter input:focus {
            background: white !important;
            border-color: #60a5fa !important;
            box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3) !important;
        }
        
        /* Row styles */
        .tabulator-row {
            background-color: white;
            border-bottom: 1px solid #f0f0f0;
            min-height: 32px;
        }
        
        .tabulator-row:nth-child(even) {
            background-color: #fafafa;
        }
        
        .tabulator-row:hover {
            background-color: #eff6ff !important;
        }
        
        /* Cell styles */
        .tabulator-cell {
            padding: 4px 8px !important;
            border-right: 1px solid #f0f0f0;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        
        /* Frozen column styles */
        .tabulator-frozen {
            z-index: 11 !important;
        }
        
        .tabulator-row .tabulator-frozen {
            background-color: inherit !important;
        }
        
        .tabulator-row:nth-child(even) .tabulator-frozen {
            background-color: #fafafa !important;
        }
        
        .tabulator-row:hover .tabulator-frozen {
            background-color: #eff6ff !important;
        }
        
        /* Frozen column separator line */
        .tabulator-frozen.tabulator-frozen-left {
            border-right: 2px solid #cbd5e1 !important;
        }
        
        /* Custom multiselect button in header */
        .custom-multiselect-button {
            background: rgba(255,255,255,0.95) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
            color: #333 !important;
            font-size: ${Math.max(baseFontSize - 1, 9)}px !important;
        }
        
        /* Dropdown styles - above table */
        .custom-multiselect-dropdown,
        [id^="dropdown_"] {
            z-index: 2147483647 !important;
            position: fixed !important;
            background: white !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.15) !important;
        }
        
        /* Min/Max filter stacking for narrow columns */
        .min-max-filter-container {
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
        }
        
        /* Loading indicator */
        .loading-indicator {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 14px;
        }
        
        /* Mobile/Tablet adjustments */
        @media screen and (max-width: 1024px) {
            .tabulator {
                width: 100% !important;
            }
            
            .tabulator-cell {
                padding: 3px 4px !important;
            }
            
            .tabulator-frozen.tabulator-frozen-left {
                box-shadow: 2px 0 4px rgba(0,0,0,0.1) !important;
            }
        }
        
        /* Desktop scrollbar visibility */
        @media screen and (min-width: 1025px) {
            .tabulator .tabulator-tableholder::-webkit-scrollbar {
                display: block !important;
                width: 16px !important;
                height: 16px !important;
            }
            
            .tabulator .tabulator-tableholder::-webkit-scrollbar-track {
                background: #f1f1f1 !important;
                border-radius: 8px !important;
            }
            
            .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb {
                background: #888 !important;
                border-radius: 8px !important;
                border: 2px solid #f1f1f1 !important;
            }
            
            .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb:hover {
                background: #555 !important;
            }
            
            .tabulator .tabulator-tableholder {
                overflow: auto !important;
                scrollbar-width: auto !important;
                -ms-overflow-style: auto !important;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Also inject scrollbar fix for Webflow
    injectScrollbarFix();
}
