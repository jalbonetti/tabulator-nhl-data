// shared/utils.js - Utility Functions for NHL Props Tables

/**
 * Format odds value with +/- prefix
 * @param {number|string} value - Odds value
 * @returns {string} Formatted odds string
 */
export function formatOdds(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseInt(value, 10);
    if (isNaN(num)) return '-';
    return num > 0 ? `+${num}` : `${num}`;
}

/**
 * Debounce function execution
 * @param {function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Default export
export default {
    formatOdds,
    debounce
};
