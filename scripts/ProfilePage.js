// ProfilePage.js - Profile Management
import { updateUser, changePassword } from '../services/AuthService.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';
import {
    getAllFriends,
    getFriendRequests,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    searchFriends,
    getFriendsCount,
    getPendingRequestsCount
} from '../services/FriendsService.js';
import {
    getAllNotifications,
    getUnreadNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    notifyFriendAccepted
} from '../services/NotificationsService.js';
import { initNavbar } from './components/Navbar.js';

// ===== STATE =====
const profileState = {
    currentUser: null,
    friends: [],
    notifications: [],
    friendRequests: { incoming: [], outgoing: [] }
};

// ===== INITIALIZATION =====
function initializeProfilePage() {
    console.log('🚀 Initializing Profile Page...');

    // Check authentication
    const user = requireAuth();
    if (!user) return;

    profileState.currentUser = user;

    // Load navbar
    initNavbar();

    // Load data
    loadUserInfo();
    loadNotifications();
    loadFriendRequests();
    loadFriends();

    // Setup event listeners
    setupEventListeners();

    // Hide loading
    document.getElementById('loading').style.display = 'none';

    console.log('✅ Profile Page initialized');
}

// ===== LOAD USER INFO =====
function loadUserInfo() {
    const user = profileState.currentUser;

    document.getElementById('username').value = user.username || '';
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
function loadNotifications() {
    profileState.notifications = getAllNotifications();
    const unreadCount = getUnreadCount();

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

// ===== LOAD FRIEND REQUESTS =====
function loadFriendRequests() {
    profileState.friendRequests = getFriendRequests();
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
                    ${request.username.charAt(0).toUpperCase()}
                </div>
                <div class="request-details">
                    <h4>${request.username}</h4>
                    <p>${request.friendEmail || 'No email'}</p>
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
function loadFriends() {
    profileState.friends = getAllFriends();

    // Update count badge
    const count = getFriendsCount();
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
                        ${friendUsername.charAt(0).toUpperCase()}
                    </div>
                    <div class="friend-details">
                        <h4>${friendUsername}</h4>
                        <p>${friendEmail || 'No email'}</p>
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

    // Add friend
    document.getElementById('addFriendForm').addEventListener('submit', handleAddFriend);

    // Friends search
    document.getElementById('friendsSearchInput').addEventListener('input', handleFriendsSearch);

    // Mark all as read (click on notifications header)
    document.querySelector('.notifications-card .card-header').addEventListener('click', () => {
        if (getUnreadCount() > 0) {
            markAllAsRead();
            loadNotifications();
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
    reader.onload = (e) => {
        const imageData = e.target.result;
        const profilePic = document.getElementById('profilePicture');
        profilePic.innerHTML = `<img src="${imageData}" alt="Profile Picture">`;

        // Save to user profile
        try {
            profileState.currentUser.profilePicture = imageData;
            updateUser(profileState.currentUser);

            // Refresh navbar to show new picture
            initNavbar();

            console.log('✅ Profile picture updated');
        } catch (error) {
            console.error('❌ Error updating profile picture:', error);
            alert('Failed to update profile picture');
        }
    };
    reader.readAsDataURL(file);
}

// ===== USERNAME EDIT =====
function handleUsernameEdit() {
    const input = document.getElementById('username');
    const btn = document.getElementById('editUsernameBtn');

    if (input.hasAttribute('readonly')) {
        // Enable editing
        input.removeAttribute('readonly');
        input.focus();
        input.select();
        btn.innerHTML = '<i class="fas fa-save"></i>';
        btn.style.background = 'rgba(34, 197, 94, 0.1)';
        btn.style.borderColor = 'rgba(34, 197, 94, 0.3)';
        btn.style.color = 'var(--color-success)';
    } else {
        // Save changes
        const newUsername = input.value.trim();
        if (!newUsername) {
            alert('Username cannot be empty');
            return;
        }

        try {
            profileState.currentUser.username = newUsername;
            updateUser(profileState.currentUser);

            input.setAttribute('readonly', true);
            btn.innerHTML = '<i class="fas fa-edit"></i>';
            btn.style.background = 'rgba(99, 102, 241, 0.1)';
            btn.style.borderColor = 'rgba(99, 102, 241, 0.3)';
            btn.style.color = 'var(--color-primary)';

            // Refresh navbar to show new username
            initNavbar();

            console.log('✅ Username updated');
        } catch (error) {
            console.error('❌ Error updating username:', error);
            alert('Failed to update username');
        }
    }
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

function handlePasswordChange(event) {
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
        changePassword(currentPassword, newPassword);
        closePasswordModal();
        alert('Password changed successfully');
        console.log('✅ Password changed');
    } catch (error) {
        console.error('❌ Error changing password:', error);
        alert(error.message);
    }
}

// ===== ADD FRIEND =====
function handleAddFriend(event) {
    event.preventDefault();

    const input = document.getElementById('friendSearch');
    const usernameOrEmail = input.value.trim();

    if (!usernameOrEmail) {
        alert('Please enter a username or email');
        return;
    }

    try {
        const request = sendFriendRequest(usernameOrEmail);
        input.value = '';
        alert(`Friend request sent to ${request.friendUsername}`);
        console.log('✅ Friend request sent');
    } catch (error) {
        console.error('❌ Error sending friend request:', error);
        alert(error.message);
    }
}

// ===== FRIEND REQUESTS ACTIONS =====
function acceptRequest(requestId) {
    try {
        const request = acceptFriendRequest(requestId);

        // Create notification for the friend
        notifyFriendAccepted(request.userId, profileState.currentUser.username);

        // Reload data
        loadFriendRequests();
        loadFriends();

        console.log('✅ Friend request accepted');
    } catch (error) {
        console.error('❌ Error accepting friend request:', error);
        alert('Failed to accept friend request');
    }
}

function rejectRequest(requestId) {
    try {
        rejectFriendRequest(requestId);
        loadFriendRequests();
        console.log('✅ Friend request rejected');
    } catch (error) {
        console.error('❌ Error rejecting friend request:', error);
        alert('Failed to reject friend request');
    }
}

// ===== FRIENDS ACTIONS =====
function removeFriendHandler(friendshipId) {
    if (!confirm('Are you sure you want to remove this friend?')) {
        return;
    }

    try {
        removeFriend(friendshipId);
        loadFriends();
        console.log('✅ Friend removed');
    } catch (error) {
        console.error('❌ Error removing friend:', error);
        alert('Failed to remove friend');
    }
}

function handleFriendsSearch(event) {
    const query = event.target.value.trim();
    const filtered = searchFriends(query);
    renderFriends(filtered);
}

// ===== NOTIFICATION ACTIONS =====
function deleteNotificationHandler(notificationId) {
    try {
        deleteNotification(notificationId);
        loadNotifications();
        console.log('✅ Notification deleted');
    } catch (error) {
        console.error('❌ Error deleting notification:', error);
    }
}

// ===== UTILITY FUNCTIONS =====
function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

    return date.toLocaleDateString();
}

// ===== EXPOSE FUNCTIONS TO WINDOW =====
window.profilePage = {
    acceptRequest,
    rejectRequest,
    removeFriendHandler,
    deleteNotification: deleteNotificationHandler
};

// ===== START =====
document.addEventListener('DOMContentLoaded', initializeProfilePage);
