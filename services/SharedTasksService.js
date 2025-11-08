// SharedTasksService.js - Shared Tasks Management
import { STORAGE_KEYS } from '../utils/StorageKeys.js';
import { getCurrentUser } from './AuthService.js';
import { notifyTaskShared, notifyTaskUpdated } from './NotificationsService.js';

// ===== USER ROLES =====
export const SHARED_TASK_ROLES = {
    OWNER: 'owner',
    EDITOR: 'editor'
};

// ===== GET ALL SHARED TASKS =====
export function getAllSharedTasks() {
    try {
        const sharedTasks = localStorage.getItem(STORAGE_KEYS.SHARED_TASKS) || '[]';
        return JSON.parse(sharedTasks);
    } catch (error) {
        console.error('Error loading shared tasks:', error);
        return [];
    }
}

// ===== GET SHARED TASKS FOR CURRENT USER =====
export function getMySharedTasks() {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) return [];

        const allSharedTasks = getAllSharedTasks();

        // Return tasks where user is owner or participant
        return allSharedTasks.filter(st =>
            st.ownerId === currentUser.id ||
            st.sharedWith.some(p => p.userId === currentUser.id)
        );
    } catch (error) {
        console.error('Error loading my shared tasks:', error);
        return [];
    }
}

// ===== GET SHARED TASK BY ID =====
export function getSharedTaskById(sharedTaskId) {
    try {
        const allSharedTasks = getAllSharedTasks();
        return allSharedTasks.find(st => st.id === sharedTaskId);
    } catch (error) {
        console.error('Error getting shared task:', error);
        return null;
    }
}

// ===== GET SHARED TASK BY TASK ID =====
export function getSharedTaskByTaskId(taskId) {
    try {
        const allSharedTasks = getAllSharedTasks();
        const found = allSharedTasks.find(st => st.taskId === taskId);
        return found || null;
    } catch (error) {
        console.error('Error getting shared task by task ID:', error);
        return null;
    }
}

// ===== CHECK IF TASK IS SHARED =====
export function isTaskShared(taskId) {
    const sharedTask = getSharedTaskByTaskId(taskId);
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
    const participant = sharedTask.sharedWith.find(p => p.userId === userId);
    return participant !== undefined;
}

// ===== SHARE TASK =====
export function shareTask(taskId, taskTitle, userIds) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('User not logged in');
        }

        // Check if task is already shared
        const existingSharedTask = getSharedTaskByTaskId(taskId);
        if (existingSharedTask) {
            throw new Error('Task is already shared. Use addParticipants instead.');
        }

        // Get user information for participants
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const sharedWith = userIds.map(userId => {
            const user = users.find(u => u.id === userId);
            if (!user) return null;

            return {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: SHARED_TASK_ROLES.EDITOR,
                addedAt: new Date().toISOString()
            };
        }).filter(p => p !== null);

        if (sharedWith.length === 0) {
            throw new Error('No valid users to share with');
        }

        // Create shared task
        const sharedTask = {
            id: Date.now(),
            taskId: taskId,
            ownerId: currentUser.id,
            ownerUsername: currentUser.username,
            sharedWith: sharedWith,
            permissions: {
                canEdit: true,
                canAddSubtasks: true,
                canShare: true,
                canDelete: false // Only owner can delete
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastEditedBy: currentUser.username
        };

        // Save to storage
        const allSharedTasks = getAllSharedTasks();
        allSharedTasks.push(sharedTask);
        localStorage.setItem(STORAGE_KEYS.SHARED_TASKS, JSON.stringify(allSharedTasks));

        // Send notifications to all participants
        sharedWith.forEach(participant => {
            notifyTaskShared(participant.userId, taskTitle, currentUser.username);
        });

        console.log('✅ Task shared successfully:', sharedTask);
        return sharedTask;
    } catch (error) {
        console.error('❌ Error sharing task:', error);
        throw error;
    }
}

// ===== ADD PARTICIPANTS TO SHARED TASK =====
export function addParticipants(taskId, taskTitle, userIds) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('User not logged in');
        }

        const sharedTask = getSharedTaskByTaskId(taskId);
        if (!sharedTask) {
            throw new Error('Task is not shared');
        }

        // Check permission
        if (!checkPermission(sharedTask, currentUser.id)) {
            throw new Error('You do not have permission to add participants');
        }

        // Get user information
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const newParticipants = userIds.map(userId => {
            // Skip if already shared with this user
            if (sharedTask.sharedWith.some(p => p.userId === userId)) {
                return null;
            }

            const user = users.find(u => u.id === userId);
            if (!user) return null;

            return {
                userId: user.id,
                username: user.username,
                email: user.email,
                role: SHARED_TASK_ROLES.EDITOR,
                addedAt: new Date().toISOString()
            };
        }).filter(p => p !== null);

        if (newParticipants.length === 0) {
            throw new Error('No new participants to add');
        }

        // Add participants
        sharedTask.sharedWith.push(...newParticipants);
        sharedTask.updatedAt = new Date().toISOString();
        sharedTask.lastEditedBy = currentUser.username;

        // Save to storage
        const allSharedTasks = getAllSharedTasks();
        const index = allSharedTasks.findIndex(st => st.id === sharedTask.id);
        if (index !== -1) {
            allSharedTasks[index] = sharedTask;
            localStorage.setItem(STORAGE_KEYS.SHARED_TASKS, JSON.stringify(allSharedTasks));
        }

        // Send notifications
        newParticipants.forEach(participant => {
            notifyTaskShared(participant.userId, taskTitle, currentUser.username);
        });

        console.log('✅ Participants added successfully');
        return sharedTask;
    } catch (error) {
        console.error('❌ Error adding participants:', error);
        throw error;
    }
}

