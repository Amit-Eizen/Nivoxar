// EventHandlers.js - COMPLETE FIX

import { dashboardState, updateDashboard } from '../DashboardPage.js';
import { createTask, updateTask, deleteTask, toggleTaskCompletion, getTaskById, changePage } from './TaskManager.js';
import { addSubTask, deleteSubTask, toggleSubTask, editSubTask, renderSubTasks, addTempSubTask, deleteTempSubTask, toggleTempSubTask, editTempSubTask, renderTempSubTasks, clearTempSubTasks } from './SubTasksManager.js';
import { openTaskPopup, closeTaskPopup, openSubTasksPopup, closeSubTasksPopup, openSubTasksSidePanel, closeSubTasksSidePanel } from './PopupFactory.js';

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
    const newCategoryInput = document.getElementById('newCategoryInput');
    const closeBtn = document.getElementById('closeTaskPopup');
    const cancelBtn = document.getElementById('cancelTaskBtn');
    const closePanel = document.getElementById('closeSubTasksSidePanel');
    const addTempBtn = document.getElementById('addSubTaskTempBtn');
    const tempInput = document.getElementById('newSubTaskTempInput');
    
    form?.removeEventListener('submit', handleFormSubmit);
    recurring?.removeEventListener('change', toggleRecurringOptions);
    hasSubTasks?.removeEventListener('change', toggleSubTasksPanel);
    categorySelect?.removeEventListener('change', handleCategoryChange);
    closeBtn?.removeEventListener('click', closeTaskPopup);
    cancelBtn?.removeEventListener('click', closeTaskPopup);
    closePanel?.removeEventListener('click', handlePanelClose);
    addTempBtn?.removeEventListener('click', handleAddTempSubTask);
    tempInput?.removeEventListener('keypress', handleTempSubTaskKeypress);
    
    form?.addEventListener('submit', handleFormSubmit);
    recurring?.addEventListener('change', toggleRecurringOptions);
    hasSubTasks?.addEventListener('change', toggleSubTasksPanel);
    categorySelect?.addEventListener('change', handleCategoryChange);
    closeBtn?.addEventListener('click', closeTaskPopup);
    cancelBtn?.addEventListener('click', closeTaskPopup);
    closePanel?.addEventListener('click', handlePanelClose);
    addTempBtn?.addEventListener('click', handleAddTempSubTask);
    tempInput?.addEventListener('keypress', handleTempSubTaskKeypress);
    
    loadCategoriesIntoSelect();
}

// Load categories from localStorage
function loadCategoriesIntoSelect() {
    const categorySelect = document.getElementById('taskCategory');
    if (!categorySelect) return;
    
    const categories = getCategories();
    
    categorySelect.innerHTML = `
        <option value="">Select category...</option>
        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        <option value="__new__">+ Create New Category</option>
    `;
}

function getCategories() {
    const saved = localStorage.getItem('nivoxar_categories');
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (error) {
            console.error('Failed to parse categories');
        }
    }
    return ['work', 'personal', 'urgent'];
}

function saveCategories(categories) {
    try {
        localStorage.setItem('nivoxar_categories', JSON.stringify(categories));
    } catch (error) {
        console.error('Failed to save categories');
    }
}

