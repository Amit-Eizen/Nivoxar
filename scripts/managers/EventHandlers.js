import { dashboardState, updateDashboard } from '../DashboardPage.js';
import { createTask, updateTask, deleteTask, toggleTaskCompletion, getTaskById, changePage } from './TaskManager.js';
import { addSubTask, deleteSubTask, toggleSubTask, editSubTask, renderSubTasks, addTempSubTask, deleteTempSubTask, toggleTempSubTask, editTempSubTask, renderTempSubTasks, clearTempSubTasks } from './SubTasksManager.js';
import { openTaskPopup, closeTaskPopup, openSubTasksPopup, closeSubTasksPopup, openSubTasksSidePanel, closeSubTasksSidePanel } from './PopupFactory.js';
import { refreshCategorySelect } from './CategoriesManager.js';

// Setup all event listeners
export function setupAllEventListeners() {
    setupMainButtons();
    setupQuickActions();
    setupTaskActions();
    setupPopupClicks();
}

// Main buttons
function setupMainButtons() {
    document.getElementById('createTaskBtn')?.addEventListener('click', () => {
        openTaskPopup('create');
        setTimeout(attachFormListeners, 100);
    });
    
    document.getElementById('emptyStateBtn')?.addEventListener('click', () => {
        openTaskPopup('create');
        setTimeout(attachFormListeners, 100);
    });
    
    document.getElementById('prevBtn')?.addEventListener('click', () => changePage('prev'));
    document.getElementById('nextBtn')?.addEventListener('click', () => changePage('next'));
    document.getElementById('errorClose')?.addEventListener('click', hideError);
}

// Attach form listeners
function attachFormListeners() {
    const form = document.getElementById('taskForm');
    const recurring = document.getElementById('taskRecurring');
    const hasSubTasks = document.getElementById('taskHasSubTasks');
    const categorySelect = document.getElementById('taskCategory');
    const closeBtn = document.getElementById('closeTaskPopup');
    const cancelBtn = document.getElementById('cancelTaskBtn');
    const closePanel = document.getElementById('closeSubTasksSidePanel');
    const addTempBtn = document.getElementById('addSubTaskTempBtn');
    const tempInput = document.getElementById('newSubTaskTempInput');
    
    form?.removeEventListener('submit', handleFormSubmit);
    recurring?.removeEventListener('change', toggleRecurringOptions);
    hasSubTasks?.removeEventListener('change', toggleSubTasksPanel);
    closeBtn?.removeEventListener('click', closeTaskPopup);
    cancelBtn?.removeEventListener('click', closeTaskPopup);
    closePanel?.removeEventListener('click', handlePanelClose);
    addTempBtn?.removeEventListener('click', handleAddTempSubTask);
    tempInput?.removeEventListener('keypress', handleTempSubTaskKeypress);
    
    form?.addEventListener('submit', handleFormSubmit);
    recurring?.addEventListener('change', toggleRecurringOptions);
    hasSubTasks?.addEventListener('change', toggleSubTasksPanel);
    closeBtn?.addEventListener('click', closeTaskPopup);
    cancelBtn?.addEventListener('click', closeTaskPopup);
    closePanel?.addEventListener('click', handlePanelClose);
    addTempBtn?.addEventListener('click', handleAddTempSubTask);
    tempInput?.addEventListener('keypress', handleTempSubTaskKeypress);
    
    // Load categories using centralized function
    if (categorySelect) {
        refreshCategorySelect(categorySelect);
    }
}

function toggleRecurringOptions(e) {
    const options = document.getElementById('recurringOptions');
    if (options) options.style.display = e.target.checked ? 'block' : 'none';
}

function toggleSubTasksPanel(e) {
    if (e.target.checked) {
        openSubTasksSidePanel();
        const container = document.getElementById('tempSubTasksList');
        if (container) renderTempSubTasks(dashboardState, container);
    } else {
        closeSubTasksSidePanel();
        clearTempSubTasks(dashboardState);
    }
}

function handlePanelClose() {
    const checkbox = document.getElementById('taskHasSubTasks');
    if (checkbox) checkbox.checked = false;
    closeSubTasksSidePanel();
}

