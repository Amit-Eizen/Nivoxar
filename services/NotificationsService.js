// NotificationsService.js - Notifications Management
import { STORAGE_KEYS } from '../utils/StorageKeys.js';
import { getCurrentUser } from './AuthService.js';

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
export function getAllNotifications() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return [];

        const notifications = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]';
        const allNotifications = JSON.parse(notifications);

        // Return notifications for current user, sorted by newest first
        return allNotifications
            .filter(n => n.userId === currentUser.id)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
        console.error('Error loading notifications:', error);
        return [];
    }
}

// ===== GET UNREAD NOTIFICATIONS =====
export function getUnreadNotifications() {
    return getAllNotifications().filter(n => !n.read);
}

// ===== GET UNREAD COUNT =====
export function getUnreadCount() {
    return getUnreadNotifications().length;
}

// ===== CREATE NOTIFICATION =====
export function createNotification(notification) {
    try {
        const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');

        const newNotification = {
            id: Date.now(),
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data || {},
            read: false,
            createdAt: new Date().toISOString()
        };

        notifications.push(newNotification);
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));

        console.log('✅ Notification created:', newNotification);
        return newNotification;
    } catch (error) {
        console.error('❌ Error creating notification:', error);
        throw error;
    }
}

// ===== MARK AS READ =====
export function markAsRead(notificationId) {
    try {
        const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
        const notification = notifications.find(n => n.id === notificationId);

        if (notification) {
            notification.read = true;
            localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
            console.log('✅ Notification marked as read');
            return notification;
        }
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        throw error;
    }
}

// ===== MARK ALL AS READ =====
export function markAllAsRead() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');

        notifications.forEach(n => {
            if (n.userId === currentUser.id) {
                n.read = true;
            }
        });

        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
        console.log('✅ All notifications marked as read');
    } catch (error) {
        console.error('❌ Error marking all as read:', error);
        throw error;
    }
}

// ===== DELETE NOTIFICATION =====
export function deleteNotification(notificationId) {
    try {
        const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
        const updatedNotifications = notifications.filter(n => n.id !== notificationId);

        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updatedNotifications));
        console.log('✅ Notification deleted');
        return true;
    } catch (error) {
        console.error('❌ Error deleting notification:', error);
        throw error;
    }
}

// ===== CLEAR ALL NOTIFICATIONS =====
export function clearAllNotifications() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return;

        const notifications = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS) || '[]');
        const updatedNotifications = notifications.filter(n => n.userId !== currentUser.id);

        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(updatedNotifications));
        console.log('✅ All notifications cleared');
    } catch (error) {
        console.error('❌ Error clearing notifications:', error);
        throw error;
    }
}

// ===== HELPER: CREATE FRIEND REQUEST NOTIFICATION =====
export function notifyFriendRequest(targetUserId, fromUsername) {
    return createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.FRIEND_REQUEST,
        title: 'New Friend Request',
        message: `${fromUsername} sent you a friend request`,
        data: { fromUsername }
    });
}

// ===== HELPER: CREATE FRIEND ACCEPTED NOTIFICATION =====
export function notifyFriendAccepted(targetUserId, acceptedByUsername) {
    return createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.FRIEND_ACCEPTED,
        title: 'Friend Request Accepted',
        message: `${acceptedByUsername} accepted your friend request`,
        data: { acceptedByUsername }
    });
}

// ===== HELPER: CREATE TASK SHARED NOTIFICATION =====
export function notifyTaskShared(targetUserId, taskTitle, sharedByUsername) {
    return createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.TASK_SHARED,
        title: 'Task Shared With You',
        message: `${sharedByUsername} shared a task "${taskTitle}" with you`,
        data: { taskTitle, sharedByUsername }
    });
}

// ===== HELPER: CREATE TASK UPDATED NOTIFICATION =====
export function notifyTaskUpdated(targetUserId, taskTitle, updatedByUsername) {
    return createNotification({
        userId: targetUserId,
        type: NOTIFICATION_TYPES.TASK_UPDATED,
        title: 'Shared Task Updated',
        message: `${updatedByUsername} updated task "${taskTitle}"`,
        data: { taskTitle, updatedByUsername }
    });
}
