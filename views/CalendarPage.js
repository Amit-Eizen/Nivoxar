import { getAllCategoriesSync, getCategoryOptionsHTML } from '../services/CategoryService.js';
import { getPriorityName, formatDate, formatTime, saveTasksToLocalStorage, loadTasksFromLocalStorage } from '../utils/TaskUtils.js';
import { initNavbar } from '../scripts/components/Navbar.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';
import { addTempSubTask, toggleTempSubTask, deleteTempSubTask, renderTempSubTasks, clearTempSubTasks } from '../scripts/managers/SubTasksManager.js';

// State Management
export const calendarState = {
    tasks: [],
    categories: [],
    currentDate: new Date(),
    viewMode: 'month', // month, week, day
    selectedDate: null,
    editingTask: null,
    tempSubTasks: [] // Temporary subtasks while creating
};

const state = calendarState; // Keep backward compatibility

// Initialize Calendar Page
async function initializeCalendar() {
    try {
        // Check authentication
        const user = requireAuth();
        if (!user) return;

        // Only init navbar in MPA mode (SPA mode handles navbar globally)
        if (!window.__SPA_MODE__) {
            initNavbar();
        }

        // Show loading
        showLoading();

        // Load data
        await loadCalendarData();

        // Setup event listeners
        setupEventListeners();

        // Render calendar
        renderCalendar();

        // Hide loading
        hideLoading();

    } catch (error) {
        console.error('Failed to initialize calendar:', error);
        hideLoading();
    }
}

// Data Loading
async function loadCalendarData() {
    try {
        // Get tasks from localStorage using centralized function
        state.tasks = loadTasksFromLocalStorage();

        // Get categories
        state.categories = getAllCategoriesSync();

    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Save Tasks
function saveTasks() {
    saveTasksToLocalStorage(state.tasks);
}

// Event Listeners Setup
function setupEventListeners() {
    // View switcher
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.dataset.view;
            switchView(view);
        });
    });
    
    // Navigation buttons
    document.getElementById('prev-period').addEventListener('click', navigatePrevious);
    document.getElementById('next-period').addEventListener('click', navigateNext);
    document.getElementById('today-btn').addEventListener('click', goToToday);
    
    // Create task button
    document.getElementById('create-task-btn').addEventListener('click', openCreateModal);
    
    // Create modal
    document.getElementById('close-create-modal').addEventListener('click', closeCreateModal);
    document.getElementById('cancel-create').addEventListener('click', closeCreateModal);
    document.getElementById('create-task-form').addEventListener('submit', handleCreateTask);
    
    // SubTasks - Create Modal
    const hasSubTasksCheckbox = document.getElementById('task-has-subtasks');
    if (hasSubTasksCheckbox) {
        hasSubTasksCheckbox.addEventListener('change', toggleSubTasksPanel);
    }
    
    document.getElementById('closeSubTasksSidePanel')?.addEventListener('click', closeSubTasksPanel);
    document.getElementById('addSubTaskTempBtn')?.addEventListener('click', handleAddSubTask);
    document.getElementById('newSubTaskTempInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSubTask();
        }
    });
    
    // Recurring - Create Modal
    const recurringCheckbox = document.getElementById('task-recurring');
    if (recurringCheckbox) {
        recurringCheckbox.addEventListener('change', toggleRecurringOptions);
    }
    
    // Edit modal
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('delete-task').addEventListener('click', handleDeleteTask);
    document.getElementById('edit-task-form').addEventListener('submit', handleUpdateTask);
    
    // SubTasks - Edit Modal
    const editHasSubTasksCheckbox = document.getElementById('edit-task-has-subtasks');
    if (editHasSubTasksCheckbox) {
        editHasSubTasksCheckbox.addEventListener('change', toggleEditSubTasksPanel);
    }

    document.getElementById('closeEditSubTasksSidePanel')?.addEventListener('click', closeEditSubTasksPanel);
    document.getElementById('editAddSubTaskBtn')?.addEventListener('click', handleEditAddSubTask);
    document.getElementById('editNewSubTaskInput')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleEditAddSubTask();
        }
    });

    // Recurring - Edit Modal
    const editRecurringCheckbox = document.getElementById('edit-task-recurring');
    if (editRecurringCheckbox) {
        editRecurringCheckbox.addEventListener('change', toggleEditRecurringOptions);
    }
    
    // More Tasks modal
    document.getElementById('close-more-tasks-modal').addEventListener('click', closeMoreTasksModal);
    document.getElementById('cancel-more-tasks').addEventListener('click', closeMoreTasksModal);
    
    // Close modals on overlay click
    document.getElementById('create-task-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeCreateModal();
    });
    document.getElementById('edit-task-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeEditModal();
    });
    document.getElementById('more-tasks-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) closeMoreTasksModal();
    });
}

// View Management
function switchView(view) {
    state.viewMode = view;
    
    // Update buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Render calendar
    renderCalendar();
}