function handleAddTempSubTask() {
    const input = document.getElementById('newSubTaskTempInput');
    const title = input?.value.trim();

    if (!title) return;

    addTempSubTask(dashboardState, title);
    input.value = '';
    input.focus();

    const container = document.getElementById('tempSubTasksList');
    if (container) renderTempSubTasks(dashboardState, container);
}

function handleTempSubTaskKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTempSubTask();
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    const popup = document.getElementById('taskPopup');
    const isEdit = popup?.dataset.editMode === 'true';
    const taskId = isEdit ? parseInt(popup.dataset.taskId) : null;
    
    const categorySelect = document.getElementById('taskCategory');
    const categoryValue = categorySelect.value; // Simply get the selected category ID
    
    const taskData = {
        title: document.getElementById('taskTitle').value.trim(),
        description: document.getElementById('taskDescription').value.trim(),
        category: categoryValue,
        priority: parseInt(document.getElementById('taskPriority').value),
        dueDate: document.getElementById('taskDueDate').value,
        dueTime: document.getElementById('taskDueTime').value,
        subTasks: document.getElementById('taskHasSubTasks').checked ? [...dashboardState.tempSubTasks] : [],
        recurring: null
    };
    
    const recurringCheckbox = document.getElementById('taskRecurring');
    if (recurringCheckbox?.checked) {
        taskData.recurring = {
            enabled: true,
            frequency: document.getElementById('recurringFrequency').value,
            endDate: document.getElementById('recurringEndDate').value
        };
    }
    
    if (isEdit && taskId) {
        updateTask(taskId, taskData);
    } else {
        createTask(taskData);
    }

    clearTempSubTasks(dashboardState);
    closeSubTasksSidePanel();
    closeTaskPopup();
    updateDashboard();
}

// Quick actions
function setupQuickActions() {
    document.querySelectorAll('.quick-action-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            
            document.querySelectorAll('.quick-action-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            switch(action) {
                case 'all':
                    dashboardState.filteredTasks = [...dashboardState.tasks];
                    dashboardState.currentCategory = 'all';
                    break;
                case 'high-priority':
                    dashboardState.filteredTasks = dashboardState.tasks.filter(t => t.priority === 3);
                    dashboardState.currentCategory = 'all';
                    break;
                case 'today':
                    const today = new Date().setHours(0,0,0,0);
                    dashboardState.filteredTasks = dashboardState.tasks.filter(t => {
                        if (!t.dueDate) return false;
                        return new Date(t.dueDate).setHours(0,0,0,0) === today;
                    });
                    dashboardState.currentCategory = 'all';
                    break;
                case 'personal':
                    dashboardState.currentCategory = 'personal';
                    dashboardState.filteredTasks = [...dashboardState.tasks];
                    break;
                case 'work':
                    dashboardState.currentCategory = 'work';
                    dashboardState.filteredTasks = [...dashboardState.tasks];
                    break;
                case 'recurring':
                    dashboardState.filteredTasks = dashboardState.tasks.filter(t => t.recurring?.enabled);
                    dashboardState.currentCategory = 'all';
                    break;
            }
            
            dashboardState.currentPage = 1;
            updateDashboard();
        });
    });
}

// Task actions
function setupTaskActions() {
    const tasksContainer = document.getElementById('tasksList');
    if (!tasksContainer) return;
    
    tasksContainer.addEventListener('click', handleClick);
    tasksContainer.addEventListener('change', handleChange);
}

function updateSubTasksPopupInfo(task) {
    const countEl = document.getElementById('subtasksCount');
    const completedEl = document.getElementById('subtasksCompleted');
    
    if (task.subTasks && task.subTasks.length > 0) {
        const completed = task.subTasks.filter(st => st.completed).length;
        if (countEl) countEl.textContent = task.subTasks.length;
        if (completedEl) completedEl.textContent = completed;
    } else {
        if (countEl) countEl.textContent = '0';
        if (completedEl) completedEl.textContent = '0';
    }
}

