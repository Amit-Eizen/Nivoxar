// All task filtering logic in one place
import { isTaskOverdue } from '../utils/TaskUtils.js';

/**
 * Filter tasks by status (all/completed/pending)
 * @param {Array} tasks - Array of task objects
 * @param {string} status - 'all', 'completed', or 'pending'
 * @returns {Array} Filtered tasks
 */
export function filterByStatus(tasks, status) {
    if (!status || status === 'all') return tasks;
    
    if (status === 'completed') {
        return tasks.filter(t => t.completed);
    }
    
    if (status === 'pending') {
        return tasks.filter(t => !t.completed);
    }
    
    return tasks;
}

/**
 * Filter tasks by category
 * @param {Array} tasks - Array of task objects
 * @param {string} categoryId - Category ID to filter by
 * @returns {Array} Filtered tasks
 */
export function filterByCategory(tasks, categoryId) {
    if (!categoryId || categoryId === 'all') return tasks;
    
    // Special case: urgent filter
    if (categoryId === 'urgent') {
        return tasks.filter(task => task.priority >= 3 || isTaskOverdue(task));
    }
    
    // Special case: recurring filter
    if (categoryId === 'recurring') {
        return tasks.filter(task => task.recurring?.enabled);
    }
    
    // Regular category filter (case-insensitive)
    return tasks.filter(task => 
        task.category?.toLowerCase() === categoryId.toLowerCase()
    );
}

/**
 * Filter tasks by priority level
 * @param {Array} tasks - Array of task objects
 * @param {number} priority - Priority level (1-4)
 * @returns {Array} Filtered tasks
 */
export function filterByPriority(tasks, priority) {
    if (!priority) return tasks;
    
    const priorityNum = parseInt(priority);
    return tasks.filter(task => task.priority === priorityNum);
}

/**
 * Filter overdue tasks
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Overdue tasks only
 */
export function filterOverdue(tasks) {
    return tasks.filter(task => isTaskOverdue(task));
}

/**
 * Filter recurring tasks
 * @param {Array} tasks - Array of task objects
 * @param {boolean} activeOnly - If true, only return active (not completed) recurring tasks
 * @returns {Array} Recurring tasks
 */
export function filterRecurring(tasks, activeOnly = false) {
    const recurring = tasks.filter(task => task.recurring?.enabled);
    
    if (activeOnly) {
        return recurring.filter(task => !task.completed);
    }
    
    return recurring;
}

/**
 * Filter tasks by date range
 * @param {Array} tasks - Array of task objects
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {Array} Tasks within date range
 */
export function filterByDateRange(tasks, startDate, endDate) {
    if (!startDate && !endDate) return tasks;
    
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    
    return tasks.filter(task => {
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        
        if (start && dueDate < start) return false;
        if (end && dueDate > end) return false;
        
        return true;
    });
}

/**
 * Search tasks by text (title and description)
 * @param {Array} tasks - Array of task objects
 * @param {string} searchTerm - Text to search for
 * @returns {Array} Tasks matching search term
 */
export function searchTasks(tasks, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return tasks;
    
    const term = searchTerm.toLowerCase().trim();
    
    return tasks.filter(task => {
        const titleMatch = task.title?.toLowerCase().includes(term);
        const descMatch = task.description?.toLowerCase().includes(term);
        
        return titleMatch || descMatch;
    });
}

/**
 * Filter tasks with subtasks
 * @param {Array} tasks - Array of task objects
 * @param {boolean} hasSubtasks - If true, return tasks with subtasks; if false, without
 * @returns {Array} Filtered tasks
 */
export function filterBySubtasks(tasks, hasSubtasks = true) {
    if (hasSubtasks) {
        return tasks.filter(task => task.subTasks?.length > 0);
    } else {
        return tasks.filter(task => !task.subTasks || task.subTasks.length === 0);
    }
}