function navigatePrevious() {
    const date = new Date(state.currentDate);
    
    switch(state.viewMode) {
        case 'month':
            date.setMonth(date.getMonth() - 1);
            break;
        case 'week':
            date.setDate(date.getDate() - 7);
            break;
        case 'day':
            date.setDate(date.getDate() - 1);
            break;
    }
    
    state.currentDate = date;
    renderCalendar();
}

function navigateNext() {
    const date = new Date(state.currentDate);
    
    switch(state.viewMode) {
        case 'month':
            date.setMonth(date.getMonth() + 1);
            break;
        case 'week':
            date.setDate(date.getDate() + 7);
            break;
        case 'day':
            date.setDate(date.getDate() + 1);
            break;
    }
    
    state.currentDate = date;
    renderCalendar();
}

function goToToday() {
    state.currentDate = new Date();
    renderCalendar();
}

// Render Calendar
function renderCalendar() {
    updatePeriodDisplay();
    
    switch(state.viewMode) {
        case 'month':
            renderMonthView();
            break;
        case 'week':
            renderWeekView();
            break;
        case 'day':
            renderDayView();
            break;
    }
}

function updatePeriodDisplay() {
    const periodEl = document.getElementById('current-period');
    
    switch(state.viewMode) {
        case 'month':
            periodEl.textContent = state.currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });
            break;
        case 'week':
            const weekStart = getWeekStart(state.currentDate);
            const weekEnd = getWeekEnd(state.currentDate);
            periodEl.textContent = `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
            break;
        case 'day':
            periodEl.textContent = state.currentDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                month: 'long', 
                day: 'numeric',
                year: 'numeric' 
            });
            break;
    }
}

// Render Month View
function renderMonthView() {
    const grid = document.getElementById('calendar-grid');
    const year = state.currentDate.getFullYear();
    const month = state.currentDate.getMonth();
    
    // Get first day of month and calculate grid
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    let html = '<div class="calendar-month">';
    
    // Day headers
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        html += `<div class="calendar-day-header">${day}</div>`;
    });
    
    // Generate 42 days (6 weeks)
    const currentDate = new Date(startDate);
    for (let i = 0; i < 42; i++) {
        const isToday = isSameDay(currentDate, new Date());
        const isCurrentMonth = currentDate.getMonth() === month;
        const dayTasks = getTasksForDate(currentDate);
        
        html += `
            <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}" 
                 data-date="${currentDate.toISOString()}">
                <div class="day-number">${currentDate.getDate()}</div>
                <div class="day-tasks">
                    ${renderDayTasks(dayTasks.slice(0, 3))}
                    ${dayTasks.length > 3 ? `<div class="more-tasks">+${dayTasks.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
        
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    html += '</div>';
    grid.innerHTML = html;
    
    // Smart click handlers - single vs double click
    grid.querySelectorAll('.calendar-day').forEach(dayEl => {
        let clickTimer = null;
        let clickCount = 0;
        
        dayEl.addEventListener('click', (e) => {
            console.log('Day clicked:', e.target.className);
            
            // If clicked on a task, open more tasks modal
            if (e.target.classList.contains('day-task')) {
                console.log('Task clicked!');
                const date = new Date(dayEl.dataset.date);
                openMoreTasksModal(date);
                return;
            }
            
            // If clicked on "more tasks", open more tasks modal
            if (e.target.classList.contains('more-tasks')) {
                console.log('More tasks clicked!');
                const date = new Date(dayEl.dataset.date);
                openMoreTasksModal(date);
                return;
            }
            
            // Handle single vs double click on day cell
            clickCount++;
            console.log('Click count:', clickCount);
            
            if (clickCount === 1) {
                clickTimer = setTimeout(() => {
                    // Single click - go to day view
                    console.log('Single click - switching to day view');
                    const date = new Date(dayEl.dataset.date);
                    state.currentDate = date;
                    switchView('day');
                    clickCount = 0;
                }, 300);
            } else if (clickCount === 2) {
                // Double click - create task
                console.log('Double click - opening create modal');
                clearTimeout(clickTimer);
                const date = new Date(dayEl.dataset.date);
                openCreateModalWithDate(date);
                clickCount = 0;
            }
        });
    });
    
    // Add click handlers for tasks
    grid.querySelectorAll('.day-task').forEach(taskEl => {
        taskEl.addEventListener('click', (e) => {
            e.stopPropagation(); // Don't trigger day click
            const date = new Date(taskEl.closest('.calendar-day').dataset.date);
            openMoreTasksModal(date);
        });
    });
}

function renderDayTasks(tasks) {
    return tasks.map(task => {
        const priority = getPriorityName(task.priority);
        return `
            <div class="day-task priority-${priority} ${task.completed ? 'completed' : ''}" 
                 data-task-id="${task.id}">
                ${task.title}
            </div>
        `;
    }).join('');
}

// Render Week View
function renderWeekView() {
    const grid = document.getElementById('calendar-grid');
    const weekStart = getWeekStart(state.currentDate);
    
    let html = '<div class="calendar-week">';
    
    // Time column header
    html += '<div class="calendar-day-header"></div>';
    
    // Day headers
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const isToday = isSameDay(date, new Date());
        html += `
            <div class="calendar-day-header ${isToday ? 'today' : ''}">
                ${date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
            </div>
        `;
    }
    
    // Daily Tasks Row (tasks without time)
    html += '<div class="week-time-slot">Daily</div>';
    for (let day = 0; day < 7; day++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + day);
        const dailyTasks = getTasksForDate(date).filter(task => !task.dueTime);
        
        html += `
            <div class="week-day-slot week-daily-slot" data-date="${date.toISOString()}">
                ${dailyTasks.map(task => {
                    const priority = getPriorityName(task.priority);
                    return `
                        <div class="day-task priority-${priority} ${task.completed ? 'completed' : ''}" 
                             data-task-id="${task.id}">
                            ${task.title}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    // Time slots (00:00 - 23:00)
    for (let hour = 0; hour < 24; hour++) {
        html += `<div class="week-time-slot">${hour.toString().padStart(2, '0')}:00</div>`;
        
        for (let day = 0; day < 7; day++) {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + day);
            date.setHours(hour, 0, 0, 0);
            
            const tasks = getTasksForHour(date, hour);
            html += `
                <div class="week-day-slot" data-date="${date.toISOString()}">
                    ${tasks.map(task => {
                        const priority = getPriorityName(task.priority);
                        return `
                            <div class="day-task priority-${priority} ${task.completed ? 'completed' : ''}" 
                                 data-task-id="${task.id}">
                                ${task.title}
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
    
    html += '</div>';
    grid.innerHTML = html;
    
    // Add click handlers - click on task opens More Tasks modal for that day
    grid.querySelectorAll('.day-task').forEach(taskEl => {
        taskEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const slotEl = taskEl.closest('.week-day-slot');
            if (slotEl && slotEl.dataset.date) {
                const date = new Date(slotEl.dataset.date);
                openMoreTasksModal(date);
            }
        });
    });
}

// Render Day View
function renderDayView() {
    const grid = document.getElementById('calendar-grid');
    const tasks = getTasksForDate(state.currentDate);
    
    let html = '<div class="calendar-day-view">';
    
    html += `
        <div class="day-view-header">
            <div class="day-view-date">
                ${state.currentDate.toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                })}
            </div>
        </div>
    `;
    
    if (tasks.length === 0) {
        html += `
            <div class="calendar-empty">
                <i class="fas fa-calendar-check"></i>
                <h3>No tasks for this day</h3>
                <p>Click "New Task" to create one</p>
            </div>
        `;
    } else {
        html += '<div class="day-view-tasks">';
        tasks.forEach(task => {
            const category = state.categories.find(c => c.id === task.category);
            const priority = getPriorityName(task.priority);
            
            html += `
                <div class="day-view-task priority-${priority}" data-task-id="${task.id}">
                    <div class="day-view-task-title">${task.title}</div>
                    ${task.dueTime ? `<div class="day-view-task-time"><i class="fas fa-clock"></i> ${formatTime(task.dueTime)}</div>` : ''}
                    ${task.description ? `<div class="day-view-task-description">${task.description}</div>` : ''}
                    ${category ? `<span class="day-view-task-category" style="background-color: ${category.color}">${category.name}</span>` : ''}
                </div>
            `;
        });
        html += '</div>';
    }
    
    html += '</div>';
    grid.innerHTML = html;
    
    // Add click handlers
    grid.querySelectorAll('.day-view-task').forEach(taskEl => {
        taskEl.addEventListener('click', () => {
            const taskId = parseInt(taskEl.dataset.taskId);
            const task = state.tasks.find(t => t.id === taskId);
            if (task) openEditModal(task);
        });
    });
}

// Helper Functions
function getTasksForDate(date) {
    const dateStr = date.toDateString();
    return state.tasks.filter(task => {
        if (!task.dueDate) return false;
        
        // Check if task is on this date
        if (new Date(task.dueDate).toDateString() === dateStr) {
            return true;
        }
        
        // Check if task is recurring and should appear on this date
        if (task.recurring && task.recurring.enabled) {
            const taskDate = new Date(task.dueDate);
            const checkDate = new Date(date);
            
            // If date is before task start date, don't show
            if (checkDate < taskDate) return false;
            
            // If end date is set and date is after end date, don't show
            if (task.recurring.endDate) {
                const endDate = new Date(task.recurring.endDate);
                if (checkDate > endDate) return false;
            }
            
            // Check frequency
            switch (task.recurring.frequency) {
                case 'daily':
                    return true;
                    
                case 'weekly':
                    return taskDate.getDay() === checkDate.getDay();
                    
                case 'monthly':
                    return taskDate.getDate() === checkDate.getDate();
                    
                default:
                    return false;
            }
        }
        
        return false;
    }).sort((a, b) => {
        if (a.dueTime && b.dueTime) {
            return a.dueTime.localeCompare(b.dueTime);
        }
        return b.priority - a.priority;
    });
}

function getTasksForHour(date, hour) {
    return getTasksForDate(date).filter(task => {
        if (!task.dueTime) return false;
        const taskHour = parseInt(task.dueTime.split(':')[0]);
        return taskHour === hour;
    });
}

function getWeekStart(date) {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
}

function getWeekEnd(date) {
    const d = getWeekStart(date);
    d.setDate(d.getDate() + 6);
    return d;
}

function isSameDay(date1, date2) {
    return date1.toDateString() === date2.toDateString();
}

// SubTasks Management (UI handlers only)
function toggleSubTasksPanel() {
    const checkbox = document.getElementById('task-has-subtasks');
    const panel = document.getElementById('subTasksSidePanel');
    const wrapper = document.getElementById('create-popup-wrapper');
    
    if (checkbox.checked) {
        panel.style.display = 'flex';
        wrapper.classList.add('with-sidebar');
        const container = document.getElementById('tempSubTasksList');
        renderTempSubTasks(calendarState, container);
    } else {
        panel.style.display = 'none';
        wrapper.classList.remove('with-sidebar');
        clearTempSubTasks(calendarState);
    }
}

function closeSubTasksPanel() {
    const checkbox = document.getElementById('task-has-subtasks');
    checkbox.checked = false;
    toggleSubTasksPanel();
}

function closeEditSubTasksPanel() {
    const checkbox = document.getElementById('edit-task-has-subtasks');
    checkbox.checked = false;
    toggleEditSubTasksPanel();
}

function handleAddSubTask() {
    const input = document.getElementById('newSubTaskTempInput');
    const text = input.value.trim();

    if (!text) return;

    addTempSubTask(calendarState, text);

    input.value = '';
    input.focus();

    const container = document.getElementById('tempSubTasksList');
    renderTempSubTasks(calendarState, container);
}

function handleEditAddSubTask() {
    const input = document.getElementById('editNewSubTaskInput');
    const text = input.value.trim();

    if (!text) return;

    // Get the task being edited
    const taskId = parseInt(document.getElementById('edit-task-id').value);
    const task = state.tasks.find(t => t.id === taskId);

    if (!task) return;

    // Initialize subTasks array if it doesn't exist
    if (!task.subTasks) {
        task.subTasks = [];
    }

    // Add the new subtask
    task.subTasks.push({
        id: Date.now(),
        text: text,
        completed: false
    });

    input.value = '';
    input.focus();

    // Re-render the subtasks list
    renderEditSubTasks(task);
}

function renderEditSubTasks(task) {
    const container = document.getElementById('editSubTasksList');
    const summary = document.getElementById('editSubTasksSummary');

    if (!task.subTasks || task.subTasks.length === 0) {
        container.innerHTML = '<div class="subtasks-empty">No subtasks added yet.</div>';
        summary.innerHTML = '<i class="fas fa-info-circle"></i><span class="summary-text">No subtasks yet</span>';
        return;
    }

    container.innerHTML = '';

    task.subTasks.forEach(subTask => {
        const div = document.createElement('div');
        div.className = `subtask-item ${subTask.completed ? 'completed' : ''}`;
        div.innerHTML = `
            <label class="subtask-checkbox">
                <input type="checkbox" ${subTask.completed ? 'checked' : ''}
                    onchange="window.toggleEditSubTask(${task.id}, ${subTask.id})">
                <span class="checkmark"></span>
            </label>
            <span class="subtask-text">${subTask.text}</span>
            <div class="subtask-actions">
                <button class="subtask-delete" onclick="window.deleteEditSubTask(${task.id}, ${subTask.id})" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });

    const completed = task.subTasks.filter(st => st.completed).length;
    summary.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span class="summary-text">${completed} of ${task.subTasks.length} completed</span>
    `;
}

// Global functions for edit subtasks
window.toggleEditSubTask = function(taskId, subtaskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !task.subTasks) return;

    const subTask = task.subTasks.find(st => st.id === subtaskId);
    if (subTask) {
        subTask.completed = !subTask.completed;
        renderEditSubTasks(task);
    }
};

window.deleteEditSubTask = function(taskId, subtaskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task || !task.subTasks) return;

    task.subTasks = task.subTasks.filter(st => st.id !== subtaskId);
    renderEditSubTasks(task);
};

// Global functions for onclick handlers
window.toggleTempSubTask = function(subtaskId) {
    toggleTempSubTask(calendarState, subtaskId);
    const container = document.getElementById('tempSubTasksList');
    renderTempSubTasks(calendarState, container);
};

window.deleteTempSubTask = function(subtaskId) {
    deleteTempSubTask(calendarState, subtaskId);
    const container = document.getElementById('tempSubTasksList');
    renderTempSubTasks(calendarState, container);
};

// Recurring Management
function toggleRecurringOptions() {
    const checkbox = document.getElementById('task-recurring');
    const options = document.getElementById('recurring-options');
    
    if (checkbox.checked) {
        options.style.display = 'block';
    } else {
        options.style.display = 'none';
    }
}

function toggleEditRecurringOptions() {
    const checkbox = document.getElementById('edit-task-recurring');
    const options = document.getElementById('edit-recurring-options');
    
    if (checkbox.checked) {
        options.style.display = 'block';
    } else {
        options.style.display = 'none';
    }
}

function toggleEditSubTasksPanel() {
    const checkbox = document.getElementById('edit-task-has-subtasks');
    const panel = document.getElementById('editSubTasksSidePanel');
    const wrapper = document.getElementById('edit-popup-wrapper');

    if (checkbox.checked) {
        panel.style.display = 'flex';
        wrapper.classList.add('with-sidebar');

        // Load existing subtasks if editing a task
        const taskId = parseInt(document.getElementById('edit-task-id').value);
        const task = state.tasks.find(t => t.id === taskId);

        if (task) {
            renderEditSubTasks(task);
        }
    } else {
        panel.style.display = 'none';
        wrapper.classList.remove('with-sidebar');
    }
}

// Modal Management
function openCreateModal() {
    const modal = document.getElementById('create-task-modal');
    modal.classList.add('active');
    
    // Populate categories
    document.getElementById('task-category').innerHTML = getCategoryOptionsHTML();
    
    // Reset form
    document.getElementById('create-task-form').reset();
}

function openCreateModalWithDate(date) {
    openCreateModal();
    const dateStr = date.toISOString().split('T')[0];
    document.getElementById('task-due-date').value = dateStr;
}

function closeCreateModal() {
    const modal = document.getElementById('create-task-modal');
    modal.classList.remove('active');
}

function openEditModal(task) {
    state.editingTask = task;
    const modal = document.getElementById('edit-task-modal');
    modal.classList.add('active');
    
    // Populate form
    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-description').value = task.description || '';
    document.getElementById('edit-task-category').innerHTML = getCategoryOptionsHTML(task.category);
    document.getElementById('edit-task-priority').value = task.priority;
    
    if (task.dueDate) {
        document.getElementById('edit-task-due-date').value = task.dueDate;
    }
    if (task.dueTime) {
        document.getElementById('edit-task-due-time').value = task.dueTime;
    }
    
    // SubTasks checkbox
    const hasSubTasksCheckbox = document.getElementById('edit-task-has-subtasks');
    if (hasSubTasksCheckbox) {
        hasSubTasksCheckbox.checked = task.subTasks && task.subTasks.length > 0;
        // Trigger the panel opening if there are subtasks
        if (hasSubTasksCheckbox.checked) {
            toggleEditSubTasksPanel();
        }
    }

    // Recurring checkbox and options
    const recurringCheckbox = document.getElementById('edit-task-recurring');
    const recurringOptions = document.getElementById('edit-recurring-options');
    if (recurringCheckbox && recurringOptions) {
        if (task.recurring && task.recurring.enabled) {
            recurringCheckbox.checked = true;
            recurringOptions.style.display = 'block';
            document.getElementById('edit-recurring-frequency').value = task.recurring.frequency || 'daily';
            if (task.recurring.endDate) {
                document.getElementById('edit-recurring-end-date').value = task.recurring.endDate;
            }
        } else {
            recurringCheckbox.checked = false;
            recurringOptions.style.display = 'none';
        }
    }
}

function closeEditModal() {
    const modal = document.getElementById('edit-task-modal');
    modal.classList.remove('active');
    state.editingTask = null;

    // Close subtasks panel if open
    const panel = document.getElementById('editSubTasksSidePanel');
    const wrapper = document.getElementById('edit-popup-wrapper');
    if (panel && panel.style.display === 'flex') {
        panel.style.display = 'none';
        wrapper.classList.remove('with-sidebar');
    }
}

function openMoreTasksModal(date) {
    const tasks = getTasksForDate(date);
    
    if (tasks.length === 0) {
        // If no tasks, just go to day view
        state.currentDate = date;
        switchView('day');
        return;
    }
    
    const modal = document.getElementById('more-tasks-modal');
    const dateTitle = document.getElementById('more-tasks-date-title');
    const tasksList = document.getElementById('more-tasks-list');
    
    // Set title
    dateTitle.textContent = `Tasks for ${date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    })}`;
    
    // Render tasks list
    tasksList.innerHTML = tasks.map(task => {
        const category = state.categories.find(c => c.id === task.category);
        const priority = getPriorityName(task.priority);
        
        return `
            <div class="subtask-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                <label class="subtask-checkbox" onclick="event.stopPropagation()">
                    <input type="checkbox" ${task.completed ? 'checked' : ''} 
                           onchange="window.toggleTaskFromModal(${task.id})">
                    <span class="checkmark"></span>
                </label>
                <div class="subtask-content">
                    <span class="subtask-title">${task.title}</span>
                    <div class="task-meta-inline">
                        ${task.dueTime ? `<span class="meta-time"><i class="fas fa-clock"></i> ${formatTime(task.dueTime)}</span>` : ''}
                        ${category ? `<span class="meta-category" style="background-color: ${category.color}">${category.name}</span>` : ''}
                        <span class="meta-priority priority-${priority}"><i class="fas fa-flag"></i></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Show modal
    modal.classList.add('active');
    
    // Add click handlers to tasks (not on checkbox)
    tasksList.querySelectorAll('.subtask-item').forEach(item => {
        item.addEventListener('click', (e) => {
            // Don't trigger if clicking checkbox
            if (e.target.type === 'checkbox' || e.target.closest('.subtask-checkbox')) {
                return;
            }
            
            const taskId = parseInt(item.dataset.taskId);
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
                closeMoreTasksModal();
                openEditModal(task);
            }
        });
    });
}