// ===== REMOVE PARTICIPANT FROM SHARED TASK =====
export function removeParticipant(taskId, userId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('User not logged in');
        }

        const sharedTask = getSharedTaskByTaskId(taskId);
        if (!sharedTask) {
            throw new Error('Task is not shared');
        }

        // Only owner can remove participants
        if (sharedTask.ownerId !== currentUser.id && userId !== currentUser.id) {
            throw new Error('Only owner can remove participants');
        }

        // Remove participant
        sharedTask.sharedWith = sharedTask.sharedWith.filter(p => p.userId !== userId);
        sharedTask.updatedAt = new Date().toISOString();
        sharedTask.lastEditedBy = currentUser.username;

        // Save to storage
        const allSharedTasks = getAllSharedTasks();
        const index = allSharedTasks.findIndex(st => st.id === sharedTask.id);
        if (index !== -1) {
            allSharedTasks[index] = sharedTask;
            localStorage.setItem(STORAGE_KEYS.SHARED_TASKS, JSON.stringify(allSharedTasks));
        }

        console.log('✅ Participant removed successfully');
        return sharedTask;
    } catch (error) {
        console.error('❌ Error removing participant:', error);
        throw error;
    }
}

// ===== LEAVE SHARED TASK =====
export function leaveSharedTask(taskId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('User not logged in');
        }

        return removeParticipant(taskId, currentUser.id);
    } catch (error) {
        console.error('❌ Error leaving shared task:', error);
        throw error;
    }
}

// ===== UNSHARE TASK (OWNER ONLY) =====
export function unshareTask(taskId) {
    try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
            throw new Error('User not logged in');
        }

        const sharedTask = getSharedTaskByTaskId(taskId);
        if (!sharedTask) {
            throw new Error('Task is not shared');
        }

        // Only owner can unshare
        if (sharedTask.ownerId !== currentUser.id) {
            throw new Error('Only owner can unshare tasks');
        }

        // Remove from storage
        const allSharedTasks = getAllSharedTasks();
        const updatedSharedTasks = allSharedTasks.filter(st => st.taskId !== taskId);
        localStorage.setItem(STORAGE_KEYS.SHARED_TASKS, JSON.stringify(updatedSharedTasks));

        console.log('✅ Task unshared successfully');
        return true;
    } catch (error) {
        console.error('❌ Error unsharing task:', error);
        throw error;
    }
}

// ===== UPDATE LAST EDITED =====
export function updateLastEdited(taskId, username) {
    try {
        const sharedTask = getSharedTaskByTaskId(taskId);
        if (!sharedTask) return;

        sharedTask.updatedAt = new Date().toISOString();
        sharedTask.lastEditedBy = username;

        // Save to storage
        const allSharedTasks = getAllSharedTasks();
        const index = allSharedTasks.findIndex(st => st.id === sharedTask.id);
        if (index !== -1) {
            allSharedTasks[index] = sharedTask;
            localStorage.setItem(STORAGE_KEYS.SHARED_TASKS, JSON.stringify(allSharedTasks));
        }

        // Notify all participants except the editor
        const currentUser = getCurrentUser();
        if (currentUser) {
            sharedTask.sharedWith.forEach(participant => {
                if (participant.userId !== currentUser.id) {
                    // Get task title
                    const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
                    const task = tasks.find(t => t.id === taskId);
                    if (task) {
                        notifyTaskUpdated(participant.userId, task.title, username);
                    }
                }
            });

            // Also notify owner if they're not the editor
            if (sharedTask.ownerId !== currentUser.id) {
                const tasks = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASKS) || '[]');
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    notifyTaskUpdated(sharedTask.ownerId, task.title, username);
                }
            }
        }
    } catch (error) {
        console.error('❌ Error updating last edited:', error);
    }
}

// ===== GET PARTICIPANTS =====
export function getParticipants(taskId) {
    try {
        const sharedTask = getSharedTaskByTaskId(taskId);
        if (!sharedTask) return [];

        return sharedTask.sharedWith;
    } catch (error) {
        console.error('Error getting participants:', error);
        return [];
    }
}

// ===== GET ALL PARTICIPANTS INCLUDING OWNER =====
export function getAllParticipants(taskId) {
    try {
        const sharedTask = getSharedTaskByTaskId(taskId);
        if (!sharedTask) return [];

        // Include owner
        const owner = {
            userId: sharedTask.ownerId,
            username: sharedTask.ownerUsername,
            role: SHARED_TASK_ROLES.OWNER,
            addedAt: sharedTask.createdAt
        };

        return [owner, ...sharedTask.sharedWith];
    } catch (error) {
        console.error('Error getting all participants:', error);
        return [];
    }
}

// ===== CHECK IF USER IS OWNER =====
export function isOwner(taskId, userId) {
    try {
        const sharedTask = getSharedTaskByTaskId(taskId);
        if (!sharedTask) return false;

        return sharedTask.ownerId === userId;
    } catch (error) {
        console.error('Error checking ownership:', error);
        return false;
    }
}

// ===== GET SHARED TASKS COUNT =====
export function getSharedTasksCount() {
    return getMySharedTasks().length;
}
