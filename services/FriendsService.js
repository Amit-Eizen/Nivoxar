// FriendsService.js - Friends & Friend Requests Management (API-based)
import { apiRequest } from './AuthService.js';
import Logger from '../utils/Logger.js';

// ===== CONFIGURATION =====
const CONFIG = {
    apiBaseURL: '/friends'
};

// ===== FRIEND REQUEST STATUS =====
export const FRIEND_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    REJECTED: 'rejected'
};

// ===== GET ALL FRIENDS =====
export async function getAllFriends() {
    try {
        const friends = await apiRequest(CONFIG.apiBaseURL, {
            method: 'GET'
        });
        Logger.success(' Friends loaded from API:', friends.length);
        return friends;
    } catch (error) {
        Logger.error(' Failed to load friends from API:', error);
        return [];
    }
}

// ===== GET FRIEND REQUESTS =====
export async function getFriendRequests() {
    try {
        const data = await apiRequest(`${CONFIG.apiBaseURL}/requests`, {
            method: 'GET'
        });
        Logger.success(' Friend requests loaded:', data);
        return data; // { incoming: [], outgoing: [] }
    } catch (error) {
        Logger.error(' Failed to load friend requests:', error);
        return { incoming: [], outgoing: [] };
    }
}

// ===== SEARCH USERS =====
export async function searchUsers(query) {
    try {
        const users = await apiRequest(`${CONFIG.apiBaseURL}/search`, {
            method: 'POST',
            body: JSON.stringify({ Query: query }) // PascalCase for C#
        });
        Logger.success(' Users found:', users.length);
        return users;
    } catch (error) {
        Logger.error(' Failed to search users:', error);
        throw error;
    }
}

// ===== SEND FRIEND REQUEST =====
export async function sendFriendRequest(friendId) {
    try {
        const friendRequest = await apiRequest(`${CONFIG.apiBaseURL}/request`, {
            method: 'POST',
            body: JSON.stringify({ FriendId: friendId }) // PascalCase for C#
        });
        Logger.success(' Friend request sent:', friendRequest);
        return friendRequest;
    } catch (error) {
        Logger.error(' Failed to send friend request:', error);
        throw error;
    }
}

// ===== ACCEPT FRIEND REQUEST =====
export async function acceptFriendRequest(requestId) {
    try {
        const request = await apiRequest(`${CONFIG.apiBaseURL}/${requestId}/accept`, {
            method: 'PUT'
        });
        Logger.success(' Friend request accepted:', request);
        return request;
    } catch (error) {
        Logger.error(' Failed to accept friend request:', error);
        throw error;
    }
}

// ===== REJECT FRIEND REQUEST =====
export async function rejectFriendRequest(requestId) {
    try {
        await apiRequest(`${CONFIG.apiBaseURL}/${requestId}/reject`, {
            method: 'PUT'
        });
        Logger.success(' Friend request rejected');
        return true;
    } catch (error) {
        Logger.error(' Failed to reject friend request:', error);
        throw error;
    }
}

// ===== CANCEL FRIEND REQUEST (for outgoing requests) =====
export async function cancelFriendRequest(requestId) {
    try {
        await apiRequest(`${CONFIG.apiBaseURL}/${requestId}`, {
            method: 'DELETE'
        });
        Logger.success(' Friend request cancelled');
        return true;
    } catch (error) {
        Logger.error(' Failed to cancel friend request:', error);
        throw error;
    }
}

// ===== REMOVE FRIEND =====
export async function removeFriend(friendshipId) {
    try {
        await apiRequest(`${CONFIG.apiBaseURL}/${friendshipId}`, {
            method: 'DELETE'
        });
        Logger.success(' Friend removed');
        return true;
    } catch (error) {
        Logger.error(' Failed to remove friend:', error);
        throw error;
    }
}
