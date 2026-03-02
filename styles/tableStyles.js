// styles/tableStyles.js - NHL Table Styles
// DIRECT COPY of NBA basketball tableStyles.js with color changes:
//   #f97316 -> #1e40af (blue primary)
//   #ea580c -> #1e3a8a (blue darker)
//   #fff7ed -> #eff6ff (light blue hover)
//   #ffedd5 -> #dbeafe (light blue alt)
// Includes: grey background, min/max stacking, frozen columns, scrollbar fix,
//   standalone header alignment, mobile frozen column support

import { isMobile, isTablet, getDeviceScale } from '../shared/config.js';

export function injectStyles() {
    if (document.querySelector('style[data-table-styles="webflow"]')) {
        console.log('Using Webflow custom styles, applying minimal overrides only');
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
                background: #1e40af !important;
                border-radius: 8px !important;
                border: 2px solid #f1f1f1 !important;
                visibility: visible !important;
                min-height: 40px !important;
            }
            html body .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb:hover,
            html body div.tabulator div.tabulator-tableholder::-webkit-scrollbar-thumb:hover {
                background: #1e3a8a !important;
            }
            html body .tabulator .tabulator-tableholder,
            html body div.tabulator div.tabulator-tableholder {
                scrollbar-width: thin !important;
                scrollbar-color: #1e40af #f1f1f1 !important;
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

function injectMinimalStyles() {
    const style = document.createElement('style');
    style.setAttribute('data-source', 'github-nhl-minimal');
    style.textContent = `
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
        .tabulator-col-title {
            white-space: normal !important;
            word-break: break-word !important;
            overflow-wrap: break-word !important;
            text-align: center !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }
        .tabulator-cell {
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        .custom-multiselect-dropdown,
        [id^="dropdown_"] {
            z-index: 2147483647 !important;
            position: fixed !important;
            background: white !important;
            border: 1px solid #333 !important;
            border-radius: 4px !important;
            box-shadow: 0 -4px 12px rgba(0,0,0,0.15) !important;
        }
        .tabulator-header-filter input {
            background: white !important;
            border: 1px solid #ccc !important;
            font-size: 11px !important;
            padding: 3px 5px !important;
        }
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
        .tabulator-frozen {
            z-index: 11 !important;
        }
        .tabulator-frozen.tabulator-frozen-left {
            border-right: 1px solid rgba(30, 64, 175, 0.4) !important;
            box-shadow: 1px 0 3px rgba(0,0,0,0.05) !important;
        }
        .tabulator-header .tabulator-frozen {
            background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
            z-index: 100 !important;
        }
        .tabulator-row .tabulator-frozen {
            background: inherit !important;
        }
        .tabulator-row:nth-child(even) .tabulator-frozen {
            background: #fafafa !important;
        }
        .tabulator-row:hover .tabulator-frozen {
            background: #eff6ff !important;
        }
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
            .tabulator-col.standalone-header .tabulator-col-title-holder {
                display: flex !important;
                flex-direction: column !important;
                justify-content: flex-start !important;
                flex-grow: 0 !important;
            }
            .tabulator-col.standalone-header .tabulator-header-filter {
                margin-top: auto !important;
            }
            .tabulator-col:not(.tabulator-col-group) .tabulator-col-title {
                text-align: center !important;
                padding-top: 4px !important;
            }
            .tabulator-header .tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
                z-index: 100 !important;
            }
            .tabulator-header .tabulator-col.tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
            }
        }
        .tabulator .tabulator-tableholder {
            overflow-y: auto !important;
            overflow-x: auto !important;
        }
        @media screen and (min-width: 1025px) {
            .table-container {
                background: #e8e8e8 !important;
            }
            .tabulator {
                background: #e8e8e8 !important;
            }
            .tabulator .tabulator-tableholder {
                background: #e8e8e8 !important;
            }
        }
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
                background: inherit !important;
                position: sticky !important;
                left: 0 !important;
                z-index: 10 !important;
            }
            .tabulator-row.tabulator-row-even .tabulator-cell.tabulator-frozen {
                background: #fafafa !important;
            }
            .tabulator-row.tabulator-row-odd .tabulator-cell.tabulator-frozen {
                background: #ffffff !important;
            }
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
    console.log('NHL minimal styles injected');
}

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
            display: flex !important; align-items: center !important;
            justify-content: center !important; padding: 4px 2px !important;
        }
        .tabulator-col .tabulator-col-sorter .tabulator-arrow {
            border-bottom-color: rgba(255,255,255,0.6) !important;
        }
        .tabulator-col[aria-sort="ascending"] .tabulator-col-sorter .tabulator-arrow {
            border-bottom-color: white !important;
        }
        .tabulator-col[aria-sort="descending"] .tabulator-col-sorter .tabulator-arrow {
            border-top-color: white !important;
        }
        .tabulator-header-filter { margin-top: 3px; }
        .tabulator-header-filter input {
            background: rgba(255,255,255,0.95) !important;
            border: 1px solid rgba(255,255,255,0.3) !important;
            border-radius: 3px; padding: 3px 5px !important;
            font-size: ${Math.max(baseFontSize - 1, 9)}px !important;
            color: #333 !important;
        }
        .tabulator-header-filter input:focus {
            background: white !important; border-color: #60a5fa !important;
            box-shadow: 0 0 0 2px rgba(96, 165, 250, 0.3) !important;
        }
        .tabulator-row {
            background-color: white; border-bottom: 1px solid #f0f0f0; min-height: 32px;
        }
        .tabulator-row:nth-child(even) { background-color: #fafafa; }
        .tabulator-row:hover { background-color: #eff6ff !important; }
        .tabulator-cell {
            padding: 4px 8px !important; border-right: 1px solid #f0f0f0;
            white-space: nowrap !important; overflow: hidden !important;
            text-overflow: ellipsis !important;
        }
        .custom-multiselect-button {
            background: white; cursor: pointer; font-size: 11px !important;
            text-align: center; white-space: nowrap; overflow: hidden;
            text-overflow: ellipsis; border-radius: 3px;
        }
        .custom-multiselect-button:hover { border-color: #1e40af; }
        .custom-multiselect-button:focus {
            outline: none; border-color: #1e40af;
            box-shadow: 0 0 0 2px rgba(30, 64, 175, 0.2);
        }
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
        .tabulator-row .tabulator-frozen { background: inherit !important; }
        .tabulator-row:nth-child(even) .tabulator-frozen { background: #fafafa !important; }
        .tabulator-row:hover .tabulator-frozen { background: #eff6ff !important; }
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
            z-index: 2147483647 !important; position: fixed !important;
            background: white !important; border: 1px solid #333 !important;
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
            .tabulator-header .tabulator-col.tabulator-frozen {
                background: linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%) !important;
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
                background: inherit !important; position: sticky !important;
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
                background: #1e40af !important; border-radius: 8px !important;
                border: 2px solid #f1f1f1 !important;
            }
            .tabulator .tabulator-tableholder::-webkit-scrollbar-thumb:hover { background: #1e3a8a !important; }
            .tabulator .tabulator-tableholder {
                overflow: auto !important; scrollbar-width: auto !important;
            }
        }
    `;
    document.head.appendChild(style);
    injectScrollbarFix();
    console.log('NHL full styles injected');
}
