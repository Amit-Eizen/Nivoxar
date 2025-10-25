// TaskUtils.js - Utility functions for task management
import { getAllCategoriesSync } from '../../services/CategoryService.js';
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
        console.log('✅ Saved tasks to localStorage');
        return true;
    } catch (error) {
        console.error('❌ Failed to save tasks to localStorage:', error);
        return false;
    }
}

// Load tasks from localStorage (centralized function)
export function loadTasksFromLocalStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (saved) {
            const tasks = JSON.parse(saved);
            console.log('✅ Loaded tasks from localStorage:', tasks.length);
            return tasks;
        }
        console.log('ℹ️ No tasks found in localStorage');
        return [];
    } catch (error) {
        console.error('❌ Failed to load tasks from localStorage:', error);
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
        console.log('⚠️ No category provided, using default color');
        return '#6366f1'; // Default color
    }
    
    // Get categories from CategoryService
    const categories = getAllCategoriesSync();
    
    console.log(`🎨 Getting color for category: "${category}"`);
    console.log('  Available categories:', categories.map(c => `${c.id}:${c.name}`));
    
    // Find category by ID or name (case-insensitive)
    const found = categories.find(cat => 
        cat.id === category || 
        cat.name.toLowerCase() === category.toLowerCase()
    );
    
    if (found) {
        console.log(`  ✅ Found: ${found.name} → ${found.color}`);
        return found.color;
    } else {
        console.log(`  ❌ Not found! Using default color`);
        return '#6366f1'; // Fallback to default
    }
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
    
    // Get category name and color
    const categoryName = task.category ? getCategoryName(task.category) : '';
    const categoryColor = task.category ? getCategoryColor(task.category) : '';
    
    header.innerHTML = `
        <h3 class="task-title">${task.title}</h3>
        ${categoryName ? `<span class="task-category" style="background-color: ${categoryColor}; color: white;">${categoryName}</span>` : ''}
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
    
    // SubTasks button
    if (task.subTasks?.length > 0) {
        const completedCount = task.subTasks.filter(st => st.completed).length;
        const subtasksBtn = document.createElement('button');
        subtasksBtn.className = 'task-action-btn task-subtasks-btn';
        subtasksBtn.title = 'Manage SubTasks';
        subtasksBtn.innerHTML = `
            <i class="fas fa-list-check"></i>
            <span class="subtasks-count">${completedCount}/${task.subTasks.length}</span>
        `;
        actions.appendChild(subtasksBtn);
    }
    
    // Edit button
    const editBtn = document.createElement('button');
    editBtn.className = 'task-action-btn task-edit';
    editBtn.title = 'Edit';
    editBtn.innerHTML = '<i class="fas fa-edit"></i>';
    actions.appendChild(editBtn);
    
    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'task-action-btn task-delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
    actions.appendChild(deleteBtn);
    
    return actions;
}

// Main function - Create task element
export function createTaskElement(task) {
    // Create container
    const taskEl = document.createElement('div');
    taskEl.className = `task-item ${task.completed ? 'completed' : ''} priority-${getPriorityName(task.priority)}`;
    taskEl.dataset.taskId = task.id;
    
    // Apply category color
    const borderColor = getCategoryColor(task.category);
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
    
    const categories = getAllCategoriesSync();
    const found = categories.find(cat => cat.id === categoryId);
    
    return found?.name || categoryId;
}