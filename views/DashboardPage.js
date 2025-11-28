// DashboardPage.js
import { initTaskManager, renderTasks, updateStats } from '../scripts/managers/TaskManager.js';
import Logger from '../utils/Logger.js';
import { initSubTasksManager } from '../scripts/managers/SubTasksManager.js';
import { initializePopups } from '../scripts/managers/PopupFactory.js';
import { setupAllEventListeners } from '../scripts/managers/EventHandlers.js';
import { initNavbar } from '../scripts/components/Navbar.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';
import { getAllNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/NotificationsService.js';
import { getAllCategories } from '../services/CategoryService.js';
import { filterByCategory } from '../services/FilterService.js';
import { router } from '../scripts/core/Router.js';

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

async function initializeDashboard() {
    Logger.debug('🚀 Initializing Dashboard...');

    // Check authentication
    const currentUser = requireAuth();
    if (!currentUser) return;

    // Only init navbar in MPA mode (SPA mode handles navbar globally)
    if (!window.__SPA_MODE__) {
        initNavbar();
    }
    initNotificationsPopup();

    // Read category filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const categoryFilter = urlParams.get('categoryFilter');

    if (categoryFilter) {
        Logger.debug('📌 Category filter detected:', categoryFilter);
        dashboardState.currentCategory = categoryFilter;
    }

    hideInitialElements();
    showLoading();

    // Load categories cache first (so getAllCategoriesSync() works)
    await getAllCategories();

    loadUserData();
    await initTaskManager(); // Loads from API
    initSubTasksManager();
    setupAllEventListeners();

    // Listen for category updates for real-time UI refresh
    setupCategoryUpdateListener();

    setTimeout(() => {
        initializePopups();
        hideLoading();

        // Apply category filter if specified in URL
        if (categoryFilter) {
            Logger.debug('📌 Applying category filter:', categoryFilter);
            dashboardState.currentCategory = categoryFilter;
            dashboardState.filteredTasks = filterByCategory(dashboardState.tasks, categoryFilter);
            showCategoryFilterNotification(categoryFilter);
        }

        updateDashboard();

        Logger.success(' Dashboard initialized!');
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
    updateSectionTitle();
}

function updateDashboardSubtitle() {
    const subtitle = document.getElementById('dashboardSubtitle');
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

    const messages = ['Ready to be productive?', 'Let\'s get things done!', 'You\'ve got this!'];
    const message = messages[Math.floor(Math.random() * messages.length)];

    subtitle.innerHTML = `${greeting}, <strong>${dashboardState.user.name}</strong>! <span class="status-indicator">${message}</span>`;
}

function updateSectionTitle() {
    const sectionTitle = document.querySelector('.section-title');
    if (!sectionTitle) return;

    // If no filter is active, reset to default
    if (!dashboardState.currentCategory || dashboardState.currentCategory === 'all') {
        sectionTitle.innerHTML = '<i class="fas fa-list"></i> Your Tasks';

        // Remove Clear Filter button if exists
        const clearBtn = document.getElementById('clearFilterBtnHeader');
        if (clearBtn) clearBtn.remove();
    }
}

async function showCategoryFilterNotification(categoryId) {
    // Make sure categories are loaded first
    const categories = await getAllCategories();

    // Find the category name
    const category = categories.find(cat => String(cat.id) === String(categoryId));
    const categoryName = category ? category.name : String(categoryId);

    // Update section title to show category name
    const sectionTitle = document.querySelector('.section-title');
    if (sectionTitle) {
        sectionTitle.innerHTML = `<i class="fas fa-list"></i> Your Tasks - ${categoryName}`;
    }

    // Add Clear Filter button next to New Task button
    const buttonsContainer = document.querySelector('.section-header-buttons');
    if (buttonsContainer) {
        // Remove existing clear filter button if any
        const existingBtn = document.getElementById('clearFilterBtnHeader');
        if (existingBtn) existingBtn.remove();

        // Create clear filter button
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clearFilterBtnHeader';
        clearBtn.className = 'btn btn-secondary';
        clearBtn.innerHTML = '<i class="fas fa-times"></i> Clear Filter';

        // Insert before New Task button
        const createTaskBtn = document.getElementById('createTaskBtn');
        if (createTaskBtn) {
            buttonsContainer.insertBefore(clearBtn, createTaskBtn);
        }

        // Add event listener
        clearBtn.addEventListener('click', () => {
            if (window.__SPA_MODE__) {
                import('../scripts/core/Router.js').then(({ router }) => {
                    router.navigate('/dashboard', true);
                });
            } else {
                window.location.href = '/views/DashboardPage.html';
            }
        });
    }
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
    notificationBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isVisible = popup.style.display === 'block';
        popup.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            await loadNotificationsPopup();
        }
    });

    // Mark all as read
    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', async () => {
            await markAllAsRead();
            await loadNotificationsPopup();
            await updateNotificationCount();
        });
    }

    // Close popup when clicking outside - store handler for cleanup
    dashboardNotificationPopupClickHandler = (e) => {
        if (!popup.contains(e.target) && !notificationBtn.contains(e.target)) {
            popup.style.display = 'none';
        }
    };
    document.addEventListener('click', dashboardNotificationPopupClickHandler);
}

