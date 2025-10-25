import { calendarState } from '../CalendarPage.js';

export function initSubTasksManager() {
    console.log('✅ SubTasks Manager initialized');
}

// ========== EXISTING TASK SUBTASKS ==========

export function addSubTask(taskId, text) {
    const task = calendarState.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (!task.subTasks) task.subTasks = [];
    
    task.subTasks.push({
        id: Date.now(),
        text: text,
        completed: false
    });
    
    saveTasksToLocalStorage();
}

export function editSubTask(taskId, subTaskId, newText) {
    const task = calendarState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;
    
    const subTask = task.subTasks.find(st => st.id === subTaskId);
    if (subTask) {
        subTask.text = newText;
        saveTasksToLocalStorage();
    }
}

export function toggleSubTask(taskId, subTaskId) {
    const task = calendarState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;
    
    const subTask = task.subTasks.find(st => st.id === subTaskId);
    if (subTask) {
        subTask.completed = !subTask.completed;
        console.log('✅ SubTask toggled:', subTaskId, subTask.completed);
        saveTasksToLocalStorage();
    }
}

export function deleteSubTask(taskId, subTaskId) {
    const task = calendarState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;
    
    task.subTasks = task.subTasks.filter(st => st.id !== subTaskId);
    saveTasksToLocalStorage();
}

// Render SubTasks in popup (for existing task)
export function renderSubTasks(task, container) {
    if (!task.subTasks || task.subTasks.length === 0) {
        container.innerHTML = '<div class="subtasks-empty">No subtasks yet. Add one above!</div>';
        return;
    }
    
    container.innerHTML = '';
    
    task.subTasks.forEach(subTask => {
        const subTaskEl = createSubTaskElement(subTask, task.id);
        container.appendChild(subTaskEl);
        
        /* attachSubTaskListeners(subTaskEl, task.id, subTask.id); */
    });
    
    console.log('🎨 Rendered subtasks for task:', task.id, task.subTasks.map(st => ({id: st.id, completed: st.completed})));
}

// Attach listeners to subtask element
function attachSubTaskListeners(element, taskId, subTaskId) {
    const checkbox = element.querySelector('input[type="checkbox"]');
    const editBtn = element.querySelector('.subtask-edit');
    const deleteBtn = element.querySelector('.subtask-delete');
    
    if (checkbox) {
        checkbox.addEventListener('change', () => {
            toggleSubTask(taskId, subTaskId);
            const task = getTaskById(taskId);
            const container = document.getElementById('subTasksList');
            if (task && container) renderSubTasks(task, container);
            
            // Update info in popup
            const countEl = document.getElementById('subtasksCompleted');
            if (countEl && task.subTasks) {
                const completed = task.subTasks.filter(st => st.completed).length;
                countEl.textContent = completed;
            }
        });
    }
    
    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            deleteSubTask(taskId, subTaskId);
            const task = getTaskById(taskId);
            const container = document.getElementById('subTasksList');
            if (task && container) {
                renderSubTasks(task, container);
                
                // Update info in popup
                const countEl = document.getElementById('subtasksCount');
                const completedEl = document.getElementById('subtasksCompleted');
                if (task.subTasks) {
                    const completed = task.subTasks.filter(st => st.completed).length;
                    if (countEl) countEl.textContent = task.subTasks.length;
                    if (completedEl) completedEl.textContent = completed;
                } else {
                    if (countEl) countEl.textContent = '0';
                    if (completedEl) completedEl.textContent = '0';
                }
            }
        });
    }
    
    // Edit functionality handled by global click handler
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Save tasks to localStorage
function saveTasksToLocalStorage() {
    try {
        localStorage.setItem('nivoxar_tasks', JSON.stringify(calendarState.tasks));
    } catch (error) {
        console.error('Failed to save tasks');
    }
}

function createSubTaskElement(subTask, taskId) {
    const div = document.createElement('div');
    div.className = `subtask-item ${subTask.completed ? 'completed' : ''}`;
    div.dataset.subtaskId = subTask.id;
    div.dataset.taskId = taskId;
    
    div.innerHTML = `
        <label class="subtask-checkbox">
            <input type="checkbox" ${subTask.completed ? 'checked' : ''}>
            <span class="checkmark"></span>
        </label>
        <span class="subtask-text" data-original="${escapeHtml(subTask.text)}">${escapeHtml(subTask.text)}</span>
        <div class="subtask-actions">
            <button class="subtask-edit" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="subtask-delete" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return div;
}

// ========== TEMPORARY SUBTASKS ==========

export function addTempSubTask(text) {
    calendarState.tempSubTasks.push({
        id: Date.now(),
        text: text,
        completed: false
    });
}

export function editTempSubTask(subTaskId, newText) {
    const subTask = calendarState.tempSubTasks.find(st => st.id === subTaskId);
    if (subTask) subTask.text = newText;
}

export function toggleTempSubTask(subTaskId) {
    const subTask = calendarState.tempSubTasks.find(st => st.id === subTaskId);
    if (subTask) subTask.completed = !subTask.completed;
}

export function deleteTempSubTask(subTaskId) {
    calendarState.tempSubTasks = calendarState.tempSubTasks.filter(st => st.id !== subTaskId);
}

export function clearTempSubTasks() {
    calendarState.tempSubTasks = [];
}

export function renderTempSubTasks(container) {
    const tempSubTasks = calendarState.tempSubTasks || [];
    
    if (tempSubTasks.length === 0) {
        container.innerHTML = '<div class="subtasks-empty">No subtasks added yet.</div>';
        
        const summary = document.getElementById('tempSubTasksSummary');
        if (summary) {
            summary.innerHTML = '<i class="fas fa-info-circle"></i><span class="summary-text">No subtasks yet</span>';
        }
        return;
    }
    
    container.innerHTML = '';
    tempSubTasks.forEach(subTask => {
        const el = createTempSubTaskElement(subTask);
        container.appendChild(el);
    });
    
    updateTempSummary();
}

function createTempSubTaskElement(subTask) {
    const div = document.createElement('div');
    div.className = `subtask-item ${subTask.completed ? 'completed' : ''}`;
    div.dataset.subtaskId = subTask.id;
    
    div.innerHTML = `
        <label class="subtask-checkbox">
            <input type="checkbox" ${subTask.completed ? 'checked' : ''}>
            <span class="checkmark"></span>
        </label>
        <span class="subtask-text" data-original="${subTask.text}">${subTask.text}</span>
        <div class="subtask-actions">
            <button class="subtask-edit" title="Edit">
                <i class="fas fa-edit"></i>
            </button>
            <button class="subtask-delete" title="Delete">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    return div;
}

function updateTempSummary() {
    const summary = document.getElementById('tempSubTasksSummary');
    if (!summary) return;
    
    const total = calendarState.tempSubTasks.length;
    const completed = calendarState.tempSubTasks.filter(st => st.completed).length;
    
    summary.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span class="summary-text">${completed} of ${total} completed</span>
    `;
}

export function calculateSubTasksProgress(subTasks) {
    if (!subTasks || subTasks.length === 0) {
        return { completed: 0, total: 0, percentage: 0 };
    }
    
    const completed = subTasks.filter(st => st.completed).length;
    const total = subTasks.length;
    const percentage = Math.round((completed / total) * 100);
    
    return { completed, total, percentage };
}