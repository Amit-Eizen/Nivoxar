// DateUtils.js - Date formatting utilities

/**
 * Format time ago (e.g., "2 hours ago", "3 days ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted time ago string
 */
export function formatTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const seconds = Math.floor((now - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
        }
    }

    return 'Just now';
}
