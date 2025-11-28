// TaskUtils.js - Utility functions for task management
import { getAllCategoriesSync } from '../../services/CategoryService.js';
import Logger from './Logger.js';
import { STORAGE_KEYS } from './StorageKeys.js';

// Priority configuration (merged into one object)
export const PRIORITIES = {
    1: { name: 'low', display: 'Low' },
    2: { name: 'medium', display: 'Medium' },
    3: { name: 'high', display: 'High' },
    4: { name: 'urgent', display: 'Urgent' }
};

// Get priority name (for CSS classes)
export function getPriorityName(priorityNum) {
    return PRIORITIES[priorityNum]?.name || 'medium';
}

// Get priority display name (for UI)
export function getPriorityDisplayName(priorityNum) {
    return PRIORITIES[priorityNum]?.display || 'Medium';
}

// ========== LOCALSTORAGE UTILITIES ==========

// Save tasks to localStorage (centralized function)
export function saveTasksToLocalStorage(tasks) {
    try {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
        Logger.info('✅ Saved tasks to localStorage');
        return true;
    } catch (error) {
        Logger.error('❌ Failed to save tasks to localStorage:', error);
        return false;
    }
}

// Load tasks from localStorage (centralized function)
export function loadTasksFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (saved) {
            const tasks = JSON.parse(saved);
            Logger.info('✅ Loaded tasks from localStorage:', tasks.length);
            return tasks;
        }
        Logger.info('ℹ️ No tasks found in localStorage');
        return [];
    } catch (error) {
        Logger.error('❌ Failed to load tasks from localStorage:', error);
        return [];
    }
}

// Format date to readable string
export function formatDate(dateString) {
    if (!dateString) return 'No date';
    
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);
    
    if (dateOnly.getTime() === today.getTime()) return 'Today';
    if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Format time to readable string
export function formatTime(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    
    return `${displayHour}:${minutes} ${ampm}`;
}

// Check if task is overdue
export function isTaskOverdue(task) {
    if (!task.dueDate || task.completed) return false;
    
    const now = new Date();
    const dueDate = new Date(task.dueDate);
    
    if (task.dueTime) {
        const [hours, minutes] = task.dueTime.split(':');
        dueDate.setHours(parseInt(hours), parseInt(minutes));
    } else {
        dueDate.setHours(23, 59, 59);
    }
    
    return now > dueDate;
}

// Calculate analytics from tasks
export function calculateAnalytics(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    let totalSubTasks = 0;
    let completedSubTasks = 0;
    
    tasks.forEach(task => {
        if (task.subTasks?.length > 0) {
            totalSubTasks += task.subTasks.length;
            completedSubTasks += task.subTasks.filter(st => st.completed).length;
        }
    });
    
    const recurringTasks = tasks.filter(t => t.recurring?.enabled);
    const activeRecurring = recurringTasks.filter(t => !t.completed).length;
    
    return { total, completed, pending, completionRate, totalSubTasks,
        completedSubTasks, recurringTasks: recurringTasks.length, activeRecurring
    };
}

// Get category color from CategoryService
export function getCategoryColor(category) {
    if (!category) {
        return '#6366f1'; // Default color
    }

    // Get categories from CategoryService (sync first, fallback to default if empty)
    let categories = getAllCategoriesSync();

    // If cache is empty, try to load it (this happens on first render)
    if (!categories || categories.length === 0) {
        // Return default color immediately to avoid blocking
        // The cache will be populated by DashboardPage initialization
        return '#6366f1';
    }

    // If category is an object, extract the ID or name
    let categoryValue = category;
    if (typeof category === 'object' && category !== null) {
        categoryValue = category.id || category.name || category;
    }

    // Find category by ID or name (case-insensitive)
    const found = categories.find(cat => {
        if (typeof categoryValue === 'number') {
            return cat.id === categoryValue;
        } else if (typeof categoryValue === 'string') {
            return cat.id === categoryValue || cat.name.toLowerCase() === categoryValue.toLowerCase();
        }
        return false;
    });

    return found ? found.color : '#6366f1'; // Fallback to default if not found
}

