// NotificationUtils.js - Notification display utilities

/**
 * Get notification icon based on type
 * @param {string} type - Notification type
 * @returns {string} Icon HTML
 */
export function getNotificationIcon(type) {
    const icons = {
        'task_assigned': '📋',
        'task_completed': '✅',
        'task_overdue': '⚠️',
        'friend_request': '👤',
        'friend_accepted': '🤝',
        'shared_task': '📤',
        'comment': '💬',
        'reminder': '🔔'
    };
    return icons[type] || '🔔';
}

/**
 * Get notification icon class based on type
 * @param {string} type - Notification type
 * @returns {string} CSS class name
 */
export function getNotificationIconClass(type) {
    const classes = {
        'task_assigned': 'notification-task',
        'task_completed': 'notification-success',
        'task_overdue': 'notification-warning',
        'friend_request': 'notification-friend',
        'friend_accepted': 'notification-success',
        'shared_task': 'notification-share',
        'comment': 'notification-comment',
        'reminder': 'notification-reminder'
    };
    return classes[type] || 'notification-default';
}
