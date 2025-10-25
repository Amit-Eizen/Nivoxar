// DashboardPage.js
import { initTaskManager, renderTasks, updateStats } from './managers/TaskManager.js';
import { initSubTasksManager } from './managers/SubTasksManager.js';
import { initializePopups } from './managers/PopupFactory.js';
import { setupAllEventListeners } from './managers/EventHandlers.js';
import { initNavbar } from './components/Navbar.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';
import { getAllNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/NotificationsService.js';

export const dashboardState = {
    tasks: [],
    filteredTasks: [],
    currentCategory: 'all',
    currentPage: 1,
    tasksPerPage: 10,
    totalPages: 1,
    user: {
        name: 'Guest User',
        email: 'guest@nivoxar.com'
    },
    tempSubTasks: []
};

function initializeDashboard() {
    console.log('🚀 Initializing Dashboard...');

    // Check authentication
    const currentUser = requireAuth();
    if (!currentUser) return;

    initNavbar();
    initNotificationsPopup();

    // Read category filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('categoryFilter');

    if (categoryFilter) {
        console.log('📌 Category filter detected:', categoryFilter);
        dashboardState.currentCategory = categoryFilter;
    }

    hideInitialElements();
    showLoading();
    
    loadUserData();
    initTaskManager(); // Loads from localStorage
    initSubTasksManager();
    setupAllEventListeners();
    
    setTimeout(() => {
        initializePopups();
        hideLoading();
        updateDashboard();
        
        // Show filter notification if category is filtered
        if (categoryFilter) {
            showCategoryFilterNotification(categoryFilter);
        }
        
        console.log('✅ Dashboard initialized!');
    }, 500);
}

function loadUserData() {
    // Use AuthMiddleware - user is already checked in initializeDashboard
    const currentUser = requireAuth();
    if (currentUser) {
        dashboardState.user.name = currentUser.username || currentUser.name || currentUser.email;
        dashboardState.user.email = currentUser.email;
    }
}

function hideInitialElements() {
    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('errorMessage').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('paginationControls').style.display = 'none';
}

function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

export function updateDashboard() {
    updateStats();
    renderTasks();
    updateDashboardSubtitle();
}

function updateDashboardSubtitle() {
    const subtitle = document.getElementById('dashboardSubtitle');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    
    const messages = ['Ready to be productive?', 'Let\'s get things done!', 'You\'ve got this!'];
    const message = messages[Math.floor(Math.random() * messages.length)];
    
    subtitle.innerHTML = `${greeting}, <strong>${dashboardState.user.name}</strong>! <span class="status-indicator">${message}</span>`;
}

function showCategoryFilterNotification(categoryId) {
    // Import getCategoryName from TaskUtils
    import('./utils/TaskUtils.js').then(module => {
        const categoryName = module.getCategoryName(categoryId);
        
        // Create notification element
        const notification = document.createElement('div');
        notification.className = 'category-filter-notification';
        notification.innerHTML = `
            <div class="filter-message">
                <i class="fas fa-filter"></i>
                <span>Showing tasks from: <strong>${categoryName}</strong></span>
            </div>
            <button class="clear-filter-btn" onclick="window.location.href='/views/DashboardPage.html'">
                <i class="fas fa-times"></i> Clear Filter
            </button>
        `;
        
        // Insert notification at the top of the dashboard
        const container = document.querySelector('.dashboard-container');
        const header = document.querySelector('.dashboard-header');
        if (container && header) {
            container.insertBefore(notification, header.nextSibling);
        }
    });
}

// ===== NOTIFICATIONS POPUP =====

function initNotificationsPopup() {
    // Create popup element
    const popup = document.createElement('div');
    popup.id = 'notificationsPopup';
    popup.className = 'notifications-popup';
    popup.style.display = 'none';
    popup.innerHTML = `
        <div class="notifications-popup-header">
            <h3><i class="fas fa-bell"></i> Notifications</h3>
            <button class="btn-text" id="markAllReadBtn">Mark all as read</button>
        </div>
        <div class="notifications-popup-body" id="notificationsPopupList">
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>
        </div>
    `;

    // Add to body
    document.body.appendChild(popup);

    const notificationBtn = document.getElementById('notificationBtn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    if (!notificationBtn) return;

    // Load and update notification count
    updateNotificationCount();

    // Toggle popup
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = popup.style.display === 'block';
        popup.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            loadNotificationsPopup();
        }
    });

    // Mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            markAllAsRead();
            loadNotificationsPopup();
            updateNotificationCount();
        });
    }

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (!popup.contains(e.target) && !notificationBtn.contains(e.target)) {
            popup.style.display = 'none';
        }
    });
}

function loadNotificationsPopup() {
    const container = document.getElementById('notificationsPopupList');
    const notifications = getAllNotifications();

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-bell-slash"></i>
                <p>No new notifications</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}" onclick="window.dashboardNotifications.handleNotificationClick(${notification.id})">
            <div class="notification-icon ${getNotificationIconClass(notification.type)}">
                <i class="${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <strong>${notification.title}</strong>
                <p>${notification.message}</p>
                <span class="notification-time">${formatTimeAgo(notification.createdAt)}</span>
            </div>
        </div>
    `).join('');
}

function updateNotificationCount() {
    const badge = document.getElementById('dashboardNotificationCount');
    const unreadCount = getUnreadCount();

    if (badge) {
        badge.textContent = unreadCount > 0 ? unreadCount : '0';
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

function handleNotificationClick(notificationId) {
    markAsRead(notificationId);
    loadNotificationsPopup();
    updateNotificationCount();
}

function getNotificationIconClass(type) {
    if (type.includes('friend')) return 'friend-request';
    if (type.includes('task')) return 'task-share';
    return 'task-share';
}

function getNotificationIcon(type) {
    const icons = {
        'friend_request': 'fas fa-user-plus',
        'friend_accepted': 'fas fa-user-check',
        'task_shared': 'fas fa-share-nodes',
        'task_updated': 'fas fa-pen-to-square',
        'task_completed': 'fas fa-check-circle',
        'comment_added': 'fas fa-comment'
    };
    return icons[type] || 'fas fa-bell';
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return date.toLocaleDateString();
}

// Expose functions to window
window.dashboardNotifications = {
    handleNotificationClick
};

document.addEventListener('DOMContentLoaded', initializeDashboard);