function handleCategoryChange(e) {
    const newCategoryInput = document.getElementById('newCategoryInput');
    if (!newCategoryInput) return;
    
    if (e.target.value === '__new__') {
        newCategoryInput.style.display = 'block';
        newCategoryInput.focus();
    } else {
        newCategoryInput.style.display = 'none';
        newCategoryInput.value = '';
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
        if (container) renderTempSubTasks(container);
    } else {
        closeSubTasksSidePanel();
        clearTempSubTasks();
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
    
    addTempSubTask(title);
    input.value = '';
    input.focus();
    
    const container = document.getElementById('tempSubTasksList');
    if (container) renderTempSubTasks(container);
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
    const newCategoryInput = document.getElementById('newCategoryInput');
    let categoryValue = categorySelect.value;
    
    if (categoryValue === '__new__') {
        const newCategory = newCategoryInput.value.trim();
        if (newCategory) {
            categoryValue = newCategory;
            const categories = getCategories();
            if (!categories.includes(newCategory)) {
                categories.push(newCategory);
                saveCategories(categories);
            }
        } else {
            categoryValue = '';
        }
    }
    
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
    
    clearTempSubTasks();
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
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
}

// Setup SubTasks Popup Listeners
function setupSubTasksPopupListeners() {
    const closeBtn = document.getElementById('closeSubTasksPopup');
    const closeBtn2 = document.getElementById('closeSubTasksBtn');
    const addBtn = document.getElementById('addSubTaskBtn');
    const input = document.getElementById('newSubTaskInput');
    
    if (closeBtn) {
        closeBtn.removeEventListener('click', closeSubTasksPopup);
        closeBtn.addEventListener('click', closeSubTasksPopup);
    }
    
    if (closeBtn2) {
        closeBtn2.removeEventListener('click', closeSubTasksPopup);
        closeBtn2.addEventListener('click', closeSubTasksPopup);
    }
    
    if (addBtn) {
        addBtn.removeEventListener('click', handleAddSubTaskToExisting);
        addBtn.addEventListener('click', handleAddSubTaskToExisting);
    }
    
    if (input) {
        input.removeEventListener('keypress', handleSubTaskInputKeypress);
        input.addEventListener('keypress', handleSubTaskInputKeypress);
    }
}

// ✅ הוספת הפונקציה שחסרה!
function handleSubTaskInputKeypress(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleAddSubTaskToExisting();
    }
}

function handleAddSubTaskToExisting() {
    const input = document.getElementById('newSubTaskInput');
    const popup = document.getElementById('subTasksPopup');
    const taskId = parseInt(popup?.dataset.taskId);
    
    if (!input || !taskId) return;
    
    const title = input.value.trim();
    if (!title) return;
    
    addSubTask(taskId, title);
    input.value = '';
    input.focus();
    
    const task = getTaskById(taskId);
    const container = document.getElementById('subTasksList');
    if (task && container) {
        renderSubTasks(task, container);
        updateSubTasksPopupInfo(task);
    }
    
    updateDashboard();
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

// Handle all clicks
function handleClick(e) {
    const editBtn = e.target.closest('.edit-btn');
    if (editBtn) {
        const taskId = parseInt(editBtn.closest('.task-item').dataset.taskId);
        const task = getTaskById(taskId);
        if (task) {
            openTaskPopup('edit', task);
            setTimeout(attachFormListeners, 100);
        }
        return;
    }
    
    const deleteBtn = e.target.closest('.delete-btn');
    if (deleteBtn) {
        const taskId = parseInt(deleteBtn.closest('.task-item').dataset.taskId);
        if (confirm('Delete this task?')) {
            deleteTask(taskId);
            updateDashboard();
        }
        return;
    }
    
    const subtasksBtn = e.target.closest('.subtasks-btn');
    if (subtasksBtn) {
        const taskId = parseInt(subtasksBtn.closest('.task-item').dataset.taskId);
        const task = getTaskById(taskId);
        if (task) {
            openSubTasksPopup(task);
            setTimeout(() => {
                setupSubTasksPopupListeners();
                const container = document.getElementById('subTasksList');
                if (container) renderSubTasks(task, container);
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
                    editSubTask(taskId, subtaskId, newText);
                    const task = getTaskById(taskId);
                    const container = document.getElementById('subTasksList');
                    if (task && container) renderSubTasks(task, container);
                    updateDashboard();
                } else {
                    editTempSubTask(subtaskId, newText);
                    const container = document.getElementById('tempSubTasksList');
                    if (container) renderTempSubTasks(container);
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
            deleteSubTask(taskId, subtaskId);
            const task = getTaskById(taskId);
            const container = document.getElementById('subTasksList');
            if (task && container) {
                renderSubTasks(task, container); 
                updateSubTasksPopupInfo(task);
            }
            updateDashboard();
        } else {
            deleteTempSubTask(subtaskId);
            const container = document.getElementById('tempSubTasksList');
            if (container) renderTempSubTasks(container);
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
            toggleSubTask(taskId, subtaskId);
            
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
            toggleTempSubTask(subtaskId);
            
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
            if (container) renderTempSubTasks(container);
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

export function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorEl && errorText) {
        errorText.textContent = message;
        errorEl.style.display = 'flex';
        setTimeout(hideError, 5000);
    }
}