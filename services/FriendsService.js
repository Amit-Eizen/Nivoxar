// FriendsService.js - Friends & Friend Requests Management
import { STORAGE_KEYS } from '../utils/StorageKeys.js';
import { getCurrentUser } from './AuthService.js';

// ===== FRIEND REQUEST STATUS =====
export const FRIEND_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected'
};

// ===== GET ALL FRIENDS =====
export function getAllFriends() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return [];

        const friends = localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]';
        const allFriends = JSON.parse(friends);

        // Return only accepted friends for current user
        return allFriends.filter(f =>
            f.status === FRIEND_STATUS.ACCEPTED &&
            (f.userId === currentUser.id || f.friendId === currentUser.id)
        );
    } catch (error) {
        console.error('Error loading friends:', error);
        return [];
    }
}

// ===== GET FRIEND REQUESTS =====
export function getFriendRequests() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return { incoming: [], outgoing: [] };

        const friends = localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]';
        const allFriends = JSON.parse(friends);

        const incoming = allFriends.filter(f =>
            f.friendId === currentUser.id &&
            f.status === FRIEND_STATUS.PENDING
        );

        const outgoing = allFriends.filter(f =>
            f.userId === currentUser.id &&
            f.status === FRIEND_STATUS.PENDING
        );

        return { incoming, outgoing };
    } catch (error) {
        console.error('Error loading friend requests:', error);
        return { incoming: [], outgoing: [] };
    }
}

// ===== SEND FRIEND REQUEST =====
export function sendFriendRequest(usernameOrEmail) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('User not logged in');
        }

        // Get all users
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');

        // Find target user
        const targetUser = users.find(u =>
            (u.username === usernameOrEmail || u.email === usernameOrEmail) &&
            u.id !== currentUser.id
        );

        if (!targetUser) {
            throw new Error('User not found');
        }

        // Check if friendship already exists
        const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
        const existingFriendship = friends.find(f =>
            (f.userId === currentUser.id && f.friendId === targetUser.id) ||
            (f.userId === targetUser.id && f.friendId === currentUser.id)
        );

        if (existingFriendship) {
            if (existingFriendship.status === FRIEND_STATUS.ACCEPTED) {
                throw new Error('Already friends');
            } else if (existingFriendship.status === FRIEND_STATUS.PENDING) {
                throw new Error('Friend request already sent');
            }
        }

        // Create friend request
        const friendRequest = {
            id: Date.now(),
            userId: currentUser.id,
            username: currentUser.username,
            friendId: targetUser.id,
            friendUsername: targetUser.username,
            friendEmail: targetUser.email,
            status: FRIEND_STATUS.PENDING,
            createdAt: new Date().toISOString()
        };

        friends.push(friendRequest);
        localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));

        console.log('✅ Friend request sent to:', targetUser.username);
        return friendRequest;
    } catch (error) {
        console.error('❌ Error sending friend request:', error);
        throw error;
    }
}

// ===== ACCEPT FRIEND REQUEST =====
export function acceptFriendRequest(requestId) {
    try {
        const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
        const request = friends.find(f => f.id === requestId);

        if (!request) {
            throw new Error('Friend request not found');
        }

        request.status = FRIEND_STATUS.ACCEPTED;
        request.acceptedAt = new Date().toISOString();

        localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
        console.log('✅ Friend request accepted');
        return request;
    } catch (error) {
        console.error('❌ Error accepting friend request:', error);
        throw error;
    }
}

// ===== REJECT FRIEND REQUEST =====
export function rejectFriendRequest(requestId) {
    try {
        const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
        const updatedFriends = friends.filter(f => f.id !== requestId);

        localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(updatedFriends));
        console.log('✅ Friend request rejected');
        return true;
    } catch (error) {
        console.error('❌ Error rejecting friend request:', error);
        throw error;
    }
}

// ===== REMOVE FRIEND =====
export function removeFriend(friendshipId) {
    try {
        const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
        const updatedFriends = friends.filter(f => f.id !== friendshipId);

        localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(updatedFriends));
        console.log('✅ Friend removed');
        return true;
    } catch (error) {
        console.error('❌ Error removing friend:', error);
        throw error;
    }
}

// ===== GET FRIEND BY ID =====
export function getFriendById(friendshipId) {
    try {
        const friends = JSON.parse(localStorage.getItem(STORAGE_KEYS.FRIENDS) || '[]');
        return friends.find(f => f.id === friendshipId);
    } catch (error) {
        console.error('Error getting friend:', error);
        return null;
    }
}

// ===== SEARCH FRIENDS =====
export function searchFriends(query) {
    try {
        const allFriends = getAllFriends();
        const currentUser = getCurrentUser();

        if (!query) return allFriends;

        const searchTerm = query.toLowerCase();

        return allFriends.filter(f => {
            // Get the friend's username (not the current user's)
            const friendUsername = f.userId === currentUser.id ? f.friendUsername : f.username;
            return friendUsername.toLowerCase().includes(searchTerm);
        });
    } catch (error) {
        console.error('Error searching friends:', error);
        return [];
    }
}

// ===== GET FRIENDS COUNT =====
export function getFriendsCount() {
    return getAllFriends().length;
}

// ===== GET PENDING REQUESTS COUNT =====
export function getPendingRequestsCount() {
    const { incoming } = getFriendRequests();
    return incoming.length;
}