// Global function for toggling task completion from modal
window.toggleTaskFromModal = function(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        
        // Update the specific task item in the modal
        const taskItem = document.querySelector(`.subtask-item[data-task-id="${taskId}"]`);
        if (taskItem) {
            taskItem.classList.toggle('completed', task.completed);
        }
        
        // Re-render calendar in background
        renderCalendar();
    }
}

function closeMoreTasksModal() {
    const modal = document.getElementById('more-tasks-modal');
    modal.classList.remove('active');
}

// Task Management
async function handleCreateTask(e) {
    e.preventDefault();
    
    const title = document.getElementById('task-title').value.trim();
    const description = document.getElementById('task-description').value.trim();
    const category = document.getElementById('task-category').value;
    const priority = parseInt(document.getElementById('task-priority').value);
    const dueDate = document.getElementById('task-due-date').value;
    const dueTime = document.getElementById('task-due-time').value;
    
    if (!title) return;
    
    const newTask = {
        id: Date.now(),
        title,
        description,
        category,
        priority,
        dueDate,
        dueTime,
        completed: false,
        createdAt: new Date().toISOString(),
        subTasks: calendarState.tempSubTasks.length > 0 ? [...calendarState.tempSubTasks] : [],
        recurring: null
    };
    
    // Handle recurring
    const recurringCheckbox = document.getElementById('task-recurring');
    if (recurringCheckbox?.checked) {
        newTask.recurring = {
            enabled: true,
            frequency: document.getElementById('recurring-frequency').value,
            endDate: document.getElementById('recurring-end-date').value
        };
    }
    
    state.tasks.push(newTask);
    saveTasks();

    // Reset
    clearTempSubTasks(calendarState);
    closeCreateModal();
    renderCalendar();
}