// Create checkbox element
function createTaskCheckbox(task) {
    const checkbox = document.createElement('label');
    checkbox.className = 'task-checkbox';
    checkbox.innerHTML = `
        <input type="checkbox" ${task.completed ? 'checked' : ''}>
        <span class="checkmark"></span>
    `;
    return checkbox;
}

// Create task header
function createTaskHeader(task) {
    const header = document.createElement('div');
    header.className = 'task-header';

    // Get category name and color - support both API format (Category object) and local format (category)
    const categorySource = task.Category || task.category || task.categoryId;
    const categoryName = categorySource ? getCategoryName(categorySource) : '';
    const categoryColor = categorySource ? getCategoryColor(categorySource) : '';

    // Check if task is shared
    const isSharedTask = task.isSharedTask || false;
    const sharedBadge = isSharedTask
        ? `<span class="task-shared-badge" title="Shared by ${task.taskOwnerUsername || 'someone'}">
            <i class="fas fa-users"></i> Shared
           </span>`
        : '';

    header.innerHTML = `
        <h3 class="task-title">${task.title}</h3>
        ${categoryName ? `<span class="task-category" style="background-color: ${categoryColor}; color: white;">${categoryName}</span>` : ''}
        ${sharedBadge}
    `;
    return header;
}

// Create task description
function createTaskDescription(task) {
    if (!task.description) return null;
    
    const desc = document.createElement('p');
    desc.className = 'task-description';
    desc.textContent = task.description;
    return desc;
}

// Create task meta info
function createTaskMeta(task) {
    const meta = document.createElement('div');
    meta.className = 'task-meta';
    
    let metaHTML = `<span class="task-priority priority-${getPriorityName(task.priority)}">
        <i class="fas fa-flag"></i> ${getPriorityDisplayName(task.priority)}
    </span>`;
    
    if (task.dueDate) {
        const dateText = formatDate(task.dueDate);
        const timeText = task.dueTime ? formatTime(task.dueTime) : '';
        metaHTML += `<span class="task-due ${isTaskOverdue(task) ? 'overdue' : ''}">
            <i class="fas fa-clock"></i> ${dateText} ${timeText}
        </span>`;
    }
    
    if (task.recurring?.enabled) {
        metaHTML += `<span class="task-recurring">
            <i class="fas fa-sync-alt"></i> ${task.recurring.frequency}
        </span>`;
    }
    
    meta.innerHTML = metaHTML;
    return meta;
}

// Create subtasks progress bar
function createSubTasksProgress(task) {
    if (!task.subTasks?.length) return null;
    
    const completedCount = task.subTasks.filter(st => st.completed).length;
    const totalCount = task.subTasks.length;
    const percentage = Math.round((completedCount / totalCount) * 100);
    
    const progressDiv = document.createElement('div');
    progressDiv.className = 'subtasks-progress';
    progressDiv.innerHTML = `
        <div class="progress-text">
            <i class="fas fa-list-check"></i>
            <span>SubTasks: ${completedCount}/${totalCount} (${percentage}%)</span>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar-fill" style="width: ${percentage}%"></div>
        </div>
    `;
    return progressDiv;
}

