// SubTasksManager.js - Unified subtasks manager for all pages
import { saveTasksToLocalStorage } from '../../utils/TaskUtils.js';
import {
    addSubTask as addSubTaskAPI,
    updateSubTask as updateSubTaskAPI,
    deleteSubTask as deleteSubTaskAPI,
    toggleSubTaskCompletion
} from '../../services/TasksService.js';

export function initSubTasksManager() {
    console.log('✅ SubTasks Manager initialized');
}

// ========== EXISTING TASK SUBTASKS (API-based) ==========

export async function addSubTask(tasksState, taskId, text) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
        // Call API to add subtask
        const newSubTask = await addSubTaskAPI(taskId, {
            title: text,
            order: task.subTasks?.length || 0
        });

        // Update local state with API response
        if (!task.subTasks) task.subTasks = [];

        // Map API response to local format
        task.subTasks.push({
            id: newSubTask.id,
            text: newSubTask.title,
            completed: newSubTask.completed || false
        });

        saveTasksToLocalStorage(tasksState.tasks);
        console.log('✅ SubTask added via API:', newSubTask);
        return newSubTask;
    } catch (error) {
        console.error('❌ Failed to add subtask:', error);
        // Fallback to local-only if API fails
        if (!task.subTasks) task.subTasks = [];
        task.subTasks.push({
            id: Date.now(),
            text: text,
            completed: false
        });
        saveTasksToLocalStorage(tasksState.tasks);
        throw error;
    }
}

export async function editSubTask(tasksState, taskId, subTaskId, newText) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;

    const subTask = task.subTasks.find(st => st.id === subTaskId);
    if (!subTask) return;

    try {
        // Call API to update subtask
        const updatedSubTask = await updateSubTaskAPI(taskId, subTaskId, {
            title: newText,
            completed: subTask.completed
        });

        // Update local state
        subTask.text = updatedSubTask.title;
        saveTasksToLocalStorage(tasksState.tasks);
        console.log('✅ SubTask updated via API:', updatedSubTask);
        return updatedSubTask;
    } catch (error) {
        console.error('❌ Failed to update subtask:', error);
        // Fallback to local-only
        subTask.text = newText;
        saveTasksToLocalStorage(tasksState.tasks);
        throw error;
    }
}

export async function toggleSubTask(tasksState, taskId, subTaskId) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;

    const subTask = task.subTasks.find(st => st.id === subTaskId);
    if (!subTask) return;

    const newCompletedStatus = !subTask.completed;

    try {
        // Call API to toggle subtask
        const updatedSubTask = await toggleSubTaskCompletion(taskId, subTaskId, newCompletedStatus);

        // Update local state
        subTask.completed = updatedSubTask.completed;
        console.log('✅ SubTask toggled via API:', subTaskId, subTask.completed);
        saveTasksToLocalStorage(tasksState.tasks);
        return updatedSubTask;
    } catch (error) {
        console.error('❌ Failed to toggle subtask:', error);
        // Fallback to local-only
        subTask.completed = newCompletedStatus;
        saveTasksToLocalStorage(tasksState.tasks);
        throw error;
    }
}

export async function deleteSubTask(tasksState, taskId, subTaskId) {
    const task = tasksState.tasks.find(t => t.id === taskId);
    if (!task?.subTasks) return;

    try {
        // Call API to delete subtask
        await deleteSubTaskAPI(taskId, subTaskId);

        // Update local state
        task.subTasks = task.subTasks.filter(st => st.id !== subTaskId);
        saveTasksToLocalStorage(tasksState.tasks);
        console.log('✅ SubTask deleted via API:', subTaskId);
    } catch (error) {
        console.error('❌ Failed to delete subtask:', error);
        // Fallback to local-only
        task.subTasks = task.subTasks.filter(st => st.id !== subTaskId);
        saveTasksToLocalStorage(tasksState.tasks);
        throw error;
    }
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