async function handleUpdateTask(e) {
    e.preventDefault();
    
    const id = parseInt(document.getElementById('edit-task-id').value);
    const task = state.tasks.find(t => t.id === id);
    
    if (!task) return;
    
    task.title = document.getElementById('edit-task-title').value.trim();
    task.description = document.getElementById('edit-task-description').value.trim();
    task.category = document.getElementById('edit-task-category').value;
    task.priority = parseInt(document.getElementById('edit-task-priority').value);
    task.dueDate = document.getElementById('edit-task-due-date').value;
    task.dueTime = document.getElementById('edit-task-due-time').value;
    
    // Handle recurring
    const recurringCheckbox = document.getElementById('edit-task-recurring');
    if (recurringCheckbox?.checked) {
        task.recurring = {
            enabled: true,
            frequency: document.getElementById('edit-recurring-frequency').value,
            endDate: document.getElementById('edit-recurring-end-date').value
        };
    } else {
        task.recurring = null;
    }
    
    saveTasks();
    closeEditModal();
    renderCalendar();
}

async function handleDeleteTask() {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    const id = parseInt(document.getElementById('edit-task-id').value);
    state.tasks = state.tasks.filter(t => t.id !== id);
    
    saveTasks();
    closeEditModal();
    renderCalendar();
}

