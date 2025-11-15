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
import {
    getTasks,
    createTask as createTaskAPI,
    updateTask as updateTaskAPI,
    deleteTask as deleteTaskAPI
} from '../../services/TasksService.js';

// ===== CONFIGURATION =====
const CONFIG = {
    useAPI: true // Use API for all operations
};

// Initialize Task Manager
export async function initTaskManager() {
    console.log('✅ Task Manager initialized');

    if (CONFIG.useAPI) {
        try {
            const tasks = await getTasks();
            dashboardState.tasks = tasks;
            dashboardState.filteredTasks = [...tasks];
            // Sync to localStorage for offline fallback
            saveTasksToLocalStorage(tasks);
            console.log('✅ Tasks loaded from API:', tasks.length);
        } catch (error) {
            console.error('❌ Failed to load tasks from API, using localStorage fallback:', error);
            const tasks = loadTasksFromLocalStorage();
            dashboardState.tasks = tasks;
            dashboardState.filteredTasks = [...tasks];
        }
    } else {
        const tasks = loadTasksFromLocalStorage();
        dashboardState.tasks = tasks;
        dashboardState.filteredTasks = [...tasks];
    }
}

// Create new task
export async function createTask(taskData) {
    if (CONFIG.useAPI) {
        try {
            // Call API to create task
            const newTask = await createTaskAPI({
                title: taskData.title,
                description: taskData.description || '',
                categoryId: taskData.category ? parseInt(taskData.category) : null,
                priority: parseInt(taskData.priority) || 2,
                dueDate: taskData.dueDate || null,
                dueTime: taskData.dueTime || null,
                subTasks: taskData.subTasks || [],
                recurring: taskData.recurring || { enabled: false }
            });

            // Update local state with API response
            dashboardState.tasks.unshift(newTask);
            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            // Update category task count
            if (newTask.category) {
                await incrementTaskCount(newTask.category);
            }

            console.log('✅ Task created via API:', newTask);
            return newTask;
        } catch (error) {
            console.error('❌ Failed to create task via API, using localStorage fallback:', error);
            // Fallback to local-only if API fails
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

            if (newTask.category) {
                await incrementTaskCount(newTask.category);
            }

            console.log('✅ Task created locally:', newTask);
            return newTask;
        }
    } else {
        // localStorage-only mode
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

        if (newTask.category) {
            await incrementTaskCount(newTask.category);
        }

        console.log('✅ Task created locally:', newTask);
        return newTask;
    }
}

// Update existing task
export async function updateTask(taskId, updates) {
    const taskIndex = dashboardState.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const oldTask = dashboardState.tasks[taskIndex];
    const oldCategory = oldTask.category;
    const newCategory = updates.category;

    if (CONFIG.useAPI) {
        try {
            // Prepare API update data
            const apiUpdates = {
                ...updates,
                categoryId: updates.category ? parseInt(updates.category) : null
            };

            // Call API to update task
            const updatedTask = await updateTaskAPI(taskId, apiUpdates);

            // Update local state with API response
            dashboardState.tasks[taskIndex] = {
                ...oldTask,
                ...updatedTask
            };

            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            // Update category task counts if category changed
            if (oldCategory !== newCategory) {
                if (oldCategory) await decrementTaskCount(oldCategory);
                if (newCategory) await incrementTaskCount(newCategory);
            }

            console.log('✅ Task updated via API:', taskId);
        } catch (error) {
            console.error('❌ Failed to update task via API, using localStorage fallback:', error);
            // Fallback to local-only if API fails
            dashboardState.tasks[taskIndex] = {
                ...oldTask,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            if (oldCategory !== newCategory) {
                if (oldCategory) await decrementTaskCount(oldCategory);
                if (newCategory) await incrementTaskCount(newCategory);
            }

            console.log('✅ Task updated locally:', taskId);
        }
    } else {
        // localStorage-only mode
        dashboardState.tasks[taskIndex] = {
            ...oldTask,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        dashboardState.filteredTasks = [...dashboardState.tasks];
        saveTasksToLocalStorage(dashboardState.tasks);

        if (oldCategory !== newCategory) {
            if (oldCategory) await decrementTaskCount(oldCategory);
            if (newCategory) await incrementTaskCount(newCategory);
        }

        console.log('✅ Task updated locally:', taskId);
    }
}

// Delete task
export async function deleteTask(taskId) {
    const taskIndex = dashboardState.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = dashboardState.tasks[taskIndex];
    const categoryId = task.category;

    if (CONFIG.useAPI) {
        try {
            // Call API to delete task
            await deleteTaskAPI(taskId);

            // Update local state
            dashboardState.tasks.splice(taskIndex, 1);
            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            // Update category task count
            if (categoryId) {
                await decrementTaskCount(categoryId);
            }

            console.log('✅ Task deleted via API:', taskId);
        } catch (error) {
            console.error('❌ Failed to delete task via API, using localStorage fallback:', error);
            // Fallback to local-only if API fails
            dashboardState.tasks.splice(taskIndex, 1);
            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            if (categoryId) {
                await decrementTaskCount(categoryId);
            }

            console.log('✅ Task deleted locally:', taskId);
        }
    } else {
        // localStorage-only mode
        dashboardState.tasks.splice(taskIndex, 1);
        dashboardState.filteredTasks = [...dashboardState.tasks];
        saveTasksToLocalStorage(dashboardState.tasks);

        if (categoryId) {
            await decrementTaskCount(categoryId);
        }

        console.log('✅ Task deleted locally:', taskId);
    }
}

// Toggle task completion
export async function toggleTaskCompletion(taskId) {
    const task = dashboardState.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompletedState = !task.completed;

    if (CONFIG.useAPI) {
        try {
            // Call API to update task completion
            const updatedTask = await updateTaskAPI(taskId, {
                completed: newCompletedState,
                completedAt: newCompletedState ? new Date().toISOString() : null
            });

            // Update local state with API response
            task.completed = updatedTask.completed;
            task.completedAt = updatedTask.completedAt;

            saveTasksToLocalStorage(dashboardState.tasks);
            console.log('✅ Task toggled via API:', taskId, task.completed);
        } catch (error) {
            console.error('❌ Failed to toggle task via API, using localStorage fallback:', error);
            // Fallback to local-only if API fails
            task.completed = newCompletedState;
            task.completedAt = newCompletedState ? new Date().toISOString() : null;

            saveTasksToLocalStorage(dashboardState.tasks);
            console.log('✅ Task toggled locally:', taskId, task.completed);
        }
    } else {
        // localStorage-only mode
        task.completed = newCompletedState;
        task.completedAt = newCompletedState ? new Date().toISOString() : null;

        saveTasksToLocalStorage(dashboardState.tasks);
        console.log('✅ Task toggled locally:', taskId, task.completed);
    }
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