function handleClick(e) {
    const editBtn = e.target.closest('.task-edit');
    if (editBtn) {
        const taskId = parseInt(editBtn.closest('.task-item').dataset.taskId);
        const task = getTaskById(taskId);
        if (task) {
            openTaskPopup('edit', task);
            setTimeout(attachFormListeners, 100);
        }
        return;
    }
    
    const deleteBtn = e.target.closest('.task-delete');
    if (deleteBtn) {
        const taskId = parseInt(deleteBtn.closest('.task-item').dataset.taskId);
        if (confirm('Are you sure you want to delete this task?')) {
            deleteTask(taskId);
            updateDashboard();
        }
        return;
    }
    
    const subtasksBtn = e.target.closest('.task-subtasks-btn');
    if (subtasksBtn) {
        const taskId = parseInt(subtasksBtn.closest('.task-item').dataset.taskId);
        const task = getTaskById(taskId);
        if (task) {
            openSubTasksPopup(task);
            
            setTimeout(() => {
                const container = document.getElementById('subTasksList');
                if (container) renderSubTasks(task, container);

                const input = document.getElementById('newSubTaskInput');
                const addBtn = document.getElementById('addSubTaskBtn');
                const closeBtn = document.getElementById('closeSubTasksBtn');
                const closePopupBtn = document.getElementById('closeSubTasksPopup');

                if (addBtn) {
                    addBtn.replaceWith(addBtn.cloneNode(true));
                    document.getElementById('addSubTaskBtn').addEventListener('click', () => {
                        const currentInput = document.getElementById('newSubTaskInput');
                        const title = currentInput?.value.trim();
                        if (!title) return;

                        addSubTask(dashboardState, taskId, title);
                        currentInput.value = '';
                        currentInput.focus();

                        const updatedTask = getTaskById(taskId);
                        if (updatedTask && container) {
                            renderSubTasks(updatedTask, container);
                            updateSubTasksPopupInfo(updatedTask);
                        }

                        updateDashboard();
                    });
                }

                if (input) {
                    input.replaceWith(input.cloneNode(true));
                    document.getElementById('newSubTaskInput').addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const title = e.target.value.trim();
                            if (!title) return;

                            addSubTask(dashboardState, taskId, title);
                            e.target.value = '';
                            e.target.focus();

                            const updatedTask = getTaskById(taskId);
                            if (updatedTask && container) {
                                renderSubTasks(updatedTask, container);
                                updateSubTasksPopupInfo(updatedTask);
                            }

                            updateDashboard();
                        }
                    });
                }
                
                if (closeBtn) {
                    closeBtn.replaceWith(closeBtn.cloneNode(true));
                    document.getElementById('closeSubTasksBtn').addEventListener('click', closeSubTasksPopup);
                }
                
                if (closePopupBtn) {
                    closePopupBtn.replaceWith(closePopupBtn.cloneNode(true));
                    document.getElementById('closeSubTasksPopup').addEventListener('click', closeSubTasksPopup);
                }
                
                // Add event listeners for edit and delete buttons in popup
                if (container) {
                    container.addEventListener('click', (e) => {
                        // Handle edit button
                        const editBtn = e.target.closest('.subtask-edit');
                        if (editBtn) {
                            handleSubtaskEdit(e, taskId, container);
                            return;
                        }
                        
                        // Handle delete button
                        const deleteBtn = e.target.closest('.subtask-delete');
                        if (deleteBtn) {
                            handleSubtaskDelete(e, taskId, container);
                            return;
                        }
                    });
                    
                    container.addEventListener('change', (e) => {
                        const checkbox = e.target.closest('.subtask-checkbox input[type="checkbox"]');
                        if (checkbox) {
                            handleSubtaskCheckbox(e, taskId, container);
                        }
                    });
                }
            }, 100);
        }
        return;
    }
    
    const subtaskEdit = e.target.closest('.subtask-edit');
    if (subtaskEdit) {
        const item = subtaskEdit.closest('.subtask-item');
        const taskId = item.dataset.taskId ? parseInt(item.dataset.taskId) : null;
        const subtaskId = parseInt(item.dataset.subtaskId);
        const textSpan = item.querySelector('.subtask-text');
        const currentText = textSpan.dataset.original;
        const actionsDiv = item.querySelector('.subtask-actions');
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'subtask-edit-input';
        input.value = currentText;
        
        const saveBtn = document.createElement('button');
        saveBtn.className = 'subtask-save-btn';
        saveBtn.innerHTML = '<i class="fas fa-check"></i>';
        saveBtn.title = 'Save';
        
        textSpan.replaceWith(input);
        actionsDiv.style.display = 'none';
        
        const saveBtnWrapper = document.createElement('div');
        saveBtnWrapper.className = 'subtask-actions';
        saveBtnWrapper.appendChild(saveBtn);
        item.appendChild(saveBtnWrapper);
        
        input.focus();
        input.select();
        
        const save = () => {
            const newText = input.value.trim();
            if (newText && newText !== currentText) {
                if (taskId) {
                    editSubTask(dashboardState, taskId, subtaskId, newText);
                    const task = getTaskById(taskId);
                    const container = document.getElementById('subTasksList');
                    if (task && container) renderSubTasks(task, container);
                    updateDashboard();
                } else {
                    editTempSubTask(dashboardState, subtaskId, newText);
                    const container = document.getElementById('tempSubTasksList');
                    if (container) renderTempSubTasks(dashboardState, container);
                }
            } else {
                const span = document.createElement('span');
                span.className = 'subtask-text';
                span.dataset.original = currentText;
                span.textContent = currentText;
                input.replaceWith(span);
                actionsDiv.style.display = 'flex';
                saveBtnWrapper.remove();
            }
        };
        
        saveBtn.addEventListener('click', save);
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                save();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const span = document.createElement('span');
                span.className = 'subtask-text';
                span.dataset.original = currentText;
                span.textContent = currentText;
                input.replaceWith(span);
                actionsDiv.style.display = 'flex';
                saveBtnWrapper.remove();
            }
        });
        
        return;
    }
    
    // Handle subtask delete
    const subtaskDelete = e.target.closest('.subtask-delete');
    if (subtaskDelete) {
        const item = subtaskDelete.closest('.subtask-item');
        const taskId = item.dataset.taskId ? parseInt(item.dataset.taskId) : null;
        const subtaskId = parseInt(item.dataset.subtaskId);

        if (taskId) {
            deleteSubTask(dashboardState, taskId, subtaskId);
            const task = getTaskById(taskId);
            const container = document.getElementById('subTasksList');
            if (task && container) {
                renderSubTasks(task, container);
                updateSubTasksPopupInfo(task);
            }
            updateDashboard();
        } else {
            deleteTempSubTask(dashboardState, subtaskId);
            const container = document.getElementById('tempSubTasksList');
            if (container) renderTempSubTasks(dashboardState, container);
        }
        return;
    }
}


