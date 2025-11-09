import { dashboardState, updateDashboard } from '../../views/DashboardPage.js';
import {
    createTaskElement,
    isTaskOverdue,
    calculateAnalytics,
    saveTasksToLocalStorage,
    loadTasksFromLocalStorage
} from '../../utils/TaskUtils.js';
import { incrementTaskCount, decrementTaskCount } from '../../services/CategoryService.js';
import { filterByCategory } from '../../services/FilterService.js';

// Initialize Task Manager
export function initTaskManager() {
    console.log('✅ Task Manager initialized');
    const tasks = loadTasksFromLocalStorage();
    dashboardState.tasks = tasks;
    dashboardState.filteredTasks = [...tasks];
}

// Create new task
export function createTask(taskData) {
    const newTask = {
        id: Date.now(),
        title: taskData.title,
        description: taskData.description || '',
        category: taskData.category || '',
        priority: parseInt(taskData.priority) || 2,
        dueDate: taskData.dueDate || null,
        dueTime: taskData.dueTime || null,
        completed: false,
        createdAt: new Date().toISOString(),
        subTasks: taskData.subTasks || [],
        recurring: taskData.recurring || { enabled: false }
    };
    
    dashboardState.tasks.unshift(newTask);
    dashboardState.filteredTasks = [...dashboardState.tasks];
    saveTasksToLocalStorage(dashboardState.tasks);

    // Update category task count
    if (newTask.category) {
        incrementTaskCount(newTask.category);
    }

    console.log('✅ Task created:', newTask);
    return newTask;
}

// Update existing task
export function updateTask(taskId, updates) {
    const taskIndex = dashboardState.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    
    const oldTask = dashboardState.tasks[taskIndex];
    const oldCategory = oldTask.category;
    const newCategory = updates.category;
    
    dashboardState.tasks[taskIndex] = {
        ...oldTask,
        ...updates,
        updatedAt: new Date().toISOString()
    };
    
    dashboardState.filteredTasks = [...dashboardState.tasks];
    saveTasksToLocalStorage(dashboardState.tasks);

    // Update category task counts if category changed
    if (oldCategory !== newCategory) {
        if (oldCategory) decrementTaskCount(oldCategory);
        if (newCategory) incrementTaskCount(newCategory);
    }

    console.log('✅ Task updated:', taskId);
}

// Delete task
export function deleteTask(taskId) {
    const taskIndex = dashboardState.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = dashboardState.tasks[taskIndex];
    const categoryId = task.category;

    dashboardState.tasks.splice(taskIndex, 1);
    dashboardState.filteredTasks = [...dashboardState.tasks];
    saveTasksToLocalStorage(dashboardState.tasks);

    // Update category task count
    if (categoryId) {
        decrementTaskCount(categoryId);
    }

    console.log('✅ Task deleted:', taskId);
}

// Toggle task completion
export function toggleTaskCompletion(taskId) {
    const task = dashboardState.tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;

    saveTasksToLocalStorage(dashboardState.tasks);
    console.log('✅ Task toggled:', taskId, task.completed);
}

// Render tasks list
export function renderTasks() {
    const tasksList = document.getElementById('tasksList');
    const emptyState = document.getElementById('emptyState');
    const paginationControls = document.getElementById('paginationControls');
    
    // Use FilterService for filtering by category
    let tasksToShow = filterByCategory(
        dashboardState.filteredTasks, 
        dashboardState.currentCategory
    );
    
    // Calculate pagination
    const totalTasks = tasksToShow.length;
    dashboardState.totalPages = Math.ceil(totalTasks / dashboardState.tasksPerPage) || 1;
    
    // Get current page tasks
    const startIndex = (dashboardState.currentPage - 1) * dashboardState.tasksPerPage;
    const endIndex = startIndex + dashboardState.tasksPerPage;
    const currentPageTasks = tasksToShow.slice(startIndex, endIndex);
    
    // Show/hide elements
    if (totalTasks === 0) {
        if (tasksList) tasksList.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
        if (paginationControls) paginationControls.style.display = 'none';
        return;
    }
    
    if (tasksList) {
        tasksList.style.display = 'flex';
        tasksList.innerHTML = '';
        currentPageTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksList.appendChild(taskElement);
        });
    }
    
    if (emptyState) emptyState.style.display = 'none';
    if (paginationControls) paginationControls.style.display = 'flex';
    
    // Update pagination
    updatePaginationControls();
}

// Update pagination controls
function updatePaginationControls() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const paginationInfo = document.getElementById('paginationInfo');
    
    if (prevBtn) prevBtn.disabled = dashboardState.currentPage === 1;
    if (nextBtn) nextBtn.disabled = dashboardState.currentPage === dashboardState.totalPages;
    if (paginationInfo) paginationInfo.textContent = `Page ${dashboardState.currentPage} of ${dashboardState.totalPages}`;
}

// Change page
export function changePage(direction) {
    if (direction === 'next' && dashboardState.currentPage < dashboardState.totalPages) {
        dashboardState.currentPage++;
    } else if (direction === 'prev' && dashboardState.currentPage > 1) {
        dashboardState.currentPage--;
    }
    
    renderTasks();
}

// Update stats cards
export function updateStats() {
    const analytics = calculateAnalytics(dashboardState.tasks);
    
    document.getElementById('totalTasks').textContent = analytics.total;
    document.getElementById('completedTasks').textContent = analytics.completed;
    document.getElementById('pendingTasks').textContent = analytics.pending;
    
    const overdueTasks = dashboardState.tasks.filter(t => isTaskOverdue(t));
    document.getElementById('overdueTasks').textContent = overdueTasks.length;
    
    document.getElementById('subTasksCount').textContent = analytics.totalSubTasks;
    document.getElementById('recurringCount').textContent = analytics.recurringTasks;
}

// Get task by ID
export function getTaskById(taskId) {
    return dashboardState.tasks.find(t => t.id === taskId);
}