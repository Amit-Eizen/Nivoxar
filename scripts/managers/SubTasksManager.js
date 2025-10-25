// SubTasksManager.js - Unified subtasks manager for all pages
import { saveTasksToLocalStorage } from '../../utils/TaskUtils.js';

export function initSubTasksManager() {
    console.log('✅ SubTasks Manager initialized');
}

// ========== EXISTING TASK SUBTASKS ==========

export function addSubTask(tasksState, taskId, text) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task) return;

    if (!task.subTasks) task.subTasks = [];

    task.subTasks.push({
        id: Date.now(),
        text: text,
        completed: false
    });

    saveTasksToLocalStorage(tasksState.tasks);
}

export function editSubTask(tasksState, taskId, subTaskId, newText) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;

    const subTask = task.subTasks.find(st => st.id === subTaskId);
    if (subTask) {
        subTask.text = newText;
        saveTasksToLocalStorage(tasksState.tasks);
    }
}

export function toggleSubTask(tasksState, taskId, subTaskId) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;

    const subTask = task.subTasks.find(st => st.id === subTaskId);
    if (subTask) {
        subTask.completed = !subTask.completed;
        console.log('✅ SubTask toggled:', subTaskId, subTask.completed);
        saveTasksToLocalStorage(tasksState.tasks);
    }
}

export function deleteSubTask(tasksState, taskId, subTaskId) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;

    task.subTasks = task.subTasks.filter(st => st.id !== subTaskId);
    saveTasksToLocalStorage(tasksState.tasks);
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
    });

    console.log('🎨 Rendered subtasks for task:', task.id, task.subTasks.map(st => ({id: st.id, completed: st.completed})));
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

export function addTempSubTask(tasksState, text) {
    tasksState.tempSubTasks.push({
        id: Date.now(),
        text: text,
        completed: false
    });
}

export function editTempSubTask(tasksState, subTaskId, newText) {
    const subTask = tasksState.tempSubTasks.find(st => st.id === subTaskId);
    if (subTask) subTask.text = newText;
}

export function toggleTempSubTask(tasksState, subTaskId) {
    const subTask = tasksState.tempSubTasks.find(st => st.id === subTaskId);
    if (subTask) subTask.completed = !subTask.completed;
}

export function deleteTempSubTask(tasksState, subTaskId) {
    tasksState.tempSubTasks = tasksState.tempSubTasks.filter(st => st.id !== subTaskId);
}

export function clearTempSubTasks(tasksState) {
    tasksState.tempSubTasks = [];
}

export function renderTempSubTasks(tasksState, container) {
    const tempSubTasks = tasksState.tempSubTasks || [];
    
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

    updateTempSummary(tasksState);
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

function updateTempSummary(tasksState) {
    const summary = document.getElementById('tempSubTasksSummary');
    if (!summary) return;

    const total = tasksState.tempSubTasks.length;
    const completed = tasksState.tempSubTasks.filter(st => st.completed).length;

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