function handleChange(e) {
    if (e.target.type !== 'checkbox') return;
    
    const taskCheckbox = e.target.closest('.task-checkbox');
    const subtaskCheckbox = e.target.closest('.subtask-checkbox');
    
    if (taskCheckbox && !subtaskCheckbox) {
        const taskId = parseInt(taskCheckbox.closest('.task-item').dataset.taskId);
        toggleTaskCompletion(taskId);
        updateDashboard();
        return;
    }
    
    if (subtaskCheckbox) {
        e.stopPropagation();

        const item = subtaskCheckbox.closest('.subtask-item');
        const taskId = item.dataset.taskId ? parseInt(item.dataset.taskId) : null;
        const subtaskId = parseInt(item.dataset.subtaskId);
        
        if (taskId) {
            // ✅ Toggle the state
            toggleSubTask(dashboardState, taskId, subtaskId);

            const task = getTaskById(taskId);
            const subTask = task?.subTasks?.find(st => st.id === subtaskId);

            if (subTask) {
                if (subTask.completed) {
                    item.classList.add('completed');
                    e.target.checked = true;
                } else {
                    item.classList.remove('completed');
                    e.target.checked = false;
                }

                // Update counter
                const completedEl = document.getElementById('subtasksCompleted');
                if (completedEl && task.subTasks) {
                    const completed = task.subTasks.filter(st => st.completed).length;
                    completedEl.textContent = completed;
                }
            }

            updateDashboard();
        } else {
            // Temp subtask
            toggleTempSubTask(dashboardState, subtaskId);

            const subTask = dashboardState.tempSubTasks.find(st => st.id === subtaskId);
            if (subTask) {
                if (subTask.completed) {
                    item.classList.add('completed');
                    e.target.checked = true;
                } else {
                    item.classList.remove('completed');
                    e.target.checked = false;
                }
            }

            const container = document.getElementById('tempSubTasksList');
            if (container) renderTempSubTasks(dashboardState, container);
        }
        return;
    }
}