// UI Helpers
function showLoading() {
    document.getElementById('loading').style.display = 'flex';
    document.getElementById('calendar-page').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('calendar-page').style.display = 'block';
}

// For standalone HTML page (MPA mode)
if (!window.__SPA_MODE__) {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCalendar);
    } else {
        initializeCalendar();
    }
}

// ===== SPA MODE =====

/**
 * Load Calendar page for SPA
 */
export async function loadCalendarPage() {
    console.log('📄 Loading Calendar Page...');

    // Load CSS
    loadPageCSS();

    // Get app container
    const app = document.getElementById('app');
    if (!app) {
        console.error('App container not found');
        return;
    }

    // Inject HTML
    app.innerHTML = getPageHTML();

    // Initialize Calendar
    initializeCalendar();
}

/**
 * Load CSS for Calendar page
 */
function loadPageCSS() {
    const cssFiles = [
        '/public/styles/DashboardPage.css',
        '/public/styles/CalendarPage.css'
    ];

    // Remove existing page-specific stylesheets
    document.querySelectorAll('link[data-page-style]').forEach(link => link.remove());

    // Load new stylesheets
    cssFiles.forEach(href => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-page-style', 'true');
        document.head.appendChild(link);
    });
}

/**
 * Get Calendar HTML
 */
