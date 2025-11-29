// TasksService.js - Tasks API Service
// Handles all task-related API calls

import { apiRequest } from './AuthService.js';
import Logger from '../utils/Logger.js';

// ===== GET ALL TASKS =====

/**
 * Get all tasks for current user
 * @returns {Promise<Array>} Array of tasks
 */
export async function getTasks() {
    try {
        const tasks = await apiRequest('/tasks', {
            method: 'GET'
        });
        Logger.success(' Tasks loaded:', tasks.length);
        return tasks;
    } catch (error) {
        Logger.error(' Failed to load tasks:', error);
        throw error;
    }
}

// ===== GET SINGLE TASK =====

/**
 * Get task by ID
 * @param {number} taskId - Task ID
 * @returns {Promise<Object>} Task object
 */
export async function getTask(taskId) {
    try {
        const task = await apiRequest(`/tasks/${taskId}`, {
            method: 'GET'
        });
        return task;
    } catch (error) {
        Logger.error(' Failed to load task:', error);
        throw error;
    }
}

// ===== CREATE TASK =====

/**
 * Create new task
 * @param {Object} taskData - Task data
 * @returns {Promise<Object>} Created task
 */
export async function createTask(taskData) {
    try {
        const payload = {
            title: taskData.title,
            description: taskData.description || null,
            priority: parseInt(taskData.priority) || 2,
            dueDate: taskData.dueDate || null,
            dueTime: taskData.dueTime || null,
            isRecurring: taskData.recurring?.enabled || false,
            recurringFrequency: taskData.recurring?.frequency || null,
            recurringEndDate: taskData.recurring?.endDate || null,
            categoryId: taskData.categoryId || null
        };

        // Add subtasks if they exist
        if (taskData.subTasks && taskData.subTasks.length > 0) {
            payload.subTasks = taskData.subTasks.map(st => ({
                title: st.text || st.title,  // Support both 'text' (temp) and 'title' (API)
                completed: st.completed || false
            }));
        }

        const task = await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        Logger.success(' Task created:', task);
        return task;
    } catch (error) {
        Logger.error(' Failed to create task:', error);
        throw error;
    }
}

// ===== UPDATE TASK =====

/**
 * Update existing task
 * @param {number} taskId - Task ID
 * @param {Object} updates - Updated data
 * @returns {Promise<Object>} Updated task
 */
export async function updateTask(taskId, updates) {
    try {
        // Extract category ID (support both 'category' and 'categoryId' keys)
        let categoryId = updates.categoryId || updates.category;
        if (typeof categoryId === 'object' && categoryId !== null) {
            categoryId = categoryId.id || categoryId.categoryId;
        }
        categoryId = categoryId ? parseInt(categoryId) : null;

        const payload = {
            title: updates.title,
            description: updates.description,
            priority: updates.priority,
            categoryId: categoryId
        };

        // Only include fields that have actual values (not empty strings)
        if (updates.dueDate) payload.dueDate = updates.dueDate;
        if (updates.dueTime) payload.dueTime = updates.dueTime;
        if (updates.completed !== undefined) payload.completed = updates.completed;

        // Only include recurring fields if recurring is enabled
        if (updates.recurring?.enabled) {
            payload.isRecurring = true;
            payload.recurringFrequency = updates.recurring.frequency;
            if (updates.recurring.endDate) {
                payload.recurringEndDate = updates.recurring.endDate;
            }
        } else if (updates.recurring !== undefined) {
            // If recurring object exists but not enabled, explicitly set to false
            payload.isRecurring = false;
            payload.recurringFrequency = null;
            payload.recurringEndDate = null;
        }

        // IMPORTANT: Only add subtasks if explicitly provided and not empty
        // For edit operations, subtasks should NOT be included (managed separately)
        if (updates.subTasks && updates.subTasks.length > 0) {
            payload.subTasks = updates.subTasks.map(st => ({
                title: st.title || st.text,  // Support both 'title' and 'text' fields
                completed: st.completed || false
            }));
        }

        Logger.debug('📤 Sending update task payload:', payload);

        const task = await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        Logger.success(' Task updated:', task);
        return task;
    } catch (error) {
        Logger.error(' Failed to update task:', error);
        throw error;
    }
}

