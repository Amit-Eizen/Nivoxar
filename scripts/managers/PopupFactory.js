import { dashboardState } from '../DashboardPage.js';
import { renderTempSubTasks } from './SubTasksManager.js';
import { getCategoryOptionsHTML } from '../../services/CategoryService.js';


// Create Task Popup - WITH GRID LAYOUT
export function createTaskPopup() {
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.id = 'taskPopup';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'popup-wrapper';
    wrapper.id = 'popupWrapper';
    
    wrapper.innerHTML = `
        <!-- Main Form (Left) -->
        <div class="popup-content popup-main">
            <div class="popup-header">
                <h2 id="popupTitle">
                    <i class="fas fa-plus"></i>
                    Create New Task
                </h2>
                <button class="popup-close" id="closeTaskPopup">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="popup-body">
                <form id="taskForm" class="task-form">
                    <div class="form-group">
                        <label for="taskTitle">Title *</label>
                        <input type="text" id="taskTitle" class="form-input" placeholder="Task title" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="taskDescription">Description</label>
                        <textarea id="taskDescription" class="form-textarea" rows="3" placeholder="Task description (optional)"></textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="taskCategory">Category</label>
                            <select id="taskCategory" class="form-select"> </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="taskPriority">Priority *</label>
                            <select id="taskPriority" class="form-select" required>
                                <option value="1">Low</option>
                                <option value="2" selected>Medium</option>
                                <option value="3">High</option>
                                <option value="4">Urgent</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="taskDueDate">Due Date</label>
                            <input type="date" id="taskDueDate" class="form-input">
                        </div>
                        
                        <div class="form-group">
                            <label for="taskDueTime">Due Time</label>
                            <input type="time" id="taskDueTime" class="form-input">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="taskHasSubTasks">
                            <span class="checkbox-custom"></span>
                            <span>Add SubTasks</span>
                        </label>
                    </div>
                    
                    <div class="form-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="taskRecurring">
                            <span class="checkbox-custom"></span>
                            <span>Recurring Task</span>
                        </label>
                    </div>
                    
                    <div class="recurring-options" id="recurringOptions" style="display: none;">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="recurringFrequency">Frequency</label>
                                <select id="recurringFrequency" class="form-select">
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label for="recurringEndDate">End Date <span class="optional">(optional)</span></label>
                                <input type="date" id="recurringEndDate" class="form-input">
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" id="cancelTaskBtn">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button type="submit" class="btn-primary" id="submitTaskBtn">
                            <i class="fas fa-save"></i>
                            Create Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <!-- SubTasks Panel (Right) - Hidden by default -->
        <div class="popup-content popup-side" id="subTasksSidePanel" style="display: none;">
            <div class="side-panel-header">
                <h3>
                    <i class="fas fa-list-check"></i>
                    SubTasks Manager
                </h3>
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
    `;
    
    popup.appendChild(wrapper);
    return popup;
}

// Create SubTasks Popup (for existing tasks)
export function createSubTasksPopup() {
    const popup = document.createElement('div');
    popup.className = 'modal-overlay';
    popup.id = 'subTasksPopup';
    
    const content = document.createElement('div');
    content.className = 'popup-content';
    
    content.innerHTML = `
        <div class="popup-header">
            <h2>
                <i class="fas fa-list-check"></i>
                Manage SubTasks
            </h2>
            <button class="popup-close" id="closeSubTasksPopup">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="popup-body">
            <div class="subtasks-header">
                <h3 id="parentTaskTitle">Task Title</h3>
                <p class="subtasks-info">
                    <span id="subtasksCount">0</span> subtasks
                    (<span id="subtasksCompleted">0</span> completed)
                </p>
            </div>
            
            <div class="subtask-input-group">
                <input type="text" id="newSubTaskInput" class="subtask-input" placeholder="Add new subtask...">
                <button type="button" class="subtask-add-btn" id="addSubTaskBtn">
                    <i class="fas fa-plus"></i>
                    Add
                </button>
            </div>
            
            <div class="subtasks-list" id="subTasksList">
                <!-- Subtasks will be rendered here -->
            </div>
        </div>
        
        <div class="popup-footer">
            <button type="button" class="btn-secondary" id="closeSubTasksBtn">
                <i class="fas fa-times"></i>
                Close
            </button>
        </div>
    `;
    
    popup.appendChild(content);
    return popup;
}

// Initialize all popups
export function initializePopups() {
    console.log('🎨 Initializing popups...');
    
    const taskPopup = createTaskPopup();
    const subTasksPopup = createSubTasksPopup();
    
    document.body.appendChild(taskPopup);
    document.body.appendChild(subTasksPopup);
    
    console.log('✅ Popups initialized');
}