function getPageHTML() {
    return `
        <!-- Loading State -->
        <div id="loading" class="loading-state" style="display: none;">
            <div class="spinner"></div>
            <p>Loading Calendar...</p>
        </div>

        <!-- Main Calendar Page -->
        <div id="calendar-page" class="calendar-page">
            <div class="calendar-container">
                <!-- Header -->
                <div class="calendar-header">
                    <div class="header-left">
                        <h1 class="calendar-title">
                            <i class="fas fa-calendar-alt"></i>
                            Calendar
                        </h1>
                        <p class="calendar-subtitle">View and manage your tasks by date</p>
                    </div>
                    <div class="header-actions">
                        <button class="btn btn-primary" id="create-task-btn">
                            <i class="fas fa-plus"></i>
                            <span>New Task</span>
                        </button>
                    </div>
                </div>

                <!-- Calendar Controls -->
                <div class="calendar-controls">
                    <div class="view-switcher">
                        <button class="view-btn active" data-view="month">
                            <i class="fas fa-calendar"></i>
                            <span>Month</span>
                        </button>
                        <button class="view-btn" data-view="week">
                            <i class="fas fa-calendar-week"></i>
                            <span>Week</span>
                        </button>
                        <button class="view-btn" data-view="day">
                            <i class="fas fa-calendar-day"></i>
                            <span>Day</span>
                        </button>
                    </div>

                    <div class="date-navigation">
                        <button class="nav-btn" id="prev-period">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <h2 class="current-period" id="current-period">Loading...</h2>
                        <button class="nav-btn" id="next-period">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        <button class="btn-today" id="today-btn">
                            <i class="fas fa-calendar-check"></i>
                            Today
                        </button>
                    </div>
                </div>

                <!-- Calendar Grid -->
                <div id="calendar-grid" class="calendar-grid">
                    <!-- Dynamic content will be inserted here -->
                </div>
            </div>
        </div>

        ${getModalsHTML()}
    `;
}

