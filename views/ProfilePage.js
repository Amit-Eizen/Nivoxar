// ProfilePage.js - Profile Management
import Logger from '../utils/Logger.js';
import { updateProfilePicture, updateUserName, changePassword, checkNameAvailability, searchUsers } from '../services/AuthService.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';
import { getAllFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, cancelFriendRequest } from '../services/FriendsService.js';
import { escapeHtml } from '../utils/SecurityUtils.js';
import { formatTimeAgo } from '../utils/DateUtils.js';
import { getNotificationIcon } from '../utils/NotificationUtils.js';
import { getAllNotifications, getUnreadCount, markAllAsRead, deleteNotification } from '../services/NotificationsService.js';
import { initNavbar } from '../scripts/components/Navbar.js';

// ===== STATE =====
const profileState = {
    currentUser: null,
    friends: [],
    notifications: [],
    friendRequests: { incoming: [], outgoing: [] }
};

// ===== INITIALIZATION =====
async function initializeProfilePage() {
    Logger.debug('🚀 Initializing Profile Page...');

    // Check authentication
    const user = requireAuth();
    if (!user) return;

    // Fetch fresh user data from API to ensure we have latest info
    try {
        const { getCurrentUserProfile } = await import('../services/AuthService.js');
        const freshUser = await getCurrentUserProfile();
        profileState.currentUser = freshUser;

        // Update localStorage with fresh data
        const { STORAGE_KEYS } = await import('../utils/StorageKeys.js');
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(freshUser));
    } catch (error) {
        Logger.error('Failed to fetch fresh user data:', error);
        profileState.currentUser = user; // Fallback to cached user
    }

    // Refresh navbar with updated user data
    if (window.__SPA_MODE__) {
        const { renderNavbar } = await import('../scripts/components/Navbar.js');
        await renderNavbar();
    } else {
        initNavbar();
    }

    // Load data
    loadUserInfo();
    await loadNotifications();
    await loadFriendRequests();
    await loadFriends();

    // Setup event listeners
    setupEventListeners();

    // Hide loading
    document.getElementById('loading').style.display = 'none';

    Logger.success(' Profile Page initialized');
}

