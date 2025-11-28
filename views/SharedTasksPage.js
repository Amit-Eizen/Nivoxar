// SharedTasksPage.js
import { initNavbar } from '../scripts/components/Navbar.js';
import Logger from '../utils/Logger.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';
import { getMySharedTasks, getSharedTaskByTaskId, getAllParticipants, isOwner,
         leaveSharedTask, unshareTask, addParticipants, removeParticipant, updateParticipantPermissions } from '../services/SharedTasksService.js';
import { getAllNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/NotificationsService.js';
import { getAllFriends } from '../services/FriendsService.js';
import { router } from '../scripts/core/Router.js';

// Page State
const pageState = {
    sharedTasks: [],
    filteredTasks: [],
    currentFilter: 'all',
    currentTaskId: null,
    currentUser: null
};

// ===== INITIALIZATION =====
function initializeSharedTasksPage() {
    Logger.debug('🚀 Initializing Shared Tasks Page...');

    // Check authentication
    const currentUser = requireAuth();
    if (!currentUser) return;

    pageState.currentUser = currentUser;

    // Only init navbar in MPA mode (SPA mode handles navbar globally)
    if (!window.__SPA_MODE__) {
        initNavbar();
    }

    initNotificationsPopup();
    setupEventListeners();

    // Load data
    loadSharedTasks();

    Logger.success(' Shared Tasks Page initialized');
}

// ===== LOAD SHARED TASKS =====
async function loadSharedTasks() {
    showLoading();

    try {
        // Get shared tasks (includes full task data in each sharedTask.task)
        pageState.sharedTasks = await getMySharedTasks();

        // Filter tasks
        applyFilter(pageState.currentFilter);

        // Update stats
        updateStats();

        // Render tasks
        renderSharedTasks();

        hideLoading();
    } catch (error) {
        Logger.error(' Error loading shared tasks:', error);
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
                st.participants.some(p => p.userId === currentUserId)
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
        const task = st.task;
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
        // Use the task data from the sharedTask object (returned by API)
        const task = sharedTask.task;
        if (!task) return '';

        const isTaskOwner = sharedTask.ownerId === pageState.currentUser.id || sharedTask.isOwner;
        const participantCount = sharedTask.participants.length + 1; // +1 for owner
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
        st.participants.forEach(p => collaboratorsSet.add(p.userId));
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
async function openTaskDetails(taskId) {
    pageState.currentTaskId = taskId;

    const sharedTask = await getSharedTaskByTaskId(taskId);

    if (!sharedTask || !sharedTask.task) {
        showError('Task not found');
        return;
    }

    const task = sharedTask.task;

    // Populate modal
    document.getElementById('modalTaskTitle').textContent = task.title;
    document.getElementById('taskOwner').textContent = sharedTask.ownerUsername;
    document.getElementById('taskCategory').textContent = task.category?.name || 'Uncategorized';
    document.getElementById('taskPriority').innerHTML = `<span class="priority-badge priority-${task.priority}">${getPriorityLabel(task.priority)}</span>`;
    document.getElementById('taskDueDate').textContent = task.dueDate ? formatDate(task.dueDate) : 'No due date';
    document.getElementById('taskLastEdited').textContent = `${sharedTask.lastEditedBy} • ${formatTimeAgo(sharedTask.updatedAt)}`;
    document.getElementById('taskDescription').textContent = task.description || 'No description';

    // Render subtasks
    renderModalSubtasks(task.subTasks || []);

    // Render collaborators
    const participants = await getAllParticipants(taskId);
    renderCollaborators(participants);

    // Show/hide action buttons
    const isTaskOwner = await isOwner(taskId, pageState.currentUser.id);
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

    container.innerHTML = participants.map(p => {
        const avatarHtml = p.profilePicture
            ? `<img src="${p.profilePicture}" alt="${p.username}" class="collaborator-avatar-img">`
            : `<i class="fas fa-user-circle"></i>`;

        return `
            <div class="collaborator-item">
                <div class="collaborator-avatar">
                    ${avatarHtml}
                </div>
                <div class="collaborator-info">
                    <span class="collaborator-name">${p.username}</span>
                    <span class="collaborator-role">${p.role === 'owner' ? 'Owner' : 'Editor'}</span>
                </div>
                ${p.role === 'owner' ? '<i class="fas fa-crown role-icon"></i>' : ''}
            </div>
        `;
    }).join('');
}

// ===== MANAGE PARTICIPANTS =====
async function openManageParticipants() {
    const taskId = pageState.currentTaskId;
    const sharedTask = await getSharedTaskByTaskId(taskId);

    if (!sharedTask) return;

    // Load friends
    const friends = await getAllFriends();
    const friendsSelect = document.getElementById('friendsSelect');

    // Filter out users already in the task
    const existingUserIds = [
        sharedTask.ownerId,
        ...sharedTask.participants.map(p => p.userId)
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
    await renderCurrentParticipants(sharedTask);

    // Show modal
    document.getElementById('manageParticipantsModal').style.display = 'flex';
}

// ===== RENDER CURRENT PARTICIPANTS =====
async function renderCurrentParticipants(sharedTask) {
    const container = document.getElementById('currentParticipantsList');
    const isTaskOwner = sharedTask.ownerId === pageState.currentUser.id;

    const participants = await getAllParticipants(sharedTask.taskId);

    container.innerHTML = participants.map(p => {
        const avatarHtml = p.profilePicture
            ? `<img src="${p.profilePicture}" alt="${p.username}" class="participant-avatar-img">`
            : `<i class="fas fa-user-circle"></i>`;

        const isOwner = p.role === 'owner';

        return `
            <div class="participant-item-extended" data-participant-id="${p.userId}">
                <div class="participant-header" ${isTaskOwner && !isOwner ? `onclick="window.sharedTasksPage.toggleParticipantPermissions('${p.userId}')" style="cursor: pointer;"` : ''}>
                    <div class="participant-info">
                        <div class="participant-avatar">
                            ${avatarHtml}
                        </div>
                        <span class="participant-name">${p.username}</span>
                        ${isOwner ? '<span class="owner-badge"><i class="fas fa-crown"></i> Owner</span>' : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${isTaskOwner && !isOwner ? `
                            <i class="fas fa-chevron-down participant-expand-icon" data-participant-id="${p.userId}"></i>
                            <button class="btn-icon btn-danger" onclick="event.stopPropagation(); window.sharedTasksPage.handleRemoveParticipant('${p.userId}')">
                                <i class="fas fa-times"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${isTaskOwner && !isOwner ? `
                    <div class="participant-permissions" data-permissions-for="${p.userId}" style="display: none;">
                        <label class="permission-checkbox">
                            <input type="checkbox"
                                data-user-id="${p.userId}"
                                data-permission="canEdit"
                                ${sharedTask.permissions.canEdit ? 'checked' : ''}
                                onchange="window.sharedTasksPage.handlePermissionChange('${p.userId}', 'canEdit', this.checked)">
                            <span><i class="fas fa-edit"></i> Can Edit</span>
                        </label>
                        <label class="permission-checkbox">
                            <input type="checkbox"
                                data-user-id="${p.userId}"
                                data-permission="canAddSubtasks"
                                ${sharedTask.permissions.canAddSubtasks ? 'checked' : ''}
                                onchange="window.sharedTasksPage.handlePermissionChange('${p.userId}', 'canAddSubtasks', this.checked)">
                            <span><i class="fas fa-list-check"></i> Can Add Subtasks</span>
                        </label>
                        <label class="permission-checkbox">
                            <input type="checkbox"
                                data-user-id="${p.userId}"
                                data-permission="canShare"
                                ${sharedTask.permissions.canShare ? 'checked' : ''}
                                onchange="window.sharedTasksPage.handlePermissionChange('${p.userId}', 'canShare', this.checked)">
                            <span><i class="fas fa-share-nodes"></i> Can Share</span>
                        </label>
                        <label class="permission-checkbox">
                            <input type="checkbox"
                                data-user-id="${p.userId}"
                                data-permission="canDelete"
                                ${sharedTask.permissions.canDelete ? 'checked' : ''}
                                onchange="window.sharedTasksPage.handlePermissionChange('${p.userId}', 'canDelete', this.checked)">
                            <span><i class="fas fa-trash"></i> Can Delete</span>
                        </label>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ===== TOGGLE PARTICIPANT PERMISSIONS =====
function toggleParticipantPermissions(userId) {
    const permissionsDiv = document.querySelector(`[data-permissions-for="${userId}"]`);
    const expandIcon = document.querySelector(`.participant-expand-icon[data-participant-id="${userId}"]`);

    if (!permissionsDiv) return;

    const isHidden = permissionsDiv.style.display === 'none';

    if (isHidden) {
        permissionsDiv.style.display = 'grid';
        if (expandIcon) expandIcon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        permissionsDiv.style.display = 'none';
        if (expandIcon) expandIcon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// ===== HANDLE PERMISSION CHANGE =====
async function handlePermissionChange(userId, permission, value) {
    const taskId = pageState.currentTaskId;

    try {
        // Call API to update permission
        await updateParticipantPermissions(taskId, {
            [permission]: value
        });

        showSuccess(`Permission ${value ? 'granted' : 'revoked'} successfully`);

        // Refresh the participants list
        const sharedTask = await getSharedTaskByTaskId(taskId);
        await renderCurrentParticipants(sharedTask);
    } catch (error) {
        Logger.error(' Error updating permission:', error);
        showError('Failed to update permission: ' + error.message);

        // Revert checkbox on error
        const checkbox = document.querySelector(`input[data-user-id="${userId}"][data-permission="${permission}"]`);
        if (checkbox) checkbox.checked = !value;
    }
}

// ===== ADD PARTICIPANT =====
async function handleAddParticipant() {
    const friendsSelect = document.getElementById('friendsSelect');
    const selectedUserId = parseInt(friendsSelect.value);

    if (!selectedUserId) {
        showError('Please select a friend');
        return;
    }

    const taskId = pageState.currentTaskId;
    const task = pageState.allTasks.find(t => t.id === taskId);

    try {
        await addParticipants(taskId, task.title, [selectedUserId]);
        showSuccess('Participant added successfully');

        // Refresh
        await loadSharedTasks();
        await openManageParticipants();
    } catch (error) {
        Logger.error(' Error adding participant:', error);
        showError(error.message);
    }
}

// ===== REMOVE PARTICIPANT =====
async function handleRemoveParticipant(userId) {
    if (!confirm('Remove this participant?')) return;

    const taskId = pageState.currentTaskId;

    try {
        await removeParticipant(taskId, userId);
        showSuccess('Participant removed');

        // Refresh
        await loadSharedTasks();
        await openManageParticipants();
    } catch (error) {
        Logger.error(' Error removing participant:', error);
        showError(error.message);
    }
}

// ===== LEAVE TASK =====
async function handleLeaveTask() {
    if (!confirm('Are you sure you want to leave this shared task?')) return;

    const taskId = pageState.currentTaskId;

    try {
        await leaveSharedTask(taskId);
        showSuccess('You left the task');

        // Close modal and refresh
        closeTaskDetailsModal();
        await loadSharedTasks();
    } catch (error) {
        Logger.error(' Error leaving task:', error);
        showError(error.message);
    }
}

// ===== UNSHARE TASK =====
async function handleUnshareTask() {
    if (!confirm('This will remove all participants and unshare the task. Continue?')) return;

    const taskId = pageState.currentTaskId;

    try {
        await unshareTask(taskId);
        showSuccess('Task unshared successfully');

        // Close modal and refresh
        closeTaskDetailsModal();
        await loadSharedTasks();
    } catch (error) {
        Logger.error(' Error unsharing task:', error);
        showError(error.message);
    }
}

// ===== OPEN IN DASHBOARD =====
function openInDashboard() {
    if (window.__SPA_MODE__) {
        import('../scripts/core/Router.js').then(({ router }) => {
            router.navigate('/dashboard');
        });
    } else {
        window.location.href = '/views/DashboardPage.html';
    }
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

    // Store handler for cleanup
    notificationPopupClickHandler = (e) => {
        if (!popup.contains(e.target) && !notificationBtn.contains(e.target)) {
            popup.style.display = 'none';
        }
    };
    document.addEventListener('click', notificationPopupClickHandler);
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
    Logger.success('', message);
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
    handleRemoveParticipant,
    handlePermissionChange,
    toggleParticipantPermissions
};

// ===== INITIALIZE ON DOM READY =====
// For standalone HTML page (MPA mode)
if (!window.__SPA_MODE__) {
    document.addEventListener('DOMContentLoaded', initializeSharedTasksPage);
}

// ===== SPA MODE =====

// Store event listeners for cleanup
let notificationPopupClickHandler = null;

/**
 * Cleanup function to remove event listeners and prevent memory leaks
 */
export function cleanupSharedTasksPage() {
    Logger.debug('🧹 Cleaning up Shared Tasks Page...');

    // Remove notification popup click listener
    if (notificationPopupClickHandler) {
        document.removeEventListener('click', notificationPopupClickHandler);
        notificationPopupClickHandler = null;
    }

    // Remove notification popup from DOM
    const notificationPopup = document.getElementById('notificationsPopup');
    if (notificationPopup) {
        notificationPopup.remove();
    }

    Logger.debug('✅ Shared Tasks Page cleaned up');
}

/**
 * Load Shared Tasks page for SPA
 */
export async function loadSharedTasksPage() {
    Logger.debug('📄 Loading Shared Tasks Page...');

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
    router.registerPageCleanup(cleanupSharedTasksPage);

    // Initialize Shared Tasks
    initializeSharedTasksPage();
}

/**
 * Load CSS for Shared Tasks page
 */
function loadPageCSS() {
    const cssFiles = [
        '/public/styles/SharedTasksPage.css'
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
 * Get Shared Tasks HTML
 */
function getPageHTML() {
    return `
        <!-- Shared Tasks Content -->
        <div class="shared-tasks-container">
            <!-- Main Container -->
            <div class="main-container">
                <!-- Header -->
                <header class="page-header">
                    <div class="header-left">
                        <h1 class="page-title">
                            <i class="fas fa-share-nodes"></i>
                            Shared Tasks
                        </h1>
                        <p class="page-subtitle">
                            Collaborate with friends and family
                        </p>
                    </div>
                    <div class="header-actions">
                        <button class="header-btn notification-btn" id="notificationBtn" aria-label="Notifications">
                            <i class="fas fa-bell"></i>
                            <span class="notification-badge" id="notificationCount">0</span>
                        </button>
                    </div>
                </header>

                <!-- Loading State -->
                <div id="loadingState" class="loading-state" style="display: none;">
                    <div class="loading-spinner"></div>
                    <p>Loading shared tasks...</p>
                </div>

                <!-- Error Message -->
                <div id="errorMessage" class="error-message" style="display: none;">
                    <i class="fas fa-exclamation-circle"></i>
                    <p id="errorText">An error occurred</p>
                    <button class="error-close" id="errorClose">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Stats Section -->
                <section class="stats-section">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-share-nodes"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="totalSharedTasks">0</span>
                            <p class="stat-label">Shared Tasks</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-crown"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="ownedTasks">0</span>
                            <p class="stat-label">Tasks I Own</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="participatingTasks">0</span>
                            <p class="stat-label">Participating In</p>
                        </div>
                    </div>

                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-user-group"></i>
                        </div>
                        <div class="stat-info">
                            <span class="stat-value" id="totalCollaborators">0</span>
                            <p class="stat-label">Collaborators</p>
                        </div>
                    </div>
                </section>

                <!-- Filter & Search Section -->
                <section class="controls-section">
                    <div class="search-box">
                        <i class="fas fa-search"></i>
                        <input type="text" id="searchInput" placeholder="Search shared tasks...">
                    </div>

                    <div class="filter-buttons">
                        <button class="filter-btn active" data-filter="all">
                            <i class="fas fa-th"></i>
                            All Tasks
                        </button>
                        <button class="filter-btn" data-filter="owned">
                            <i class="fas fa-crown"></i>
                            My Tasks
                        </button>
                        <button class="filter-btn" data-filter="participating">
                            <i class="fas fa-users"></i>
                            Participating
                        </button>
                    </div>
                </section>

                <!-- Shared Tasks List -->
                <section class="tasks-section">
                    <div id="sharedTasksList" class="tasks-list">
                        <!-- Tasks will be rendered here -->
                    </div>

                    <!-- Empty State -->
                    <div id="emptyState" class="empty-state" style="display: none;">
                        <i class="fas fa-share-nodes"></i>
                        <h3>No Shared Tasks Yet</h3>
                        <p>Share tasks from your Dashboard to collaborate with friends and family</p>
                        <a href="/dashboard" class="btn btn-primary">
                            <i class="fas fa-home"></i>
                            Go to Dashboard
                        </a>
                    </div>
                </section>
            </div>
        </div>

        <!-- Task Details Modal -->
        <div id="taskDetailsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="modalTaskTitle">Task Details</h2>
                    <button class="modal-close" id="closeTaskModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Task Info -->
                    <div class="task-info-section">
                        <div class="info-row">
                            <label><i class="fas fa-user"></i> Owner:</label>
                            <span id="taskOwner"></span>
                        </div>
                        <div class="info-row">
                            <label><i class="fas fa-folder"></i> Category:</label>
                            <span id="taskCategory"></span>
                        </div>
                        <div class="info-row">
                            <label><i class="fas fa-flag"></i> Priority:</label>
                            <span id="taskPriority"></span>
                        </div>
                        <div class="info-row">
                            <label><i class="fas fa-calendar"></i> Due Date:</label>
                            <span id="taskDueDate"></span>
                        </div>
                        <div class="info-row">
                            <label><i class="fas fa-clock"></i> Last Edited:</label>
                            <span id="taskLastEdited"></span>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="description-section">
                        <h3><i class="fas fa-align-left"></i> Description</h3>
                        <p id="taskDescription">No description</p>
                    </div>

                    <!-- Subtasks -->
                    <div class="subtasks-section">
                        <h3><i class="fas fa-list-check"></i> Subtasks</h3>
                        <div id="taskSubtasks">
                            <p class="text-muted">No subtasks</p>
                        </div>
                    </div>

                    <!-- Collaborators -->
                    <div class="collaborators-section">
                        <h3>
                            <i class="fas fa-users"></i>
                            Collaborators
                            <span class="collaborator-count" id="collaboratorCount">0</span>
                        </h3>
                        <div id="collaboratorsList" class="collaborators-list">
                            <!-- Collaborators will be rendered here -->
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="modal-actions">
                        <button class="btn btn-primary" id="openTaskBtn">
                            <i class="fas fa-external-link-alt"></i>
                            Open in Dashboard
                        </button>
                        <button class="btn btn-secondary" id="manageParticipantsBtn">
                            <i class="fas fa-user-plus"></i>
                            Manage Participants
                        </button>
                        <button class="btn btn-danger" id="leaveTaskBtn" style="display: none;">
                            <i class="fas fa-sign-out-alt"></i>
                            Leave Task
                        </button>
                        <button class="btn btn-danger" id="unshareTaskBtn" style="display: none;">
                            <i class="fas fa-trash"></i>
                            Unshare Task
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Manage Participants Modal -->
        <div id="manageParticipantsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2><i class="fas fa-users"></i> Manage Participants</h2>
                    <button class="modal-close" id="closeManageModal">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <!-- Current Participants -->
                    <div class="current-participants">
                        <h3>Current Participants</h3>
                        <div id="currentParticipantsList" class="participants-list">
                            <!-- Participants will be rendered here -->
                        </div>
                    </div>

                    <!-- Add Participants -->
                    <div class="add-participants-section">
                        <h3>Add Participants</h3>
                        <div class="add-participant-form">
                            <select id="friendsSelect" class="form-control">
                                <option value="">Select a friend...</option>
                            </select>
                            <button class="btn btn-primary" id="addParticipantBtn">
                                <i class="fas fa-plus"></i>
                                Add
                            </button>
                        </div>
                        <p class="text-muted small">You can only add friends to shared tasks</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}
