// shared/config.js - NHL Props Configuration

export const CONFIG = {
    // Supabase Configuration (same instance as NBA/CBB)
    SUPABASE_URL: 'https://hcwolbvmffkmjcxsumwn.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhjd29sYnZtZmZrbWpjeHN1bXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNDQzMTIsImV4cCI6MjA1NTkyMDMxMn0.tM4RwXZpZM6ZHuFFMhWcKYLT3E4NA6Ig90CHw7QtJf0',
    
    // Cache Configuration
    CACHE_ENABLED: true,
    CACHE_TTL: 5 * 60 * 1000, // 5 minutes in milliseconds
    
    // Responsive Breakpoints
    BREAKPOINTS: {
        mobile: 768,
        tablet: 1024,
        desktop: 1025
    }
};

// API Configuration - exported separately for direct use
export const API_CONFIG = {
    baseURL: "https://hcwolbvmffkmjcxsumwn.supabase.co/rest/v1/",
    headers: {
        "apikey": CONFIG.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + CONFIG.SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation,count=exact",
        "Accept": "application/json",
        "Accept-Profile": "public",
        "Cache-Control": "public, max-age=300"
    },
    fetchConfig: {
        pageSize: 1000,
        maxRetries: 3,
        retryDelay: 1000,
    }
};

// Responsive helper functions
export function isMobile() {
    return window.innerWidth <= CONFIG.BREAKPOINTS.mobile;
}

export function isTablet() {
    return window.innerWidth > CONFIG.BREAKPOINTS.mobile && window.innerWidth <= CONFIG.BREAKPOINTS.tablet;
}

export function getDeviceType() {
    if (isMobile()) return 'mobile';
    if (isTablet()) return 'tablet';
    return 'desktop';
}

export function getDeviceScale() {
    return window.devicePixelRatio || 1;
}
