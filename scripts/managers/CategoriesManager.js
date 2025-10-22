// Manages all category operations: CRUD, localStorage, rendering

// ===== AVAILABLE COLORS =====
export const AVAILABLE_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#eab308', '#dc2626', '#7c3aed', '#059669'
];

// ===== STORAGE KEYS =====
const STORAGE_KEY = 'nivoxar_categories';

// ===== GET CATEGORIES FROM LOCALSTORAGE =====
export function getCategories() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : getDefaultCategories();
    } catch (error) {
        console.error('Error loading categories:', error);
        return getDefaultCategories();
    }
}

// ===== DEFAULT CATEGORIES =====
function getDefaultCategories() {
    return [
        {
            id: 'work',
            name: 'Work',
            color: '#3b82f6',
            taskCount: 0,
            createdAt: new Date().toISOString()
        },
        {
            id: 'personal',
            name: 'Personal',
            color: '#8b5cf6',
            taskCount: 0,
            createdAt: new Date().toISOString()
        },
        {
            id: 'urgent',
            name: 'Urgent',
            color: '#ef4444',
            taskCount: 0,
            createdAt: new Date().toISOString()
        }
    ];
}

// ===== SAVE CATEGORIES TO LOCALSTORAGE =====
export function saveCategories(categories) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
        return true;
    } catch (error) {
        console.error('Error saving categories:', error);
        return false;
    }
}

// ===== CREATE NEW CATEGORY =====
export function createCategory(categoryData) {
    const categories = getCategories();
    
    // Generate unique ID
    const newId = `cat_${Date.now()}`;
    
    const newCategory = {
        id: newId,
        name: categoryData.name.trim(),
        color: categoryData.color,
        taskCount: 0,
        createdAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    saveCategories(categories);
    
    console.log('✅ Category created:', newCategory);
    return newCategory;
}

// ===== UPDATE CATEGORY =====
export function updateCategory(categoryId, updatedData) {
    const categories = getCategories();
    const index = categories.findIndex(cat => cat.id === categoryId);
    
    if (index === -1) {
        console.error('Category not found:', categoryId);
        return null;
    }
    
    categories[index] = {
        ...categories[index],
        name: updatedData.name.trim(),
        color: updatedData.color
    };
    
    saveCategories(categories);
    
    console.log('✅ Category updated:', categories[index]);
    return categories[index];
}

// ===== DELETE CATEGORY =====
export function deleteCategory(categoryId) {
    const categories = getCategories();
    const filtered = categories.filter(cat => cat.id !== categoryId);
    
    if (filtered.length === categories.length) {
        console.error('Category not found:', categoryId);
        return false;
    }
    
    saveCategories(filtered);
    
    console.log('✅ Category deleted:', categoryId);
    return true;
}

// ===== GET CATEGORY BY ID =====
export function getCategoryById(categoryId) {
    const categories = getCategories();
    return categories.find(cat => cat.id === categoryId) || null;
}

// ===== RENDER SINGLE CATEGORY CARD =====
export function renderCategoryCard(category) {
    // Format date properly
    const createdDate = category.createdAt ? new Date(category.createdAt) : new Date();
    const formattedDate = createdDate.toLocaleDateString('en-GB'); // DD/MM/YYYY format
    
    return `
        <div class="category-card" style="--category-color: ${category.color}" data-category-id="${category.id}">
            <div class="category-header">
                <div class="category-icon" style="background-color: ${category.color}">
                    <i class="fas fa-folder"></i>
                </div>
                <div class="category-actions">
                    <button class="action-btn edit-btn" data-action="edit" data-id="${category.id}" title="Edit category">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" data-action="delete" data-id="${category.id}" title="Delete category">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="category-content">
                <h3 class="category-name">${category.name || 'Untitled'}</h3>
                <div class="category-stats">
                    <span class="task-count">
                        <i class="fas fa-tasks"></i>
                        ${category.taskCount || 0} tasks
                    </span>
                    <span class="created-date">
                        <i class="fas fa-calendar"></i>
                        ${formattedDate}
                    </span>
                </div>
            </div>
            
            <div class="category-footer">
                <button class="view-tasks-btn" data-action="view" data-id="${category.id}">
                    <i class="fas fa-eye"></i>
                    View Tasks
                </button>
            </div>
        </div>
    `;
}

// ===== RENDER ALL CATEGORIES =====
export function renderCategories(containerId) {
    const categories = getCategories();
    const container = document.getElementById(containerId);
    const emptyState = document.getElementById('emptyState');
    
    if (!container) {
        console.error('Container not found:', containerId);
        return;
    }
    
    // Show empty state or categories grid
    if (categories.length === 0) {
        container.style.display = 'none';
        if (emptyState) emptyState.style.display = 'flex';
    } else {
        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';
        
        // Render all category cards
        container.innerHTML = categories.map(cat => renderCategoryCard(cat)).join('');
    }
    
    console.log(`📊 Rendered ${categories.length} categories`);
}

// ===== RENDER COLOR OPTIONS =====
export function renderColorOptions(containerId, selectedColor, onColorSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = AVAILABLE_COLORS.map(color => `
        <button
            type="button"
            class="color-option ${selectedColor === color ? 'selected' : ''}"
            style="background-color: ${color}"
            data-color="${color}"
            title="${color}"
        >
            ${selectedColor === color ? '<i class="fas fa-check"></i>' : ''}
        </button>
    `).join('');
    
    // Add click listeners
    container.querySelectorAll('.color-option').forEach(btn => {
        btn.addEventListener('click', () => {
            const color = btn.dataset.color;
            if (onColorSelect) onColorSelect(color);
        });
    });
}