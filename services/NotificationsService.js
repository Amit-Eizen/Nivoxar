// NotificationsService.js - Notifications Management
import { apiRequest } from './AuthService.js';
import Logger from '../utils/Logger.js';

// ===== NOTIFICATION TYPES =====
export const NOTIFICATION_TYPES = {
    FRIEND_REQUEST: 'friend_request',
    FRIEND_ACCEPTED: 'friend_accepted',
    TASK_SHARED: 'task_shared',
    TASK_UPDATED: 'task_updated',
    TASK_COMPLETED: 'task_completed',
    COMMENT_ADDED: 'comment_added'
};

// ===== GET ALL NOTIFICATIONS =====
export async function getAllNotifications(unreadOnly = false) {
    try {
        const notifications = await apiRequest(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`, {
            method: 'GET'
        });
        return notifications;
    } catch (error) {
        Logger.error('Error loading notifications:', error);
        return [];
    }
}

// ===== GET UNREAD NOTIFICATIONS =====
export async function getUnreadNotifications() {
    return await getAllNotifications(true);
}

// ===== GET UNREAD COUNT =====
export async function getUnreadCount() {
    try {
        const data = await apiRequest('/notifications/unread/count', {
            method: 'GET'
        });
        return data.count;
    } catch (error) {
        Logger.error('Error getting unread count:', error);
        return 0;
    }
}

// ===== MARK AS READ =====
export async function markAsRead(notificationId) {
    try {
        await apiRequest(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
        Logger.success(' Notification marked as read');
    } catch (error) {
        Logger.error(' Error marking notification as read:', error);
        throw error;
    }
}

// ===== MARK ALL AS READ =====
export async function markAllAsRead() {
    try {
        await apiRequest('/notifications/mark-all-read', {
            method: 'PUT'
        });
        Logger.success(' All notifications marked as read');
    } catch (error) {
        Logger.error(' Error marking all as read:', error);
        throw error;
    }
}

// ===== DELETE NOTIFICATION =====
export async function deleteNotification(notificationId) {
    try {
        await apiRequest(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
        Logger.success(' Notification deleted');
    } catch (error) {
        Logger.error(' Error deleting notification:', error);
        throw error;
    }
}

// ===== CLEAR ALL NOTIFICATIONS =====
export async function clearAllNotifications() {
    try {
        await apiRequest('/notifications/clear-all', {
            method: 'DELETE'
        });
        Logger.success(' All notifications cleared');
    } catch (error) {
        Logger.error(' Error clearing notifications:', error);
        throw error;
    }
}

// ===== HELPER FUNCTIONS FOR CREATING NOTIFICATIONS =====
// Note: Notifications are now created by the backend when actions occur
// These functions are kept for backward compatibility but are deprecated

/**
 * @deprecated Notifications are now created automatically by the backend
 */
export function notifyFriendRequest() {
    Logger.warn('⚠️ notifyFriendRequest() is deprecated - notifications are now created by the backend');
}

/**
 * @deprecated Notifications are now created automatically by the backend
 */
export function notifyFriendAccepted() {
    Logger.warn('⚠️ notifyFriendAccepted() is deprecated - notifications are now created by the backend');
}

/**
 * @deprecated Notifications are now created automatically by the backend
 */
export function notifyTaskShared() {
    Logger.warn('⚠️ notifyTaskShared() is deprecated - notifications are now created by the backend');
}

/**
 * @deprecated Notifications are now created automatically by the backend
 */
export function notifyTaskUpdated() {
    Logger.warn('⚠️ notifyTaskUpdated() is deprecated - notifications are now created by the backend');
}
