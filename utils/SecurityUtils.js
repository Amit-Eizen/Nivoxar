// SecurityUtils.js - Security and sanitization utilities

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for HTML
 */
export function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Sanitize user input by removing script tags and dangerous attributes
 * @param {string} input - User input to sanitize
 * @returns {string} Sanitized input
 */
export function sanitizeInput(input) {
    if (!input) return '';
    return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+="[^"]*"/g, '')
        .replace(/on\w+='[^']*'/g, '');
}
