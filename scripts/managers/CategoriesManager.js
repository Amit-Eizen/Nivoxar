// Manages all category operations: CRUD, localStorage, rendering

import {
    getAllCategoriesSync,
    createCategory as createCategoryService,
    updateCategory as updateCategoryService,
    deleteCategory as deleteCategoryService,
    CATEGORY_COLORS
} from '../../services/CategoryService.js';

// ===== AVAILABLE COLORS =====
export const AVAILABLE_COLORS = CATEGORY_COLORS;

// ===== GET CATEGORIES =====
export function getCategories() {
    return getAllCategoriesSync();
}

// ===== CREATE NEW CATEGORY =====
export async function createCategory(categoryData) {
    const newCategory = await createCategoryService(categoryData);
    console.log('✅ Category created:', newCategory);
    return newCategory;
}

// ===== UPDATE CATEGORY =====
export async function updateCategory(categoryId, updatedData) {
    const updated = await updateCategoryService(categoryId, updatedData);

    if (!updated) {
        console.error('Category not found:', categoryId);
        return null;
    }

    console.log('✅ Category updated:', updated);
    return updated;
}

// ===== DELETE CATEGORY =====
export async function deleteCategory(categoryId) {
    const success = await deleteCategoryService(categoryId);

    if (!success) {
        console.error('Category not found:', categoryId);
        return false;
    }

    console.log('✅ Category deleted:', categoryId);
    return true;
}

// ===== CENTRALIZED CATEGORY OPTIONS HTML GENERATOR =====
/**
 * Generate HTML options for category dropdown
 * @param {string|null} selectedValue - The category ID to pre-select
 * @param {boolean} includeEmpty - Whether to include "Select category..." option
 * @returns {string} HTML string of <option> elements
 */
export function getCategoryOptionsHTML(selectedValue = null, includeEmpty = true) {
    const categories = getAllCategoriesSync();
    
    let optionsHTML = '';
    
    // Add empty option if requested
    if (includeEmpty) {
        optionsHTML += '<option value="">Select category...</option>';
    }
    
    // Add category options
    categories.forEach(cat => {
        const isSelected = selectedValue && cat.id === selectedValue ? 'selected' : '';
        optionsHTML += `<option value="${cat.id}" ${isSelected}>${cat.name}</option>`;
    });
    
    return optionsHTML;
}

// ===== REFRESH CATEGORY DROPDOWN =====
/**
 * Refresh a category select element with current categories
 * @param {HTMLSelectElement} selectElement - The select element to refresh
 * @param {string|null} valueToSelect - Optional value to select after refresh
 */
export function refreshCategorySelect(selectElement, valueToSelect = null) {
    if (!selectElement) {
        console.error('❌ Select element not provided');
        return;
    }
    
    const currentValue = valueToSelect !== null ? valueToSelect : selectElement.value;
    selectElement.innerHTML = getCategoryOptionsHTML(currentValue, true);
    
    // Restore value if it exists
    if (currentValue && selectElement.querySelector(`option[value="${currentValue}"]`)) {
        selectElement.value = currentValue;
    }
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