// Helper function to refresh category options in dropdown
function refreshCategoryDropdown(valueToSet = null) {
    const categorySelect = document.getElementById('taskCategory');
    if (!categorySelect) {
        console.error('❌ Category select element not found!');
        return;
    }
    
    console.log('🔄 Refreshing category dropdown...');
    console.log('  Current value:', categorySelect.value);
    console.log('  Value to set:', valueToSet);
    
    const currentValue = valueToSet !== null ? valueToSet : categorySelect.value;
    categorySelect.innerHTML = getCategoryOptionsHTML(null, false); // No empty option for task creation
    
    console.log('  New options count:', categorySelect.options.length);
    
    // Restore/set the value if it exists
    if (currentValue && categorySelect.querySelector(`option[value="${currentValue}"]`)) {
        categorySelect.value = currentValue;
        console.log('  ✅ Set value to:', currentValue);
    } else {
        console.log('  ℹ️ Value not found or empty');
    }
    
    console.log('✅ Category dropdown refreshed successfully');
}

// Open Task Popup
export function openTaskPopup(mode = 'create', task = null) {
    const popup = document.getElementById('taskPopup');
    const title = document.getElementById('popupTitle');
    const submitBtn = document.getElementById('submitTaskBtn');
    const form = document.getElementById('taskForm');
    
    if (!popup || !title || !submitBtn || !form) {
        console.error('❌ Popup elements not found!');
        return;
    }
    
    if (mode === 'create') {
        form.reset();
        title.innerHTML = '<i class="fas fa-plus"></i> Create New Task';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Create Task';
        delete popup.dataset.editMode;
        delete popup.dataset.taskId;
        
        document.getElementById('taskHasSubTasks').checked = false;
        dashboardState.tempSubTasks = [];
        closeSubTasksSidePanel();
        
        // Refresh categories dropdown for create mode
        refreshCategoryDropdown();
        
    } else if (mode === 'edit' && task) {
        title.innerHTML = '<i class="fas fa-edit"></i> Edit Task';
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Task';
        popup.dataset.editMode = 'true';
        popup.dataset.taskId = task.id;
        
        // Refresh dropdown and set the task's category
        refreshCategoryDropdown(task.category);
        
        // Then set other form values
        document.getElementById('taskTitle').value = task.title;
        document.getElementById('taskDescription').value = task.description || '';
        // Category already set by refreshCategoryDropdown
        document.getElementById('taskPriority').value = task.priority;
        document.getElementById('taskDueDate').value = task.dueDate || '';
        document.getElementById('taskDueTime').value = task.dueTime || '';
        
        if (task.subTasks?.length > 0) {
            document.getElementById('taskHasSubTasks').checked = true;
            dashboardState.tempSubTasks = [...task.subTasks];
            openSubTasksSidePanel();
            const container = document.getElementById('tempSubTasksList');
            if (container) renderTempSubTasks(dashboardState, container);
        } else {
            document.getElementById('taskHasSubTasks').checked = false;
            dashboardState.tempSubTasks = [];
            closeSubTasksSidePanel();
        }
        
        if (task.recurring?.enabled) {
            document.getElementById('taskRecurring').checked = true;
            document.getElementById('recurringOptions').style.display = 'block';
            document.getElementById('recurringFrequency').value = task.recurring.frequency;
            document.getElementById('recurringEndDate').value = task.recurring.endDate || '';
        } else {
            document.getElementById('taskRecurring').checked = false;
            document.getElementById('recurringOptions').style.display = 'none';
        }
    }
    
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeTaskPopup() {
    const popup = document.getElementById('taskPopup');
    if (!popup) return;
    
    popup.classList.remove('active');
    document.body.style.overflow = '';
    closeSubTasksSidePanel();
    dashboardState.tempSubTasks = [];
}

export function openSubTasksPopup(task) {
    const popup = document.getElementById('subTasksPopup');
    if (!popup) return;
    
    popup.dataset.taskId = task.id;
    
    const titleEl = document.getElementById('parentTaskTitle');
    const countEl = document.getElementById('subtasksCount');
    const completedEl = document.getElementById('subtasksCompleted');
    
    if (titleEl) titleEl.textContent = task.title;
    
    if (task.subTasks && task.subTasks.length > 0) {
        const completed = task.subTasks.filter(st => st.completed).length;
        if (countEl) countEl.textContent = task.subTasks.length;
        if (completedEl) completedEl.textContent = completed;
    } else {
        if (countEl) countEl.textContent = '0';
        if (completedEl) completedEl.textContent = '0';
    }
    
    popup.classList.add('active');
    document.body.style.overflow = 'hidden';
}

export function closeSubTasksPopup() {
    const popup = document.getElementById('subTasksPopup');
    if (!popup) return;
    
    popup.classList.remove('active');
    document.body.style.overflow = '';
}

export function openSubTasksSidePanel() {
    const panel = document.getElementById('subTasksSidePanel');
    const wrapper = document.getElementById('popupWrapper');
    if (!panel) return;
    
    panel.style.display = 'flex';
    if (wrapper) wrapper.classList.add('with-sidebar');
}

export function closeSubTasksSidePanel() {
    const panel = document.getElementById('subTasksSidePanel');
    const wrapper = document.getElementById('popupWrapper');
    if (!panel) return;
    
    panel.style.display = 'none';
    if (wrapper) wrapper.classList.remove('with-sidebar');
}