// ===== LOAD USER INFO =====
function loadUserInfo() {
    const user = profileState.currentUser;

    document.getElementById('username').value = user.name || '';
    document.getElementById('email').value = user.email || '';

    // Format member since date
    if (user.createdAt) {
        const date = new Date(user.createdAt);
        document.getElementById('memberSince').value = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    // Load profile picture if exists
    if (user.profilePicture) {
        const profilePic = document.getElementById('profilePicture');
        profilePic.innerHTML = `<img src="${user.profilePicture}" alt="Profile Picture">`;
    }
}

// ===== LOAD NOTIFICATIONS =====
async function loadNotifications() {
    profileState.notifications = await getAllNotifications();
    const unreadCount = await getUnreadCount();

    // DEBUG: Log notifications
    console.log('📬 Loaded notifications:', profileState.notifications);
    console.log('📬 Unread count:', unreadCount);

    // Update badge
    const badge = document.getElementById('notificationCount');
    badge.textContent = unreadCount;
    if (unreadCount > 0) {
        badge.classList.add('has-notifications');
    } else {
        badge.classList.remove('has-notifications');
    }

    // Render notifications
    renderNotifications();
}

function renderNotifications() {
    const container = document.getElementById('notificationsList');
    const notifications = profileState.notifications;

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
        <div class="notification-item ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
            <div class="notification-icon ${getNotificationIconClass(notification.type)}">
                <i class="${getNotificationIcon(notification.type)}"></i>
            </div>
            <div class="notification-content">
                <p><strong>${notification.title}</strong></p>
                <p>${notification.message}</p>
                <span class="notification-time">${formatTimeAgo(notification.createdAt)}</span>
            </div>
            <button class="btn btn-icon btn-danger" onclick="window.profilePage.deleteNotification(${notification.id})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function getNotificationIconClass(type) {
    if (type.includes('friend')) return 'friend-request';
    if (type.includes('task')) return 'task-share';
    return 'friend-request';
}

// ===== LOAD FRIEND REQUESTS =====
async function loadFriendRequests() {
    profileState.friendRequests = await getFriendRequests();
    const incomingCount = profileState.friendRequests.incoming.length;

    // Update badge
    const badge = document.getElementById('requestCount');
    badge.textContent = incomingCount;
    if (incomingCount > 0) {
        badge.classList.add('has-requests');
    } else {
        badge.classList.remove('has-requests');
    }

    // Render requests
    renderFriendRequests();
}

function renderFriendRequests() {
    const container = document.getElementById('requestsList');
    const requests = profileState.friendRequests.incoming;

    if (requests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <p>No pending requests</p>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="request-item" data-id="${request.id}">
            <div class="request-user-info">
                <div class="request-avatar">
                    ${escapeHtml(request.username.charAt(0).toUpperCase())}
                </div>
                <div class="request-details">
                    <h4>${escapeHtml(request.username)}</h4>
                    <p>${escapeHtml(request.friendEmail || 'No email')}</p>
                    <span class="notification-time">${formatTimeAgo(request.createdAt)}</span>
                </div>
            </div>
            <div class="request-actions">
                <button class="btn btn-success" onclick="window.profilePage.acceptRequest(${request.id})">
                    <i class="fas fa-check"></i>
                    Accept
                </button>
                <button class="btn btn-danger" onclick="window.profilePage.rejectRequest(${request.id})">
                    <i class="fas fa-times"></i>
                    Reject
                </button>
            </div>
        </div>
    `).join('');
}

// ===== LOAD FRIENDS =====
async function loadFriends() {
    profileState.friends = await getAllFriends();

    // Update count badge
    const count = profileState.friends.length;
    document.getElementById('friendsCount').textContent = count;

    // Render friends
    renderFriends();
}

function renderFriends(filteredFriends = null) {
    const container = document.getElementById('friendsList');
    const friends = filteredFriends || profileState.friends;

    if (friends.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-friends"></i>
                <p>No friends yet. Start by adding some!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = friends.map(friend => {
        const friendUsername = friend.userId === profileState.currentUser.id ? friend.friendUsername : friend.username;
        const friendEmail = friend.userId === profileState.currentUser.id ? friend.friendEmail : friend.email;

        return `
            <div class="friend-item" data-id="${friend.id}">
                <div class="friend-info">
                    <div class="friend-avatar">
                        ${escapeHtml(friendUsername.charAt(0).toUpperCase())}
                    </div>
                    <div class="friend-details">
                        <h4>${escapeHtml(friendUsername)}</h4>
                        <p>${escapeHtml(friendEmail || 'No email')}</p>
                        <div class="friend-status online">
                            <span class="status-dot"></span>
                            Online
                        </div>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn btn-icon btn-primary" title="Share Task">
                        <i class="fas fa-share-nodes"></i>
                    </button>
                    <button class="btn btn-icon btn-danger" onclick="window.profilePage.removeFriendHandler(${friend.id})" title="Remove Friend">
                        <i class="fas fa-user-minus"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== EVENT HANDLERS =====
function setupEventListeners() {
    // Profile picture change
    document.getElementById('changePictureBtn').addEventListener('click', () => {
        document.getElementById('pictureInput').click();
    });

    document.getElementById('pictureInput').addEventListener('change', handleProfilePictureChange);

    // Username edit
    document.getElementById('editUsernameBtn').addEventListener('click', handleUsernameEdit);

    // Change password
    document.getElementById('changePasswordBtn').addEventListener('click', openPasswordModal);
    document.getElementById('closePasswordModal').addEventListener('click', closePasswordModal);
    document.getElementById('cancelPasswordBtn').addEventListener('click', closePasswordModal);
    document.getElementById('changePasswordForm').addEventListener('submit', handlePasswordChange);

    // Add friend - just prevent form submission (no longer needed)
    document.getElementById('addFriendForm').addEventListener('submit', (e) => e.preventDefault());
    document.getElementById('friendSearch').addEventListener('input', handleFriendSearchInput);

    // Friends search
    document.getElementById('friendsSearchInput').addEventListener('input', handleFriendsSearch);

    // Mark all as read (click on notifications header)
    document.querySelector('.notifications-card .card-header').addEventListener('click', async () => {
        if (await getUnreadCount() > 0) {
            await markAllAsRead();
            await loadNotifications();
        }
    });

    // Close search dropdown when clicking outside
    document.addEventListener('click', (event) => {
        const searchInput = document.getElementById('friendSearch');
        const resultsContainer = document.getElementById('friendSearchResults');

        if (resultsContainer && !searchInput.contains(event.target) && !resultsContainer.contains(event.target)) {
            hideSearchResults();
        }
    });
}

// ===== PROFILE PICTURE =====
function handleProfilePictureChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
        const imageData = e.target.result;
        const profilePic = document.getElementById('profilePicture');
        profilePic.innerHTML = `<img src="${imageData}" alt="Profile Picture">`;

        // Save to user profile
        try {
            const updatedUser = await updateProfilePicture(imageData);
            profileState.currentUser = updatedUser;

            // Refresh navbar to show new picture
            initNavbar();

            Logger.success(' Profile picture updated');
        } catch (error) {
            Logger.error(' Error updating profile picture:', error);
            alert('Failed to update profile picture');
        }
    };
    reader.readAsDataURL(file);
}

// ===== USERNAME EDIT =====
let originalUsername = ''; // Store original value for cancel

async function handleUsernameEdit() {
    const input = document.getElementById('username');
    const btn = document.getElementById('editUsernameBtn');

    if (input.hasAttribute('readonly')) {
        // Store original value before editing
        originalUsername = input.value;

        // Enable editing
        input.removeAttribute('readonly');
        input.focus();
        input.select();
        btn.innerHTML = '<i class="fas fa-save"></i>';
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
        btn.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        btn.style.color = 'var(--color-success)';

        // Add cancel button to button group
        const buttonGroup = document.getElementById('usernameButtons');
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancelUsernameBtn';
        cancelBtn.className = 'edit-btn';
        cancelBtn.type = 'button';
        cancelBtn.innerHTML = '<i class="fas fa-times"></i>';
        cancelBtn.style.background = 'rgba(239, 68, 68, 0.1)';
        cancelBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        cancelBtn.style.color = 'var(--color-danger)';
        cancelBtn.onclick = cancelUsernameEdit;
        buttonGroup.appendChild(cancelBtn);
    } else {
        // Save changes
        const newUsername = input.value.trim();
        const errorDiv = document.getElementById('usernameError');

        // Hide previous error
        errorDiv.style.display = 'none';

        if (!newUsername) {
            errorDiv.textContent = 'Username cannot be empty';
            errorDiv.style.display = 'block';
            return;
        }

        // Check if name changed
        if (newUsername === originalUsername) {
            // No change, just exit edit mode
            cancelUsernameEdit();
            return;
        }

        try {
            // Check if name is available
            const isAvailable = await checkNameAvailability(newUsername);
            if (!isAvailable) {
                errorDiv.textContent = 'This name is already taken. Please choose a different name.';
                errorDiv.style.display = 'block';
                input.select();
                return;
            }

            const updatedUser = await updateUserName(newUsername);
            profileState.currentUser = updatedUser;

            input.setAttribute('readonly', true);
            btn.innerHTML = '<i class="fas fa-edit"></i>';
            btn.style.background = 'rgba(99, 102, 241, 0.1)';
            btn.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            btn.style.color = 'var(--color-primary)';

            // Remove cancel button
            const cancelBtn = document.getElementById('cancelUsernameBtn');
            if (cancelBtn) cancelBtn.remove();

            // Hide error message
            errorDiv.style.display = 'none';

            // Refresh navbar to show new username
            if (window.__SPA_MODE__) {
                // In SPA mode, use renderNavbar to re-render
                const { renderNavbar } = await import('../scripts/components/Navbar.js');
                await renderNavbar();
            } else {
                // In MPA mode, use initNavbar
                initNavbar();
            }

            Logger.success(' Username updated');
        } catch (error) {
            Logger.error(' Error updating username:', error);
            errorDiv.textContent = error.message || 'Failed to update username';
            errorDiv.style.display = 'block';
        }
    }
}

function cancelUsernameEdit() {
    const input = document.getElementById('username');
    const btn = document.getElementById('editUsernameBtn');
    const errorDiv = document.getElementById('usernameError');

    // Restore original value
    input.value = originalUsername;
    input.setAttribute('readonly', true);

    // Reset button
    btn.innerHTML = '<i class="fas fa-edit"></i>';
    btn.style.background = 'rgba(99, 102, 241, 0.1)';
    btn.style.borderColor = 'rgba(99, 102, 241, 0.3)';
    btn.style.color = 'var(--color-primary)';

    // Remove cancel button
    const cancelBtn = document.getElementById('cancelUsernameBtn');
    if (cancelBtn) cancelBtn.remove();

    // Hide error message
    errorDiv.style.display = 'none';
}

// ===== PASSWORD CHANGE =====
function openPasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'flex';
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

function closePasswordModal() {
    document.getElementById('changePasswordModal').style.display = 'none';
}

async function handlePasswordChange(event) {
    event.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate
    if (newPassword !== confirmPassword) {
        alert('New passwords do not match');
        return;
    }

    if (newPassword.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        await changePassword(currentPassword, newPassword);
        closePasswordModal();
        alert('Password changed successfully');
        Logger.success(' Password changed');
    } catch (error) {
        Logger.error(' Error changing password:', error);
        alert(error.message || 'Failed to change password');
    }
}

// ===== ADD FRIEND =====
let searchTimeout = null;

async function handleFriendSearchInput(event) {
    const query = event.target.value.trim();

    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    // Hide results if query is too short
    if (query.length < 2) {
        hideSearchResults();
        return;
    }

    // Debounce search - wait 300ms after user stops typing
    searchTimeout = setTimeout(async () => {
        try {
            const users = await searchUsers(query);
            console.log('Search results for "' + query + '":', users);
            displaySearchResults(users);
        } catch (error) {
            Logger.error('Error searching users:', error);
        }
    }, 300);
}

function displaySearchResults(users) {
    let resultsContainer = document.getElementById('friendSearchResults');

    // Create results container if it doesn't exist
    if (!resultsContainer) {
        resultsContainer = document.createElement('div');
        resultsContainer.id = 'friendSearchResults';
        resultsContainer.className = 'search-results-dropdown';

        const input = document.getElementById('friendSearch');
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(resultsContainer);
    }

    if (users.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item no-results">No users found</div>';
        resultsContainer.style.display = 'block';
        return;
    }

    resultsContainer.innerHTML = users.map(user => {
        // Check if there's already an outgoing request to this user
        const existingRequest = profileState.friendRequests.outgoing.find(
            req => req.friendId === user.id
        );

        // Check if already friends
        const isFriend = profileState.friends.some(
            friend => friend.friendId === user.id || friend.userId === user.id
        );

        let actionButton = '';
        if (isFriend) {
            actionButton = '<button class="user-action-btn friend-status" disabled><i class="fas fa-check"></i></button>';
        } else if (existingRequest) {
            actionButton = `<button class="user-action-btn cancel-request" data-request-id="${existingRequest.id}"><i class="fas fa-times"></i></button>`;
        } else {
            actionButton = '<button class="user-action-btn send-request"><i class="fas fa-plus"></i></button>';
        }

        return `
            <div class="search-result-item" data-user-id="${user.id}" data-user-name="${escapeHtml(user.name)}">
                <div class="user-avatar-small">
                    ${user.profilePicture
                        ? `<img src="${user.profilePicture}" alt="${escapeHtml(user.name)}">`
                        : '<i class="fas fa-user"></i>'}
                </div>
                <div class="user-info-small">
                    <div class="user-name-small">${escapeHtml(user.name)}</div>
                    <div class="user-email-small">${escapeHtml(user.email)}</div>
                </div>
                ${actionButton}
            </div>
        `;
    }).join('');

    // Add click handlers for action buttons
    resultsContainer.querySelectorAll('.send-request').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const item = btn.closest('.search-result-item');
            handleSendRequest(item.dataset.userId, item.dataset.userName);
        });
    });

    resultsContainer.querySelectorAll('.cancel-request').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const requestId = btn.dataset.requestId;
            const item = btn.closest('.search-result-item');
            handleCancelRequest(requestId, item.dataset.userName);
        });
    });

    resultsContainer.style.display = 'block';
}

