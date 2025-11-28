import Logger from '../../utils/Logger.js';
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
import { getMySharedTasks } from '../../services/SharedTasksService.js';

// ===== CONFIGURATION =====
const CONFIG = {
    useAPI: true // Use API for all operations
};

// Initialize Task Manager
export async function initTaskManager() {
    Logger.success(' Task Manager initialized');

    if (CONFIG.useAPI) {
        try {
            // Load personal tasks
            const personalTasks = await getTasks();

            // Load shared tasks
            const sharedTasksData = await getMySharedTasks();

            // Extract and normalize shared tasks
            const sharedTasks = sharedTasksData.map(st => {
                const task = st.task;

                // Add metadata for shared tasks
                task.isSharedTask = true;
                task.sharedTaskId = st.id;
                task.taskOwnerId = st.ownerId;
                task.taskOwnerUsername = st.ownerUsername;
                task.isOwner = st.isOwner;
                task.permissions = st.permissions;

                return task;
            });

            // Get IDs of shared tasks to filter out duplicates from personal tasks
            const sharedTaskIds = new Set(sharedTasks.map(st => st.id));

            // Filter out personal tasks that are already in shared tasks
            const uniquePersonalTasks = personalTasks.filter(task => !sharedTaskIds.has(task.id));

            // Merge unique personal tasks and shared tasks
            const allTasks = [...uniquePersonalTasks, ...sharedTasks];

            // Normalize all tasks: convert PascalCase to camelCase and handle subtasks
            allTasks.forEach(task => {
                // Normalize recurring fields from PascalCase (IsRecurring) to camelCase (isRecurring)
                if (task.isRecurring || task.IsRecurring) {
                    task.recurring = {
                        enabled: task.isRecurring || task.IsRecurring || false,
                        frequency: task.recurringFrequency || task.RecurringFrequency || null,
                        endDate: task.recurringEndDate || task.RecurringEndDate || null
                    };
                } else {
                    task.recurring = { enabled: false };
                }

                // Normalize subtasks: map 'title' to 'text' for consistency
                if (task.subTasks && Array.isArray(task.subTasks)) {
                    task.subTasks = task.subTasks.map(st => ({
                        id: st.id,
                        text: st.title || st.text,
                        title: st.title || st.text,  // Keep both for compatibility
                        completed: st.completed || false
                    }));
                }
            });

            dashboardState.tasks = allTasks;
            dashboardState.filteredTasks = [...allTasks];
            // Sync to localStorage for offline fallback
            saveTasksToLocalStorage(allTasks);
            Logger.success(' Tasks loaded from API:', allTasks.length, '(Personal:', personalTasks.length, '+ Shared:', sharedTasks.length, ')');
        } catch (error) {
            Logger.error('❌ Failed to load tasks from API, using localStorage fallback:', error);
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

            // Normalize recurring fields from API response
            if (newTask.isRecurring || newTask.IsRecurring) {
                newTask.recurring = {
                    enabled: newTask.isRecurring || newTask.IsRecurring || false,
                    frequency: newTask.recurringFrequency || newTask.RecurringFrequency || null,
                    endDate: newTask.recurringEndDate || newTask.RecurringEndDate || null
                };
            } else {
                newTask.recurring = { enabled: false };
            }

            // Update local state with API response
            dashboardState.tasks.unshift(newTask);
            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            // Update category task count
            if (newTask.category) {
                await incrementTaskCount(newTask.category);
            }

            Logger.success(' Task created via API:', newTask);
            return newTask;
        } catch (error) {
            Logger.error('❌ Failed to create task via API, using localStorage fallback:', error);
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

            Logger.success(' Task created locally:', newTask);
            return newTask;
        }
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

            // Normalize recurring fields from API response
            if (updatedTask.isRecurring || updatedTask.IsRecurring) {
                updatedTask.recurring = {
                    enabled: updatedTask.isRecurring || updatedTask.IsRecurring || false,
                    frequency: updatedTask.recurringFrequency || updatedTask.RecurringFrequency || null,
                    endDate: updatedTask.recurringEndDate || updatedTask.RecurringEndDate || null
                };
            } else {
                updatedTask.recurring = { enabled: false };
            }

            // Normalize subtasks
            if (updatedTask.subTasks && Array.isArray(updatedTask.subTasks)) {
                updatedTask.subTasks = updatedTask.subTasks.map(st => ({
                    id: st.id,
                    text: st.title || st.text,
                    title: st.title || st.text,
                    completed: st.completed || false
                }));
            }

            // Update local state with API response
            dashboardState.tasks[taskIndex] = {
                ...oldTask,
                ...updatedTask
            };

            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            // Update category task counts if category changed (BEFORE re-rendering)
            // This clears the cache, so we do it first
            if (oldCategory !== newCategory) {
                if (oldCategory) await decrementTaskCount(oldCategory);
                if (newCategory) await incrementTaskCount(newCategory);
            }

            // Update the visual element in real-time (without full page refresh)
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                const updatedElement = createTaskElement(dashboardState.tasks[taskIndex]);
                taskElement.replaceWith(updatedElement);
            }

            Logger.success(' Task updated via API:', taskId);
        } catch (error) {
            Logger.error('❌ Failed to update task via API, using localStorage fallback:', error);
            // Fallback to local-only if API fails
            dashboardState.tasks[taskIndex] = {
                ...oldTask,
                ...updates,
                updatedAt: new Date().toISOString()
            };

            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            // Update category task counts if category changed (BEFORE re-rendering)
            // This clears and reloads the cache, so we do it first
            if (oldCategory !== newCategory) {
                if (oldCategory) await decrementTaskCount(oldCategory);
                if (newCategory) await incrementTaskCount(newCategory);
            }

            // Update the visual element in real-time (without full page refresh)
            const taskElement = document.querySelector(`.task-item[data-task-id="${taskId}"]`);
            if (taskElement) {
                const updatedElement = createTaskElement(dashboardState.tasks[taskIndex]);
                taskElement.replaceWith(updatedElement);
            }

            Logger.success(' Task updated locally:', taskId);
        }
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

            Logger.success(' Task deleted via API:', taskId);
        } catch (error) {
            Logger.error('❌ Failed to delete task via API, using localStorage fallback:', error);
            // Fallback to local-only if API fails
            dashboardState.tasks.splice(taskIndex, 1);
            dashboardState.filteredTasks = [...dashboardState.tasks];
            saveTasksToLocalStorage(dashboardState.tasks);

            if (categoryId) {
                await decrementTaskCount(categoryId);
            }

            Logger.success(' Task deleted locally:', taskId);
        }
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
            Logger.success(' Task toggled via API:', taskId, task.completed);
        } catch (error) {
            Logger.error('❌ Failed to toggle task via API, using localStorage fallback:', error);
            // Fallback to local-only if API fails
            task.completed = newCompletedState;
            task.completedAt = newCompletedState ? new Date().toISOString() : null;

            saveTasksToLocalStorage(dashboardState.tasks);
            Logger.success(' Task toggled locally:', taskId, task.completed);
        }
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