/**
 * MAIN FILTER FUNCTION - Apply multiple filters at once
 * @param {Array} tasks - Array of task objects
 * @param {Object} filters - Filter criteria
 * @param {string} filters.status - Status filter ('all', 'completed', 'pending')
 * @param {string} filters.category - Category ID or special value
 * @param {number} filters.priority - Priority level (1-4)
 * @param {string} filters.search - Search term
 * @param {Date} filters.startDate - Start date for date range
 * @param {Date} filters.endDate - End date for date range
 * @param {boolean} filters.overdueOnly - Show only overdue tasks
 * @param {boolean} filters.recurringOnly - Show only recurring tasks
 * @param {boolean} filters.hasSubtasks - Filter by subtasks presence
 * @returns {Array} Filtered tasks
 */
export function applyFilters(tasks, filters = {}) {
    if (!tasks || tasks.length === 0) return [];
    
    let filtered = [...tasks];
    
    // Apply status filter
    if (filters.status) {
        filtered = filterByStatus(filtered, filters.status);
    }
    
    // Apply category filter
    if (filters.category) {
        filtered = filterByCategory(filtered, filters.category);
    }
    
    // Apply priority filter
    if (filters.priority) {
        filtered = filterByPriority(filtered, filters.priority);
    }
    
    // Apply search filter
    if (filters.search) {
        filtered = searchTasks(filtered, filters.search);
    }
    
    // Apply date range filter
    if (filters.startDate || filters.endDate) {
        filtered = filterByDateRange(filtered, filters.startDate, filters.endDate);
    }
    
    // Apply overdue filter
    if (filters.overdueOnly) {
        filtered = filterOverdue(filtered);
    }
    
    // Apply recurring filter
    if (filters.recurringOnly) {
        filtered = filterRecurring(filtered, filters.activeOnly);
    }
    
    // Apply subtasks filter
    if (filters.hasSubtasks !== undefined) {
        filtered = filterBySubtasks(filtered, filters.hasSubtasks);
    }
    
    return filtered;
}

/**
 * Get filter summary statistics
 * @param {Array} tasks - Original task array
 * @param {Array} filteredTasks - Filtered task array
 * @returns {Object} Statistics about the filter results
 */
export function getFilterStats(tasks, filteredTasks) {
    return {
        total: tasks.length,
        filtered: filteredTasks.length,
        hidden: tasks.length - filteredTasks.length,
        percentage: tasks.length > 0 
            ? Math.round((filteredTasks.length / tasks.length) * 100) 
            : 0
    };
}

/**
 * Validate filter object
 * @param {Object} filters - Filter object to validate
 * @returns {boolean} True if valid
 */
export function validateFilters(filters) {
    if (!filters || typeof filters !== 'object') return false;
    
    // Validate status
    if (filters.status && !['all', 'completed', 'pending'].includes(filters.status)) {
        console.warn('Invalid status filter:', filters.status);
        return false;
    }
    
    // Validate priority
    if (filters.priority) {
        const priority = parseInt(filters.priority);
        if (isNaN(priority) || priority < 1 || priority > 4) {
            console.warn('Invalid priority filter:', filters.priority);
            return false;
        }
    }
    
    return true;
}

/**
 * Create a filter preset for common use cases
 */
export const FILTER_PRESETS = {
    ALL: { status: 'all' },
    ACTIVE: { status: 'pending' },
    COMPLETED: { status: 'completed' },
    OVERDUE: { overdueOnly: true, status: 'pending' },
    URGENT: { category: 'urgent' },
    HIGH_PRIORITY: { priority: 3 },
    URGENT_PRIORITY: { priority: 4 },
    RECURRING: { recurringOnly: true },
    WITH_SUBTASKS: { hasSubtasks: true },
    TODAY: { 
        startDate: new Date().setHours(0, 0, 0, 0),
        endDate: new Date().setHours(23, 59, 59, 999)
    }
};