async function handleSendRequest(userId, userName) {
    try {
        await sendFriendRequest(userId);
        Logger.success(`✅ Friend request sent to ${userName}`);

        // Reload friend requests and refresh the dropdown
        await loadFriendRequests();

        // Reload notifications (recipient will see the notification)
        await loadNotifications();

        // Re-search to refresh the dropdown with updated button states
        const input = document.getElementById('friendSearch');
        if (input.value.trim().length >= 2) {
            const users = await searchUsers(input.value.trim());
            displaySearchResults(users);
        }
    } catch (error) {
        Logger.error('❌ Error sending friend request:', error);
        // Show error to user only on failure
        alert(error.message);
    }
}

async function handleCancelRequest(requestId, userName) {
    try {
        await cancelFriendRequest(requestId);
        Logger.success(`✅ Friend request to ${userName} cancelled`);

        // Reload friend requests and refresh the dropdown
        await loadFriendRequests();

        // Re-search to refresh the dropdown with updated button states
        const input = document.getElementById('friendSearch');
        if (input.value.trim().length >= 2) {
            const users = await searchUsers(input.value.trim());
            displaySearchResults(users);
        }
    } catch (error) {
        Logger.error('❌ Error cancelling friend request:', error);
        // Show error to user only on failure
        alert(error.message);
    }
}

