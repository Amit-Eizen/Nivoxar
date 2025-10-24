import { getCurrentUser } from '../services/AuthService.js';
import { getAllCategoriesSync, getCategoryOptionsHTML } from '../services/CategoryService.js';
import { getPriorityName, formatDate, formatTime } from '../utils/TaskUtils.js';
import { initNavbar } from '../scripts/components/Navbar.js';

// State Management
const state = {
    tasks: [],
    categories: [],
    currentDate: new Date(),
    viewMode: 'month', // month, week, day
    selectedDate: null,
    editingTask: null
};

// Initialize Calendar Page
async function init() {
    try {
        // Check authentication
        const user = getCurrentUser();
        if (!user) {
            window.location.href = './LoginPage.html';
            return;
        }
        
        // Initialize Navbar
        initNavbar();
        
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
        // Get tasks from localStorage
        const tasksJson = localStorage.getItem('nivoxar_tasks');
        state.tasks = tasksJson ? JSON.parse(tasksJson) : [];
        
        // Get categories
        state.categories = getAllCategoriesSync();
        
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Save Tasks
function saveTasks() {
    localStorage.setItem('nivoxar_tasks', JSON.stringify(state.tasks));
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
    
    // Edit modal
    document.getElementById('close-edit-modal').addEventListener('click', closeEditModal);
    document.getElementById('cancel-edit').addEventListener('click', closeEditModal);
    document.getElementById('delete-task').addEventListener('click', handleDeleteTask);
    document.getElementById('edit-task-form').addEventListener('submit', handleUpdateTask);
    
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
    
    // Add click handlers
    grid.querySelectorAll('.day-task').forEach(taskEl => {
        taskEl.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = parseInt(taskEl.dataset.taskId);
            const task = state.tasks.find(t => t.id === taskId);
            if (task) openEditModal(task);
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
        return new Date(task.dueDate).toDateString() === dateStr;
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
}

function closeEditModal() {
    const modal = document.getElementById('edit-task-modal');
    modal.classList.remove('active');
    state.editingTask = null;
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
        createdAt: new Date().toISOString()
    };
    
    state.tasks.push(newTask);
    saveTasks();
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

// Initialize on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}