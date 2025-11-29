// SharedTasksService.js - Shared Tasks Management
import { STORAGE_KEYS } from '../utils/StorageKeys.js';
import Logger from '../utils/Logger.js';
import { getCurrentUser, apiRequest } from './AuthService.js';

// ===== USER ROLES =====
export const SHARED_TASK_ROLES = {
    OWNER: 'owner',
    EDITOR: 'editor'
};

// ===== GET ALL SHARED TASKS =====
export async function getAllSharedTasks() {
    try {
        const data = await apiRequest('/sharedtasks', {
            method: 'GET'
        });
        return data;
    } catch (error) {
        Logger.error('Error loading shared tasks:', error);
        return [];
    }
}

// ===== GET SHARED TASKS FOR CURRENT USER =====
export async function getMySharedTasks() {
    try {
        // Backend already filters for current user
        return await getAllSharedTasks();
    } catch (error) {
        Logger.error('Error loading my shared tasks:', error);
        return [];
    }
}

// ===== GET SHARED TASK BY TASK ID =====
export async function getSharedTaskByTaskId(taskId) {
    try {
        const data = await apiRequest(`/sharedtasks/task/${taskId}`, {
            method: 'GET'
        });
        return data;
    } catch (error) {
        // Don't log as error if task is simply not shared (404 is expected)
        if (error.message && error.message.includes('Shared task not found')) {
            Logger.debug('Task is not shared:', taskId);
        } else {
            Logger.error('Error getting shared task by task ID:', error);
        }
        return null;
    }
}

// ===== CHECK IF TASK IS SHARED =====
export async function isTaskShared(taskId) {
    const sharedTask = await getSharedTaskByTaskId(taskId);
    return sharedTask !== null && sharedTask !== undefined;
}

// ===== CHECK USER PERMISSION =====
export function checkPermission(sharedTask, userId) {
    if (!sharedTask) return false;

    // Owner has all permissions
    if (sharedTask.ownerId === userId) {
        return true;
    }

    // Check if user is a participant
    const participant = sharedTask.participants.find(p => p.userId === userId);
    return participant !== undefined;
}

// ===== SHARE TASK =====
export async function shareTask(taskId, taskTitle, userIds) {
    try {
        const data = await apiRequest('/sharedtasks/share', {
            method: 'POST',
            body: JSON.stringify({
                taskId: parseInt(taskId),
                userIds: userIds
            })
        });
        Logger.success(' Task shared successfully:', data);
        return data;
    } catch (error) {
        Logger.error(' Error sharing task:', error);
        throw error;
    }
}

// ===== ADD PARTICIPANTS TO SHARED TASK =====
export async function addParticipants(sharedTaskId, userIds) {
    try {
        const payload = {
            UserIds: userIds  // Capital U to match C# model
        };

        Logger.debug('📤 Adding participants:', { sharedTaskId, payload });

        const data = await apiRequest(`/sharedtasks/${sharedTaskId}/participants`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        Logger.success(' Participants added successfully');
        return data;
    } catch (error) {
        Logger.error(' Error adding participants:', error);
        throw error;
    }
}

// ===== REMOVE PARTICIPANT FROM SHARED TASK =====
export async function removeParticipant(sharedTaskId, userId) {
    try {
        await apiRequest(`/sharedtasks/${sharedTaskId}/participants/${userId}`, {
            method: 'DELETE'
        });
        Logger.success(' Participant removed successfully');
        return true;
    } catch (error) {
        Logger.error(' Error removing participant:', error);
        throw error;
    }
}

// ===== LEAVE SHARED TASK =====
export async function leaveSharedTask(sharedTaskId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('User not logged in');
        }

        return await removeParticipant(sharedTaskId, currentUser.id);
    } catch (error) {
        Logger.error(' Error leaving shared task:', error);
        throw error;
    }
}

// ===== UNSHARE TASK (OWNER ONLY) =====
export async function unshareTask(taskId) {
    try {
        await apiRequest(`/sharedtasks/task/${taskId}`, {
            method: 'DELETE'
        });
        Logger.success(' Task unshared successfully');
        return true;
    } catch (error) {
        Logger.error(' Error unsharing task:', error);
        throw error;
    }
}

// ===== UPDATE LAST EDITED =====
export async function updateLastEdited(sharedTaskId) {
    try {
        await apiRequest(`/sharedtasks/${sharedTaskId}/lastedited`, {
            method: 'PUT'
        });
        Logger.success(' Last edited updated');
    } catch (error) {
        Logger.error(' Error updating last edited:', error);
    }
}

// ===== GET PARTICIPANTS =====
export async function getParticipants(taskId) {
    try {
        const sharedTask = await getSharedTaskByTaskId(taskId);
        if (!sharedTask) return [];

        return sharedTask.participants || [];
    } catch (error) {
        Logger.error('Error getting participants:', error);
        return [];
    }
}

// ===== GET ALL PARTICIPANTS INCLUDING OWNER =====
export async function getAllParticipants(taskId) {
    try {
        const sharedTask = await getSharedTaskByTaskId(taskId);
        if (!sharedTask) return [];

        // Backend already includes owner in participants
        return sharedTask.participants || [];
    } catch (error) {
        Logger.error('Error getting all participants:', error);
        return [];
    }
}

// ===== CHECK IF USER IS OWNER =====
export async function isOwner(taskId, userId) {
    try {
        const sharedTask = await getSharedTaskByTaskId(taskId);
        if (!sharedTask) return false;

        return sharedTask.ownerId === userId;
    } catch (error) {
        Logger.error('Error checking ownership:', error);
        return false;
    }
}

// ===== GET SHARED TASKS COUNT =====
export async function getSharedTasksCount() {
    const tasks = await getMySharedTasks();
    return tasks.length;
}

// ===== UPDATE PARTICIPANT PERMISSIONS =====
export async function updateParticipantPermissions(taskId, permissions) {
    try {
        const data = await apiRequest(`/sharedtasks/${taskId}/permissions`, {
            method: 'PUT',
            body: JSON.stringify(permissions)
        });

        Logger.success(' Permissions updated successfully');
        return data;
    } catch (error) {
        Logger.error(' Error updating permissions:', error);
        throw error;
    }
}
