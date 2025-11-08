// SharedTasksPage.js
import { initNavbar } from './components/Navbar.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';
import { getMySharedTasks, getSharedTaskByTaskId, getAllParticipants, isOwner,
         leaveSharedTask, unshareTask, addParticipants, removeParticipant } from '../services/SharedTasksService.js';
import { getAllNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/NotificationsService.js';
import { getAllFriends } from '../services/FriendsService.js';
import { STORAGE_KEYS } from '../utils/StorageKeys.js';

// Page State
const pageState = {
    sharedTasks: [],
    allTasks: [],
    filteredTasks: [],
    currentFilter: 'all',
    currentTaskId: null,
    currentUser: null
};

// ===== INITIALIZATION =====
function initializeSharedTasksPage() {
    console.log('🚀 Initializing Shared Tasks Page...');

    // Check authentication
    const currentUser = requireAuth();
    if (!currentUser) return;

    pageState.currentUser = currentUser;

    // Initialize components
    initNavbar();
    initNotificationsPopup();
    setupEventListeners();

    // Load data
    loadSharedTasks();

    console.log('✅ Shared Tasks Page initialized');
}

// ===== LOAD SHARED TASKS =====
function loadSharedTasks() {
    showLoading();

    try {
        // Get all tasks from localStorage
        const allTasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
        pageState.allTasks = allTasks;

        // Get shared tasks
        pageState.sharedTasks = getMySharedTasks();

        // Filter tasks
        applyFilter(pageState.currentFilter);

        // Update stats
        updateStats();

        // Render tasks
        renderSharedTasks();

        hideLoading();
    } catch (error) {
        console.error('❌ Error loading shared tasks:', error);
        showError('Failed to load shared tasks');
        hideLoading();
    }
}

// ===== APPLY FILTER =====
function applyFilter(filter) {
    pageState.currentFilter = filter;

    const currentUserId = pageState.currentUser.id;

    switch (filter) {
        case 'owned':
            pageState.filteredTasks = pageState.sharedTasks.filter(st => st.ownerId === currentUserId);
            break;
        case 'participating':
            pageState.filteredTasks = pageState.sharedTasks.filter(st =>
                st.ownerId !== currentUserId &&
                st.sharedWith.some(p => p.userId === currentUserId)
            );
            break;
        case 'all':
        default:
            pageState.filteredTasks = pageState.sharedTasks;
            break;
    }

    // Apply search if exists
    const searchQuery = document.getElementById('searchInput')?.value;
    if (searchQuery) {
        applySearch(searchQuery);
    }
}

// ===== APPLY SEARCH =====
function applySearch(query) {
    if (!query) {
        applyFilter(pageState.currentFilter);
        return;
    }

    const searchTerm = query.toLowerCase();

    pageState.filteredTasks = pageState.filteredTasks.filter(st => {
        const task = pageState.allTasks.find(t => t.id === st.taskId);
        if (!task) return false;

        return (
            task.title.toLowerCase().includes(searchTerm) ||
            task.description?.toLowerCase().includes(searchTerm) ||
            st.ownerUsername.toLowerCase().includes(searchTerm)
        );
    });
}

// ===== RENDER SHARED TASKS =====
function renderSharedTasks() {
    const container = document.getElementById('sharedTasksList');
    const emptyState = document.getElementById('emptyState');

    if (pageState.filteredTasks.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'flex';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    container.innerHTML = pageState.filteredTasks.map(sharedTask => {
        const task = pageState.allTasks.find(t => t.id === sharedTask.taskId);
        if (!task) return '';

        const isTaskOwner = sharedTask.ownerId === pageState.currentUser.id;
        const participantCount = sharedTask.sharedWith.length + 1; // +1 for owner
        const completionPercentage = calculateCompletionPercentage(task);

        return `
            <div class="shared-task-card" data-task-id="${task.id}" onclick="window.sharedTasksPage.openTaskDetails(${task.id})">
                <div class="task-card-header">
                    <div class="task-title-row">
                        <h3 class="task-title">${task.title}</h3>
                        ${isTaskOwner ? '<span class="owner-badge"><i class="fas fa-crown"></i> Owner</span>' : ''}
                    </div>
                    <div class="task-meta">
                        <span class="task-owner">
                            <i class="fas fa-user"></i>
                            ${sharedTask.ownerUsername}
                        </span>
                    </div>
                </div>

                <div class="task-card-body">
                    ${task.description ? `<p class="task-description">${task.description}</p>` : ''}

                    <!-- Progress Bar -->
                    ${task.subTasks && task.subTasks.length > 0 ? `
                        <div class="task-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${completionPercentage}%"></div>
                            </div>
                            <span class="progress-text">${completionPercentage}% Complete</span>
                        </div>
                    ` : ''}

                    <!-- Task Info -->
                    <div class="task-info-grid">
                        <div class="info-item">
                            <i class="fas fa-flag priority-${task.priority}"></i>
                            <span>${getPriorityLabel(task.priority)}</span>
                        </div>
                        ${task.dueDate ? `
                            <div class="info-item">
                                <i class="fas fa-calendar"></i>
                                <span>${formatDate(task.dueDate)}</span>
                            </div>
                        ` : ''}
                        <div class="info-item">
                            <i class="fas fa-users"></i>
                            <span>${participantCount} ${participantCount === 1 ? 'person' : 'people'}</span>
                        </div>
                        ${task.subTasks && task.subTasks.length > 0 ? `
                            <div class="info-item">
                                <i class="fas fa-list-check"></i>
                                <span>${task.subTasks.filter(st => st.completed).length}/${task.subTasks.length} subtasks</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Last Edited -->
                    <div class="task-footer">
                        <span class="last-edited">
                            <i class="fas fa-clock"></i>
                            Last edited by ${sharedTask.lastEditedBy} • ${formatTimeAgo(sharedTask.updatedAt)}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== UPDATE STATS =====
function updateStats() {
    const totalShared = pageState.sharedTasks.length;
    const owned = pageState.sharedTasks.filter(st => st.ownerId === pageState.currentUser.id).length;
    const participating = totalShared - owned;

    // Calculate unique collaborators
    const collaboratorsSet = new Set();
    pageState.sharedTasks.forEach(st => {
        st.sharedWith.forEach(p => collaboratorsSet.add(p.userId));
        if (st.ownerId !== pageState.currentUser.id) {
            collaboratorsSet.add(st.ownerId);
        }
    });

    document.getElementById('totalSharedTasks').textContent = totalShared;
    document.getElementById('ownedTasks').textContent = owned;
    document.getElementById('participatingTasks').textContent = participating;
    document.getElementById('totalCollaborators').textContent = collaboratorsSet.size;
}

// ===== OPEN TASK DETAILS =====
function openTaskDetails(taskId) {
    pageState.currentTaskId = taskId;

    const task = pageState.allTasks.find(t => t.id === taskId);
    const sharedTask = getSharedTaskByTaskId(taskId);

    if (!task || !sharedTask) {
        showError('Task not found');
        return;
    }

    // Populate modal
    document.getElementById('modalTaskTitle').textContent = task.title;
    document.getElementById('taskOwner').textContent = sharedTask.ownerUsername;
    document.getElementById('taskCategory').textContent = task.category || 'Uncategorized';
    document.getElementById('taskPriority').innerHTML = `<span class="priority-badge priority-${task.priority}">${getPriorityLabel(task.priority)}</span>`;
    document.getElementById('taskDueDate').textContent = task.dueDate ? formatDate(task.dueDate) : 'No due date';
    document.getElementById('taskLastEdited').textContent = `${sharedTask.lastEditedBy} • ${formatTimeAgo(sharedTask.updatedAt)}`;
    document.getElementById('taskDescription').textContent = task.description || 'No description';

    // Render subtasks
    renderModalSubtasks(task.subTasks || []);

    // Render collaborators
    const participants = getAllParticipants(taskId);
    renderCollaborators(participants);

    // Show/hide action buttons
    const isTaskOwner = isOwner(taskId, pageState.currentUser.id);
    document.getElementById('leaveTaskBtn').style.display = !isTaskOwner ? 'inline-block' : 'none';
    document.getElementById('unshareTaskBtn').style.display = isTaskOwner ? 'inline-block' : 'none';
    document.getElementById('manageParticipantsBtn').style.display = 'inline-block';

    // Show modal
    document.getElementById('taskDetailsModal').style.display = 'flex';
}

// ===== RENDER MODAL SUBTASKS =====
function renderModalSubtasks(subtasks) {
    const container = document.getElementById('taskSubtasks');

    if (!subtasks || subtasks.length === 0) {
        container.innerHTML = '<p class="text-muted">No subtasks</p>';
        return;
    }

    container.innerHTML = subtasks.map(st => `
        <div class="subtask-item ${st.completed ? 'completed' : ''}">
            <i class="fas ${st.completed ? 'fa-check-circle' : 'fa-circle'}"></i>
            <span>${st.title}</span>
        </div>
    `).join('');
}

// ===== RENDER COLLABORATORS =====
function renderCollaborators(participants) {
    const container = document.getElementById('collaboratorsList');
    const countElement = document.getElementById('collaboratorCount');

    countElement.textContent = participants.length;

    container.innerHTML = participants.map(p => `
        <div class="collaborator-item">
            <div class="collaborator-avatar">
                <i class="fas fa-user-circle"></i>
            </div>
            <div class="collaborator-info">
                <span class="collaborator-name">${p.username}</span>
                <span class="collaborator-role">${p.role === 'owner' ? 'Owner' : 'Editor'}</span>
            </div>
            ${p.role === 'owner' ? '<i class="fas fa-crown role-icon"></i>' : ''}
        </div>
    `).join('');
}

// ===== MANAGE PARTICIPANTS =====
function openManageParticipants() {
    const taskId = pageState.currentTaskId;
    const sharedTask = getSharedTaskByTaskId(taskId);

    if (!sharedTask) return;

    // Load friends
    const friends = getAllFriends();
    const friendsSelect = document.getElementById('friendsSelect');

    // Filter out users already in the task
    const existingUserIds = [
        sharedTask.ownerId,
        ...sharedTask.sharedWith.map(p => p.userId)
    ];

    const availableFriends = friends.filter(f => {
        const friendId = f.userId === pageState.currentUser.id ? f.friendId : f.userId;
        return !existingUserIds.includes(friendId);
    });

    friendsSelect.innerHTML = '<option value="">Select a friend...</option>' +
        availableFriends.map(f => {
            const friendId = f.userId === pageState.currentUser.id ? f.friendId : f.userId;
            const friendUsername = f.userId === pageState.currentUser.id ? f.friendUsername : f.username;
            return `<option value="${friendId}">${friendUsername}</option>`;
        }).join('');

    // Render current participants
    renderCurrentParticipants(sharedTask);

    // Show modal
    document.getElementById('manageParticipantsModal').style.display = 'flex';
}

// ===== RENDER CURRENT PARTICIPANTS =====
function renderCurrentParticipants(sharedTask) {
    const container = document.getElementById('currentParticipantsList');
    const isTaskOwner = sharedTask.ownerId === pageState.currentUser.id;

    const participants = getAllParticipants(sharedTask.taskId);

    container.innerHTML = participants.map(p => `
        <div class="participant-item">
            <div class="participant-info">
                <i class="fas fa-user-circle"></i>
                <span>${p.username}</span>
                ${p.role === 'owner' ? '<span class="owner-badge"><i class="fas fa-crown"></i></span>' : ''}
            </div>
            ${isTaskOwner && p.role !== 'owner' ? `
                <button class="btn-icon btn-danger" onclick="window.sharedTasksPage.handleRemoveParticipant(${p.userId})">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        </div>
    `).join('');
}

// ===== ADD PARTICIPANT =====
function handleAddParticipant() {
    const friendsSelect = document.getElementById('friendsSelect');
    const selectedUserId = parseInt(friendsSelect.value);

    if (!selectedUserId) {
        showError('Please select a friend');
        return;
    }

    const taskId = pageState.currentTaskId;
    const task = pageState.allTasks.find(t => t.id === taskId);

    try {
        addParticipants(taskId, task.title, [selectedUserId]);
        showSuccess('Participant added successfully');

        // Refresh
        loadSharedTasks();
        openManageParticipants();
    } catch (error) {
        console.error('❌ Error adding participant:', error);
        showError(error.message);
    }
}

// ===== REMOVE PARTICIPANT =====
function handleRemoveParticipant(userId) {
    if (!confirm('Remove this participant?')) return;

    const taskId = pageState.currentTaskId;

    try {
        removeParticipant(taskId, userId);
        showSuccess('Participant removed');

        // Refresh
        loadSharedTasks();
        openManageParticipants();
    } catch (error) {
        console.error('❌ Error removing participant:', error);
        showError(error.message);
    }
}

// ===== LEAVE TASK =====
function handleLeaveTask() {
    if (!confirm('Are you sure you want to leave this shared task?')) return;

    const taskId = pageState.currentTaskId;

    try {
        leaveSharedTask(taskId);
        showSuccess('You left the task');

        // Close modal and refresh
        closeTaskDetailsModal();
        loadSharedTasks();
    } catch (error) {
        console.error('❌ Error leaving task:', error);
        showError(error.message);
    }
}

// ===== UNSHARE TASK =====
function handleUnshareTask() {
    if (!confirm('This will remove all participants and unshare the task. Continue?')) return;

    const taskId = pageState.currentTaskId;

    try {
        unshareTask(taskId);
        showSuccess('Task unshared successfully');

        // Close modal and refresh
        closeTaskDetailsModal();
        loadSharedTasks();
    } catch (error) {
        console.error('❌ Error unsharing task:', error);
        showError(error.message);
    }
}

// ===== OPEN IN DASHBOARD =====
function openInDashboard() {
    window.location.href = '/views/DashboardPage.html';
}

// ===== NOTIFICATIONS POPUP =====
function initNotificationsPopup() {
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

    document.body.appendChild(popup);

    const notificationBtn = document.getElementById('notificationBtn');
    const markAllReadBtn = document.getElementById('markAllReadBtn');

    if (!notificationBtn) return;

    updateNotificationCount();

    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = popup.style.display === 'block';
        popup.style.display = isVisible ? 'none' : 'block';

        if (!isVisible) {
            loadNotificationsPopup();
        }
    });

    if (markAllReadBtn) {
        markAllReadBtn.addEventListener('click', () => {
            markAllAsRead();
            loadNotificationsPopup();
            updateNotificationCount();
        });
    }

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
        <div class="notification-item ${notification.read ? '' : 'unread'}" onclick="window.sharedTasksPage.handleNotificationClick(${notification.id})">
            <div class="notification-icon">
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
    const badge = document.getElementById('notificationCount');
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

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFilter(e.target.dataset.filter);
            renderSharedTasks();
        });
    });

    // Search
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            applyFilter(pageState.currentFilter);
            applySearch(e.target.value);
            renderSharedTasks();
        });
    }

    // Modal close buttons
    document.getElementById('closeTaskModal')?.addEventListener('click', closeTaskDetailsModal);
    document.getElementById('closeManageModal')?.addEventListener('click', closeManageParticipantsModal);

    // Modal actions
    document.getElementById('openTaskBtn')?.addEventListener('click', openInDashboard);
    document.getElementById('manageParticipantsBtn')?.addEventListener('click', openManageParticipants);
    document.getElementById('leaveTaskBtn')?.addEventListener('click', handleLeaveTask);
    document.getElementById('unshareTaskBtn')?.addEventListener('click', handleUnshareTask);
    document.getElementById('addParticipantBtn')?.addEventListener('click', handleAddParticipant);

    // Error close
    document.getElementById('errorClose')?.addEventListener('click', hideError);

    // Close modals on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

// ===== MODAL CONTROLS =====
function closeTaskDetailsModal() {
    document.getElementById('taskDetailsModal').style.display = 'none';
}

function closeManageParticipantsModal() {
    document.getElementById('manageParticipantsModal').style.display = 'none';
}

// ===== UI HELPERS =====
function showLoading() {
    document.getElementById('loadingState').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingState').style.display = 'none';
}

function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    errorText.textContent = message;
    errorMessage.style.display = 'flex';

    setTimeout(() => {
        hideError();
    }, 5000);
}

function hideError() {
    document.getElementById('errorMessage').style.display = 'none';
}

function showSuccess(message) {
    // You can implement a success toast here
    console.log('✅', message);
    alert(message);
}

// ===== UTILITY FUNCTIONS =====
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function getPriorityLabel(priority) {
    const labels = {
        1: 'Low',
        2: 'Medium',
        3: 'High',
        4: 'Urgent'
    };
    return labels[priority] || 'Medium';
}

function calculateCompletionPercentage(task) {
    if (!task.subTasks || task.subTasks.length === 0) return 0;

    const completed = task.subTasks.filter(st => st.completed).length;
    return Math.round((completed / task.subTasks.length) * 100);
}

// ===== EXPOSE FUNCTIONS TO WINDOW =====
window.sharedTasksPage = {
    openTaskDetails,
    handleNotificationClick,
    handleRemoveParticipant
};

// ===== INITIALIZE ON DOM READY =====
document.addEventListener('DOMContentLoaded', initializeSharedTasksPage);