function hideSearchResults() {
    const resultsContainer = document.getElementById('friendSearchResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

// ===== FRIEND REQUESTS ACTIONS =====
async function acceptRequest(requestId) {
    try {
        await acceptFriendRequest(requestId);

        // Note: notifyFriendAccepted() is deprecated - notifications now handled by backend

        // Reload data
        await loadFriendRequests();
        await loadFriends();

        Logger.success(' Friend request accepted');
    } catch (error) {
        Logger.error(' Error accepting friend request:', error);
        alert('Failed to accept friend request');
    }
}

async function rejectRequest(requestId) {
    try {
        await rejectFriendRequest(requestId);
        await loadFriendRequests();
        Logger.success(' Friend request rejected');
    } catch (error) {
        Logger.error(' Error rejecting friend request:', error);
        alert('Failed to reject friend request');
    }
}

// ===== FRIENDS ACTIONS =====
async function removeFriendHandler(friendshipId) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }

    try {
        await removeFriend(friendshipId);
        await loadFriends();
        Logger.success(' Friend removed');
    } catch (error) {
        Logger.error(' Error removing friend:', error);
        alert('Failed to remove friend');
    }
}

function handleFriendsSearch(event) {
    const query = event.target.value.trim().toLowerCase();

    if (!query) {
        renderFriends(null); // Show all friends
        return;
    }

    // Local search filter
    const filtered = profileState.friends.filter(friend => {
        return friend.friendUsername.toLowerCase().includes(query) ||
               friend.friendEmail.toLowerCase().includes(query);
    });

    renderFriends(filtered);
}