// ===== DELETE TASK =====

/**
 * Delete task
 * @param {number} taskId - Task ID
 * @returns {Promise<void>}
 */
export async function deleteTask(taskId) {
    try {
        await apiRequest(`/tasks/${taskId}`, {
            method: 'DELETE'
        });
        Logger.success(' Task deleted:', taskId);
    } catch (error) {
        Logger.error(' Failed to delete task:', error);
        throw error;
    }
}

// ===== TOGGLE TASK COMPLETION =====

/**
 * Toggle task completion status
 * @param {number} taskId - Task ID
 * @param {boolean} completed - New completion status
 * @returns {Promise<Object>} Updated task
 */
export async function toggleTaskCompletion(taskId, completed) {
    try {
        const task = await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({ completed })
        });
        Logger.success(' Task completion toggled:', taskId, completed);
        return task;
    } catch (error) {
        Logger.error(' Failed to toggle task:', error);
        throw error;
    }
}

// ===== SUBTASKS =====

/**
 * Add subtask to task
 * @param {number} taskId - Task ID
 * @param {Object} subTaskData - SubTask data
 * @returns {Promise<Object>} Created subtask
 */
export async function addSubTask(taskId, subTaskData) {
    try {
        const subTask = await apiRequest(`/tasks/${taskId}/subtasks`, {
            method: 'POST',
            body: JSON.stringify({
                title: subTaskData.title,
                description: subTaskData.description || null,
                order: subTaskData.order || 0
            })
        });
        Logger.success(' SubTask added:', subTask);
        return subTask;
    } catch (error) {
        Logger.error(' Failed to add subtask:', error);
        throw error;
    }
}

/**
 * Update subtask
 * @param {number} taskId - Task ID
 * @param {number} subTaskId - SubTask ID
 * @param {Object} updates - Updated data
 * @returns {Promise<Object>} Updated subtask
 */
export async function updateSubTask(taskId, subTaskId, updates) {
    try {
        const subTask = await apiRequest(`/tasks/${taskId}/subtasks/${subTaskId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: updates.title,
                description: updates.description,
                completed: updates.completed,
                order: updates.order
            })
        });
        Logger.success(' SubTask updated:', subTask);
        return subTask;
    } catch (error) {
        Logger.error(' Failed to update subtask:', error);
        throw error;
    }
}

/**
 * Delete subtask
 * @param {number} taskId - Task ID
 * @param {number} subTaskId - SubTask ID
 * @returns {Promise<void>}
 */
export async function deleteSubTask(taskId, subTaskId) {
    try {
        await apiRequest(`/tasks/${taskId}/subtasks/${subTaskId}`, {
            method: 'DELETE'
        });
        Logger.success(' SubTask deleted:', subTaskId);
    } catch (error) {
        Logger.error(' Failed to delete subtask:', error);
        throw error;
    }
}

/**
 * Toggle subtask completion
 * @param {number} taskId - Task ID
 * @param {number} subTaskId - SubTask ID
 * @param {boolean} completed - New completion status
 * @returns {Promise<Object>} Updated subtask
 */
export async function toggleSubTaskCompletion(taskId, subTaskId, completed) {
    try {
        const subTask = await apiRequest(`/tasks/${taskId}/subtasks/${subTaskId}`, {
            method: 'PUT',
            body: JSON.stringify({ completed })
        });
        Logger.success(' SubTask completion toggled:', subTaskId, completed);
        return subTask;
    } catch (error) {
        Logger.error(' Failed to toggle subtask:', error);
        throw error;
    }
}