// Popup clicks
function setupPopupClicks() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            if (e.target.id === 'taskPopup') closeTaskPopup();
            if (e.target.id === 'subTasksPopup') closeSubTasksPopup();
        }
    });
}

function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) errorEl.style.display = 'none';
}

// Helper functions for subtask actions in popup
function handleSubtaskEdit(e, taskId, container) {
    const item = e.target.closest('.subtask-item');
    if (!item) return;
    
    const subtaskId = parseInt(item.dataset.subtaskId);
    const textSpan = item.querySelector('.subtask-text');
    const currentText = textSpan.dataset.original;
    const actionsDiv = item.querySelector('.subtask-actions');
    
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'subtask-edit-input';
    input.value = currentText;
    
    const saveBtn = document.createElement('button');
    saveBtn.className = 'subtask-save-btn';
    saveBtn.innerHTML = '<i class="fas fa-check"></i>';
    saveBtn.title = 'Save';
    
    textSpan.replaceWith(input);
    actionsDiv.style.display = 'none';
    
    const saveBtnWrapper = document.createElement('div');
    saveBtnWrapper.className = 'subtask-actions';
    saveBtnWrapper.appendChild(saveBtn);
    item.appendChild(saveBtnWrapper);
    
    input.focus();
    input.select();
    
    const save = () => {
        const newText = input.value.trim();
        if (newText && newText !== currentText) {
            editSubTask(dashboardState, taskId, subtaskId, newText);
            const task = getTaskById(taskId);
            if (task && container) {
                renderSubTasks(task, container);
                updateSubTasksPopupInfo(task);
            }
            updateDashboard();
        } else {
            const span = document.createElement('span');
            span.className = 'subtask-text';
            span.dataset.original = currentText;
            span.textContent = currentText;
            input.replaceWith(span);
            actionsDiv.style.display = 'flex';
            saveBtnWrapper.remove();
        }
    };
    
    saveBtn.addEventListener('click', save);
    
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            save();
        }
    });
    
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const span = document.createElement('span');
            span.className = 'subtask-text';
            span.dataset.original = currentText;
            span.textContent = currentText;
            input.replaceWith(span);
            actionsDiv.style.display = 'flex';
            saveBtnWrapper.remove();
        }
    });
}

function handleSubtaskDelete(e, taskId, container) {
    const item = e.target.closest('.subtask-item');
    if (!item) return;

    const subtaskId = parseInt(item.dataset.subtaskId);
    deleteSubTask(dashboardState, taskId, subtaskId);

    const task = getTaskById(taskId);
    if (task && container) {
        renderSubTasks(task, container);
        updateSubTasksPopupInfo(task);
    }
    updateDashboard();
}

function handleSubtaskCheckbox(e, taskId, container) {
    e.stopPropagation();

    const item = e.target.closest('.subtask-item');
    if (!item) return;

    const subtaskId = parseInt(item.dataset.subtaskId);
    toggleSubTask(dashboardState, taskId, subtaskId);
    
    const task = getTaskById(taskId);
    const subTask = task?.subTasks?.find(st => st.id === subtaskId);
    
    if (subTask) {
        if (subTask.completed) {
            item.classList.add('completed');
            e.target.checked = true;
        } else {
            item.classList.remove('completed');
            e.target.checked = false;
        }
        
        updateSubTasksPopupInfo(task);
    }
    
    updateDashboard();
}

export function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorEl && errorText) {
        errorText.textContent = message;
        errorEl.style.display = 'flex';
        setTimeout(hideError, 5000);
    }
}