// ===== NOTIFICATION ACTIONS =====
async function deleteNotificationHandler(notificationId) {
    try {
        await deleteNotification(notificationId);
        await loadNotifications();
        Logger.success(' Notification deleted');
    } catch (error) {
        Logger.error(' Error deleting notification:', error);
    }
}

// ===== EXPOSE FUNCTIONS TO WINDOW =====
window.profilePage = {
    acceptRequest,
    rejectRequest,
    removeFriendHandler,
    deleteNotification: deleteNotificationHandler
};

// ===== START =====
// For standalone HTML page (MPA mode)
if (!window.__SPA_MODE__) {
    document.addEventListener('DOMContentLoaded', initializeProfilePage);
}

// ===== SPA MODE =====

/**
 * Load Profile page for SPA
 */
export async function loadProfilePage() {
    Logger.debug('📄 Loading Profile Page...');

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

    // Initialize Profile
    await initializeProfilePage();
}

/**
 * Load CSS for Profile page
 */
function loadPageCSS() {
    const cssFiles = [
        '/public/styles/DashboardPage.css',
        '/public/styles/ProfilePage.css'
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
 * Get Profile HTML
 */
function getPageHTML() {
    return `
        <!-- Loading State -->
        <div id="loading" class="loading-state" style="display: none;">
            <div class="spinner"></div>
            <p>Loading Profile...</p>
        </div>

        <!-- Main Profile Page -->
        <div id="profile-page" class="profile-page">
            <div class="profile-container">
                <!-- Header -->
                <div class="profile-header">
                    <h1 class="profile-title">
                        <i class="fas fa-user-circle"></i>
                        My Profile
                    </h1>
                    <p class="profile-subtitle">Manage your account and connections</p>
                </div>

                <!-- Profile Content Grid -->
                <div class="profile-grid">
                    <!-- Left Column: User Info & Settings -->
                    <div class="profile-left">
                        <!-- User Info Card -->
                        <div class="card user-info-card">
                            <div class="card-header">
                                <h2>
                                    <i class="fas fa-user"></i>
                                    Personal Information
                                </h2>
                            </div>
                            <div class="card-body">
                                <!-- Profile Picture -->
                                <div class="profile-picture-section">
                                    <div class="profile-picture-wrapper">
                                        <div id="profilePicture" class="profile-picture">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <button class="change-picture-btn" id="changePictureBtn">
                                            <i class="fas fa-camera"></i>
                                        </button>
                                        <input type="file" id="pictureInput" accept="image/*" style="display: none;">
                                    </div>
                                </div>

                                <!-- User Details Form -->
                                <form id="profileForm" class="profile-form">
                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-user"></i>
                                            Username
                                        </label>
                                        <div class="input-with-buttons">
                                            <input type="text" id="username" class="form-input" readonly>
                                            <div class="button-group" id="usernameButtons">
                                                <button type="button" class="edit-btn" id="editUsernameBtn">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div id="usernameError" class="field-error" style="display: none;"></div>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-envelope"></i>
                                            Email
                                        </label>
                                        <input type="email" id="email" class="form-input" readonly>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">
                                            <i class="fas fa-calendar"></i>
                                            Member Since
                                        </label>
                                        <input type="text" id="memberSince" class="form-input" readonly>
                                    </div>

                                    <button type="button" class="btn btn-primary" id="changePasswordBtn">
                                        <i class="fas fa-key"></i>
                                        Change Password
                                    </button>
                                </form>
                            </div>
                        </div>

                        <!-- Notifications Settings Card -->
                        <div class="card notifications-card">
                            <div class="card-header">
                                <h2>
                                    <i class="fas fa-bell"></i>
                                    Notifications
                                </h2>
                                <span class="notification-badge" id="notificationCount">0</span>
                            </div>
                            <div class="card-body">
                                <div class="notifications-list" id="notificationsList">
                                    <div class="empty-state">
                                        <i class="fas fa-bell-slash"></i>
                                        <p>No new notifications</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right Column: Friends Management -->
                    <div class="profile-right">
                        <!-- Add Friend Card -->
                        <div class="card add-friend-card">
                            <div class="card-header">
                                <h2>
                                    <i class="fas fa-user-plus"></i>
                                    Add Friend
                                </h2>
                            </div>
                            <div class="card-body">
                                <form id="addFriendForm" class="add-friend-form" autocomplete="off">
                                    <div class="form-group" style="position: relative;">
                                        <input type="text" id="friendSearch" class="form-input" placeholder="Search for friends by name..." autocomplete="off">
                                    </div>
                                </form>
                            </div>
                        </div>

                        <!-- Friend Requests Card -->
                        <div class="card friend-requests-card">
                            <div class="card-header">
                                <h2>
                                    <i class="fas fa-user-clock"></i>
                                    Friend Requests
                                </h2>
                                <span class="request-badge" id="requestCount">0</span>
                            </div>
                            <div class="card-body">
                                <div class="requests-list" id="requestsList">
                                    <div class="empty-state">
                                        <i class="fas fa-inbox"></i>
                                        <p>No pending requests</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Friends List Card -->
                        <div class="card friends-list-card">
                            <div class="card-header">
                                <h2>
                                    <i class="fas fa-users"></i>
                                    My Friends
                                </h2>
                                <span class="friends-count" id="friendsCount">0</span>
                            </div>
                            <div class="card-body">
                                <div class="search-box">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="friendsSearchInput" placeholder="Search friends...">
                                </div>
                                <div class="friends-list" id="friendsList">
                                    <div class="empty-state">
                                        <i class="fas fa-user-friends"></i>
                                        <p>No friends yet. Start by adding some!</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Change Password Modal -->
        <div id="changePasswordModal" class="modal-overlay" style="display: none;">
            <div class="popup-wrapper">
                <div class="popup-content popup-main">
                    <div class="popup-header">
                        <h2>
                            <i class="fas fa-key"></i>
                            Change Password
                        </h2>
                        <button class="popup-close" id="closePasswordModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="popup-body">
                        <form id="changePasswordForm">
                            <div class="form-group">
                                <label class="form-label">Current Password</label>
                                <input type="password" id="currentPassword" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">New Password</label>
                                <input type="password" id="newPassword" class="form-input" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Confirm New Password</label>
                                <input type="password" id="confirmPassword" class="form-input" required>
                            </div>
                        </form>
                    </div>
                    <div class="popup-footer">
                        <button type="button" class="btn btn-secondary" id="cancelPasswordBtn">Cancel</button>
                        <button type="submit" form="changePasswordForm" class="btn btn-primary">
                            <i class="fas fa-check"></i>
                            Update Password
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}
