// TasksService.js - Tasks API Service
// Handles all task-related API calls

import { apiRequest } from './AuthService.js';

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
        console.log('✅ Tasks loaded:', tasks.length);
        return tasks;
    } catch (error) {
        console.error('❌ Failed to load tasks:', error);
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
        console.error('❌ Failed to load task:', error);
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
        const task = await apiRequest('/tasks', {
            method: 'POST',
            body: JSON.stringify({
                title: taskData.title,
                description: taskData.description || null,
                priority: parseInt(taskData.priority) || 2,
                dueDate: taskData.dueDate || null,
                dueTime: taskData.dueTime || null,
                isRecurring: taskData.recurring?.enabled || false,
                recurringFrequency: taskData.recurring?.frequency || null,
                recurringEndDate: taskData.recurring?.endDate || null,
                categoryId: taskData.categoryId || null
            })
        });
        console.log('✅ Task created:', task);
        return task;
    } catch (error) {
        console.error('❌ Failed to create task:', error);
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
        const task = await apiRequest(`/tasks/${taskId}`, {
            method: 'PUT',
            body: JSON.stringify({
                title: updates.title,
                description: updates.description,
                priority: updates.priority,
                dueDate: updates.dueDate,
                dueTime: updates.dueTime,
                completed: updates.completed,
                isRecurring: updates.recurring?.enabled,
                recurringFrequency: updates.recurring?.frequency,
                recurringEndDate: updates.recurring?.endDate,
                categoryId: updates.categoryId
            })
        });
        console.log('✅ Task updated:', task);
        return task;
    } catch (error) {
        console.error('❌ Failed to update task:', error);
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
        console.log('✅ Task deleted:', taskId);
    } catch (error) {
        console.error('❌ Failed to delete task:', error);
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
        console.log('✅ Task completion toggled:', taskId, completed);
        return task;
    } catch (error) {
        console.error('❌ Failed to toggle task:', error);
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
        console.log('✅ SubTask added:', subTask);
        return subTask;
    } catch (error) {
        console.error('❌ Failed to add subtask:', error);
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
        console.log('✅ SubTask updated:', subTask);
        return subTask;
    } catch (error) {
        console.error('❌ Failed to update subtask:', error);
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
        console.log('✅ SubTask deleted:', subTaskId);
    } catch (error) {
        console.error('❌ Failed to delete subtask:', error);
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
        console.log('✅ SubTask completion toggled:', subTaskId, completed);
        return subTask;
    } catch (error) {
        console.error('❌ Failed to toggle subtask:', error);
        throw error;
    }
}