/**
 * Get all modals HTML (separated for readability)
 */
function getModalsHTML() {
    return `
        <!-- Create Task Modal -->
        <div id="create-task-modal" class="modal-overlay" style="display: none;">
            <div class="popup-wrapper" id="create-popup-wrapper">
                <div class="popup-content popup-main">
                    <div class="popup-header">
                        <h2>
                            <i class="fas fa-plus-circle"></i>
                            Create New Task
                        </h2>
                        <button class="popup-close" id="close-create-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="popup-body">
                        <form id="create-task-form" class="task-form">
                            <div class="form-group">
                                <label class="form-label required">Title</label>
                                <input type="text" id="task-title" class="form-input" placeholder="Task title" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea id="task-description" class="form-textarea" placeholder="Task description" rows="3"></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Category</label>
                                    <select id="task-category" class="form-select"></select>
                                </div>

                                <div class="form-group">
                                    <label class="form-label required">Priority</label>
                                    <select id="task-priority" class="form-select" required>
                                        <option value="1">🟢 Low</option>
                                        <option value="2" selected>🟡 Medium</option>
                                        <option value="3">🟠 High</option>
                                        <option value="4">🔴 Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Due Date</label>
                                    <input type="date" id="task-due-date" class="form-input">
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Due Time</label>
                                    <input type="time" id="task-due-time" class="form-input">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="task-has-subtasks">
                                    <span class="checkbox-custom"></span>
                                    <span><i class="fas fa-tasks"></i> Add SubTasks</span>
                                </label>
                            </div>

                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="task-recurring">
                                    <span class="checkbox-custom"></span>
                                    <span><i class="fas fa-redo"></i> Recurring Task</span>
                                </label>
                            </div>

                            <div id="recurring-options" class="recurring-options" style="display: none;">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Frequency</label>
                                        <select id="recurring-frequency" class="form-select">
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">End Date</label>
                                        <input type="date" id="recurring-end-date" class="form-input">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="popup-footer">
                        <button type="button" class="btn btn-secondary" id="cancel-create">Cancel</button>
                        <button type="submit" form="create-task-form" class="btn btn-primary">
                            <i class="fas fa-check"></i>
                            Create Task
                        </button>
                    </div>
                </div>

                <div class="popup-content popup-side" id="subTasksSidePanel" style="display: none;">
                    <div class="side-panel-header">
                        <h3><i class="fas fa-list-check"></i> SubTasks Manager</h3>
                        <button class="panel-close" id="closeSubTasksSidePanel">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="side-panel-body">
                        <div class="panel-info">
                            <i class="fas fa-info-circle"></i>
                            Add subtasks to break down your main task into smaller, manageable steps.
                        </div>

                        <div class="subtasks-manager">
                            <div class="subtask-input-group">
                                <input type="text" id="newSubTaskTempInput" class="subtask-input" placeholder="Add new subtask...">
                                <button type="button" class="subtask-add-btn" id="addSubTaskTempBtn">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>

                            <div class="temp-subtasks-list" id="tempSubTasksList">
                                <div class="subtasks-empty">No subtasks added yet.</div>
                            </div>

                            <div class="subtasks-summary" id="tempSubTasksSummary">
                                <i class="fas fa-info-circle"></i>
                                <span class="summary-text">No subtasks yet</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Edit Task Modal -->
        <div id="edit-task-modal" class="modal-overlay" style="display: none;">
            <div class="popup-wrapper" id="edit-popup-wrapper">
                <div class="popup-content popup-main">
                    <div class="popup-header">
                        <h2><i class="fas fa-edit"></i> Edit Task</h2>
                        <button class="popup-close" id="close-edit-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="popup-body">
                        <form id="edit-task-form" class="task-form">
                            <input type="hidden" id="edit-task-id">

                            <div class="form-group">
                                <label class="form-label required">Title</label>
                                <input type="text" id="edit-task-title" class="form-input" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Description</label>
                                <textarea id="edit-task-description" class="form-textarea" rows="3"></textarea>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Category</label>
                                    <select id="edit-task-category" class="form-select"></select>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Priority</label>
                                    <select id="edit-task-priority" class="form-select">
                                        <option value="1">🟢 Low</option>
                                        <option value="2">🟡 Medium</option>
                                        <option value="3">🟠 High</option>
                                        <option value="4">🔴 Urgent</option>
                                    </select>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Due Date</label>
                                    <input type="date" id="edit-task-due-date" class="form-input">
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Due Time</label>
                                    <input type="time" id="edit-task-due-time" class="form-input">
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="edit-task-has-subtasks">
                                    <span class="checkbox-custom"></span>
                                    <span><i class="fas fa-tasks"></i> Add SubTasks</span>
                                </label>
                            </div>

                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="edit-task-recurring">
                                    <span class="checkbox-custom"></span>
                                    <span><i class="fas fa-redo"></i> Recurring Task</span>
                                </label>
                            </div>

                            <div id="edit-recurring-options" class="recurring-options" style="display: none;">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Frequency</label>
                                        <select id="edit-recurring-frequency" class="form-select">
                                            <option value="daily">Daily</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="monthly">Monthly</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label class="form-label">End Date</label>
                                        <input type="date" id="edit-recurring-end-date" class="form-input">
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>

                    <div class="popup-footer">
                        <button type="button" class="btn btn-secondary" id="cancel-edit">Cancel</button>
                        <button type="button" class="btn btn-danger" id="delete-task">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                        <button type="submit" form="edit-task-form" class="btn btn-primary">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                    </div>
                </div>

                <div class="popup-content popup-side" id="editSubTasksSidePanel" style="display: none;">
                    <div class="side-panel-header">
                        <h3><i class="fas fa-list-check"></i> SubTasks Manager</h3>
                        <button class="panel-close" id="closeEditSubTasksSidePanel">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="side-panel-body">
                        <div class="panel-info">
                            <i class="fas fa-info-circle"></i>
                            Add subtasks to break down your main task into smaller, manageable steps.
                        </div>

                        <div class="subtasks-manager">
                            <div class="subtask-input-group">
                                <input type="text" id="editNewSubTaskInput" class="subtask-input" placeholder="Add new subtask...">
                                <button type="button" class="subtask-add-btn" id="editAddSubTaskBtn">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>

                            <div class="temp-subtasks-list" id="editSubTasksList">
                                <div class="subtasks-empty">No subtasks added yet.</div>
                            </div>

                            <div class="subtasks-summary" id="editSubTasksSummary">
                                <i class="fas fa-info-circle"></i>
                                <span class="summary-text">No subtasks yet</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- More Tasks Modal -->
        <div id="more-tasks-modal" class="modal-overlay" style="display: none;">
            <div class="popup-wrapper">
                <div class="popup-content popup-subtasks">
                    <div class="popup-header">
                        <h2>
                            <i class="fas fa-calendar-day"></i>
                            <span id="more-tasks-date-title">Tasks</span>
                        </h2>
                        <button class="popup-close" id="close-more-tasks-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>

                    <div class="popup-body">
                        <div id="more-tasks-list" class="subtasks-list"></div>
                    </div>

                    <div class="popup-footer">
                        <button type="button" class="btn btn-secondary" id="cancel-more-tasks">Close</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}