async function loadNotificationsPopup() {
    const container = document.getElementById('notificationsPopupList');
    const notifications = await getAllNotifications();

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

async function updateNotificationCount() {
    const badge = document.getElementById('dashboardNotificationCount');
    const unreadCount = await getUnreadCount();

    if (badge) {
        badge.textContent = unreadCount > 0 ? unreadCount : '0';
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

async function handleNotificationClick(notificationId) {
    await markAsRead(notificationId);
    await loadNotificationsPopup();
    await updateNotificationCount();
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

/**
 * Setup listener for category updates to refresh tasks in real-time
 */
function setupCategoryUpdateListener() {
    categoryUpdateHandler = async (event) => {
        const { categoryId, updatedData } = event.detail;
        Logger.debug('📢 Category updated event received:', categoryId, updatedData);

        // Cache already reloaded in CategoryService.updateCategory()
        // Just re-render tasks to reflect new category colors/names
        renderTasks();
        updateStats();

        Logger.success('✅ Tasks updated with new category data');
    };

    window.addEventListener('categoryUpdated', categoryUpdateHandler);
    Logger.debug('👂 Category update listener registered');
}

// For standalone HTML page (MPA mode)
if (!window.__SPA_MODE__) {
    document.addEventListener('DOMContentLoaded', initializeDashboard);
}

// ===== SPA MODE =====

// Store event listeners for cleanup
let dashboardNotificationPopupClickHandler = null;
let categoryUpdateHandler = null;

/**
 * Cleanup function to remove event listeners and prevent memory leaks
 */
export function cleanupDashboardPage() {
    Logger.debug('🧹 Cleaning up Dashboard Page...');

    // Remove notification popup click listener
    if (dashboardNotificationPopupClickHandler) {
        document.removeEventListener('click', dashboardNotificationPopupClickHandler);
        dashboardNotificationPopupClickHandler = null;
    }

    // Remove category update listener
    if (categoryUpdateHandler) {
        window.removeEventListener('categoryUpdated', categoryUpdateHandler);
        categoryUpdateHandler = null;
    }

    // Remove notification popup from DOM
    const notificationPopup = document.getElementById('notificationsPopup');
    if (notificationPopup) {
        notificationPopup.remove();
    }

    Logger.debug('✅ Dashboard Page cleaned up');
}

/**
 * Load Dashboard page for SPA
 */
export async function loadDashboardPage() {
    Logger.debug('📄 Loading Dashboard Page...');

    // Load CSS
    loadPageCSS();

    // Get app container
    const app = document.getElementById('app');
    if (!app) {
        Logger.error('App container not found');
        return;
    }

    // Inject HTML
    app.innerHTML = getPageHTML();

    // Register cleanup function with router
    router.registerPageCleanup(cleanupDashboardPage);

    // Initialize Dashboard
    initializeDashboard();
}

/**
 * Load CSS for Dashboard page
 */
function loadPageCSS() {
    const cssFiles = [
        '/public/styles/DashboardPage.css',
        '/public/styles/dashboard/categoryfilter.css'
    ];

    // Remove existing page-specific stylesheets
    document.querySelectorAll('link[data-page-style]').forEach(link => link.remove());

    // Load new stylesheets
    cssFiles.forEach(href => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-page-style', 'true');
        document.head.appendChild(link);
    });
}

/**
 * Get Dashboard HTML
 */
function getPageHTML() {
    return `
        <div class="dashboard-container">
            <header class="dashboard-header">
                <div class="header-left">
                    <h1 class="dashboard-title">
                        <i class="fas fa-th-large"></i>
                        Dashboard
                    </h1>
                    <p class="dashboard-subtitle" id="dashboardSubtitle">
                        Welcome back! <span class="status-indicator">●</span>
                    </p>
                </div>
                <div class="header-actions">
                    <button class="header-btn notification-btn" id="notificationBtn" aria-label="Notifications">
                        <i class="fas fa-bell"></i>
                        <span class="notification-badge" id="dashboardNotificationCount">0</span>
                    </button>
                </div>
            </header>

            <div id="loadingState" class="loading-state" style="display: none;">
                <div class="loading-spinner"></div>
                <p>Loading your tasks...</p>
            </div>

            <div id="errorMessage" class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <p id="errorText">An error occurred</p>
                <button class="error-close" id="errorClose">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <section class="stats-section">
                <div class="stat-card total">
                    <div class="stat-icon"><i class="fas fa-tasks"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="totalTasks">0</span>
                        <p class="stat-label">Total Tasks</p>
                    </div>
                </div>
                <div class="stat-card completed">
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="completedTasks">0</span>
                        <p class="stat-label">Completed</p>
                    </div>
                </div>
                <div class="stat-card pending">
                    <div class="stat-icon"><i class="fas fa-clock"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="pendingTasks">0</span>
                        <p class="stat-label">Pending</p>
                    </div>
                </div>
                <div class="stat-card overdue">
                    <div class="stat-icon"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="overdueTasks">0</span>
                        <p class="stat-label">Overdue</p>
                    </div>
                </div>
                <div class="stat-card subtasks">
                    <div class="stat-icon"><i class="fas fa-list-check"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="subTasksCount">0</span>
                        <p class="stat-label">SubTasks</p>
                    </div>
                </div>
                <div class="stat-card recurring">
                    <div class="stat-icon"><i class="fas fa-sync-alt"></i></div>
                    <div class="stat-info">
                        <span class="stat-value" id="recurringCount">0</span>
                        <p class="stat-label">Recurring</p>
                    </div>
                </div>
            </section>

            <div class="dashboard-main">
                <section class="tasks-section">
                    <div class="section-header">
                        <h2 class="section-title">
                            <i class="fas fa-list"></i> Your Tasks
                        </h2>
                        <div class="section-header-buttons">
                            <button class="btn btn-primary" id="createTaskBtn">
                                <i class="fas fa-plus"></i> New Task
                            </button>
                        </div>
                    </div>
                    <div id="tasksList" class="tasks-list"></div>
                    <div id="emptyState" class="empty-state" style="display: none;">
                        <i class="fas fa-inbox"></i>
                        <h3>No tasks yet</h3>
                        <p>Create your first task to get started!</p>
                        <button class="btn btn-primary" id="emptyStateBtn">
                            <i class="fas fa-plus"></i> Create Task
                        </button>
                    </div>
                    <div id="paginationControls" class="pagination-controls" style="display: none;">
                        <button class="pagination-btn" id="prevBtn" aria-label="Previous page">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <span class="pagination-info" id="paginationInfo">Page 1 of 1</span>
                        <button class="pagination-btn" id="nextBtn" aria-label="Next page">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                </section>

                <aside class="quick-actions">
                    <h3 class="quick-actions-title">Quick Actions</h3>
                    <div class="quick-actions-grid">
                        <button class="quick-action-btn active" data-action="all">
                            <i class="fas fa-th"></i><span>All Tasks</span>
                        </button>
                        <button class="quick-action-btn" data-action="high-priority">
                            <i class="fas fa-flag"></i><span>High Priority</span>
                        </button>
                        <button class="quick-action-btn" data-action="today">
                            <i class="fas fa-calendar-day"></i><span>Due Today</span>
                        </button>
                        <button class="quick-action-btn" data-action="personal">
                            <i class="fas fa-user"></i><span>Personal</span>
                        </button>
                        <button class="quick-action-btn" data-action="work">
                            <i class="fas fa-briefcase"></i><span>Work</span>
                        </button>
                        <button class="quick-action-btn" data-action="recurring">
                            <i class="fas fa-sync-alt"></i><span>Recurring</span>
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    `;
}