// Create task actions (buttons)
function createTaskActions(task) {
    const actions = document.createElement('div');
    actions.className = 'task-actions';

    // Check if this is a shared task and get permissions
    const isSharedTask = task.isSharedTask || false;
    const permissions = task.permissions || {};
    const canEdit = isSharedTask ? (permissions.canEdit || false) : true;
    const canDelete = isSharedTask ? (permissions.canDelete || false) : true;
    const canAddSubtasks = isSharedTask ? (permissions.canAddSubtasks !== false) : true; // Default true for shared tasks
    const canShare = isSharedTask ? (permissions.canShare || false) : true;

    // SubTasks button - show if has subtasks OR can add subtasks
    if (task.subTasks?.length > 0 || canAddSubtasks) {
        const completedCount = task.subTasks?.filter(st => st.completed).length || 0;
        const totalCount = task.subTasks?.length || 0;
        const subtasksBtn = document.createElement('button');
        subtasksBtn.className = 'task-action-btn task-subtasks-btn';
        subtasksBtn.title = canAddSubtasks ? 'Manage SubTasks' : 'View SubTasks';
        subtasksBtn.innerHTML = totalCount > 0
            ? `<i class="fas fa-list-check"></i><span class="subtasks-count">${completedCount}/${totalCount}</span>`
            : '<i class="fas fa-list-check"></i>';
        if (!canAddSubtasks) {
            subtasksBtn.classList.add('disabled');
            subtasksBtn.disabled = true;
        }
        actions.appendChild(subtasksBtn);
    }

    // Share button - only show if can share OR already shared (to view)
    const isShared = task.isShared || task.sharedTask || isSharedTask;
    if (canShare || isShared) {
        const shareBtn = document.createElement('button');
        shareBtn.className = `task-action-btn task-share${isShared ? ' shared' : ''}`;
        shareBtn.title = isShared ? 'Task is Shared' : 'Share Task';
        shareBtn.innerHTML = '<i class="fas fa-share-nodes"></i>';
        shareBtn.dataset.taskId = task.id;
        if (!canShare && isShared) {
            shareBtn.classList.add('disabled');
            shareBtn.disabled = true;
        }
        actions.appendChild(shareBtn);
    }

    // Edit button - only show if can edit
    if (canEdit) {
        const editBtn = document.createElement('button');
        editBtn.className = 'task-action-btn task-edit';
        editBtn.title = 'Edit';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        actions.appendChild(editBtn);
    }

    // Delete button - only show if can delete
    if (canDelete) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'task-action-btn task-delete';
        deleteBtn.title = 'Delete';
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        actions.appendChild(deleteBtn);
    }

    return actions;
}

// Main function - Create task element
export function createTaskElement(task) {
    // Create container
    const taskEl = document.createElement('div');
    taskEl.className = `task-item ${task.completed ? 'completed' : ''} priority-${getPriorityName(task.priority)}`;
    taskEl.dataset.taskId = task.id;

    // Apply category color - support both API format (Category object) and local format (category)
    const categoryForBorder = task.Category || task.category || task.categoryId;
    const borderColor = getCategoryColor(categoryForBorder);
    taskEl.style.borderLeftColor = borderColor;
    
    // Add overdue class
    if (isTaskOverdue(task)) {
        taskEl.classList.add('overdue');
    }
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'task-content';
    
    // Build content
    content.appendChild(createTaskHeader(task));
    
    const description = createTaskDescription(task);
    if (description) content.appendChild(description);
    
    content.appendChild(createTaskMeta(task));
    
    const progress = createSubTasksProgress(task);
    if (progress) content.appendChild(progress);
    
    // Assemble task element
    taskEl.appendChild(createTaskCheckbox(task));
    taskEl.appendChild(content);
    taskEl.appendChild(createTaskActions(task));
    
    return taskEl;
}


// Sort tasks
export function sortTasks(tasks, sortBy = 'date') {
    const sorted = [...tasks];
    
    switch(sortBy) {
        case 'priority':
            return sorted.sort((a, b) => b.priority - a.priority);
        case 'date':
            return sorted.sort((a, b) => {
                if (!a.dueDate && !b.dueDate) return 0;
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            });
        case 'title':
            return sorted.sort((a, b) => a.title.localeCompare(b.title));
        default:
            return sorted;
    }
}

// Get unique categories from tasks
export function getUniqueCategories(tasks) {
    const categories = new Set();
    tasks.forEach(task => {
        if (task.category) categories.add(task.category);
    });
    return Array.from(categories).sort();
}

// Get all available categories from CategoryService
export function getAllAvailableCategories() {
    const categories = getAllCategoriesSync();
    return categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        color: cat.color
    }));
}

// Get category name by ID (useful for display)
export function getCategoryName(categoryId) {
    if (!categoryId) return '';

    // If categoryId is an object, extract the ID or name
    let categoryValue = categoryId;
    if (typeof categoryId === 'object' && categoryId !== null) {
        // If it's already a category object with name, return the name
        if (categoryId.name) return categoryId.name;
        // Otherwise try to get the id
        categoryValue = categoryId.id || categoryId;
    }

    const categories = getAllCategoriesSync();
    const found = categories.find(cat => cat.id === categoryValue || cat.name === categoryValue);

    return found?.name || String(categoryValue);
}