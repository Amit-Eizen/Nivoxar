// ===== IMPORTS =====
import { initNavbar } from '../scripts/components/Navbar.js';
import { getCategories, createCategory, updateCategory, deleteCategory,
    renderCategories, renderColorOptions } from '../scripts/managers/CategoriesManager.js';
import { requireAuth } from '../middleware/AuthMiddleware.js';

// ===== STATE =====
const state = {
    editingCategory: null,
    selectedColor: '#10b981'
};

// ===== DOM ELEMENTS =====
let elements = {};

// ===== INITIALIZATION =====
function initializePage() {
    console.log('🚀 Initializing Categories Page...');

    // Check authentication
    if (!requireAuth()) return;

    // Only init navbar in MPA mode (SPA mode handles navbar globally)
    if (!window.__SPA_MODE__) {
        initNavbar();
    }

    // Get all DOM elements
    cacheElements();

    // Setup event listeners
    setupEventListeners();

    // Show loading, then load categories
    showLoading();

    setTimeout(() => {
        loadAndRenderCategories();
        hideLoading();
        console.log('✅ Categories Page initialized!');
    }, 300);
}

// ===== CACHE DOM ELEMENTS =====
function cacheElements() {
    elements = {
        // Loading & Main
        loadingState: document.getElementById('loadingState'),
        mainContent: document.getElementById('mainContent'),
        
        // Buttons
        createCategoryBtn: document.getElementById('createCategoryBtn'),
        emptyStateCreateBtn: document.getElementById('emptyStateCreateBtn'),
        
        // Error
        errorMessage: document.getElementById('errorMessage'),
        errorText: document.getElementById('errorText'),
        closeErrorBtn: document.getElementById('closeErrorBtn'),
        
        // Modal
        categoryModal: document.getElementById('categoryModal'),
        modalTitle: document.getElementById('modalTitle'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        cancelModalBtn: document.getElementById('cancelModalBtn'),
        categoryForm: document.getElementById('categoryForm'),
        submitCategoryBtn: document.getElementById('submitCategoryBtn'),
        submitBtnText: document.getElementById('submitBtnText'),
        
        // Form inputs
        categoryNameInput: document.getElementById('categoryNameInput'),
        colorPreview: document.getElementById('colorPreview'),
        colorValue: document.getElementById('colorValue'),
        colorOptions: document.getElementById('colorOptions'),
        
        // Categories
        categoriesGrid: document.getElementById('categoriesGrid'),
        emptyState: document.getElementById('emptyState')
    };
}

// ===== SETUP EVENT LISTENERS =====
function setupEventListeners() {
    // Create category buttons
    elements.createCategoryBtn?.addEventListener('click', openCreateModal);
    elements.emptyStateCreateBtn?.addEventListener('click', openCreateModal);
    
    // Modal close buttons
    elements.closeModalBtn?.addEventListener('click', closeModal);
    elements.cancelModalBtn?.addEventListener('click', closeModal);
    
    // Modal overlay click (close modal)
    elements.categoryModal?.addEventListener('click', (e) => {
        if (e.target === elements.categoryModal) {
            closeModal();
        }
    });
    
    // Form submit
    elements.categoryForm?.addEventListener('submit', handleFormSubmit);
    
    // Error close
    elements.closeErrorBtn?.addEventListener('click', hideError);
    
    // Categories grid - event delegation
    elements.categoriesGrid?.addEventListener('click', handleCategoryAction);
}

// ===== LOAD AND RENDER CATEGORIES =====
function loadAndRenderCategories() {
    renderCategories('categoriesGrid');
}

// ===== SHOW/HIDE LOADING =====
function showLoading() {
    if (elements.loadingState) elements.loadingState.style.display = 'flex';
    if (elements.mainContent) elements.mainContent.style.display = 'none';
}

function hideLoading() {
    if (elements.loadingState) elements.loadingState.style.display = 'none';
    if (elements.mainContent) elements.mainContent.style.display = 'block';
}

// ===== SHOW/HIDE ERROR =====
function showError(message) {
    if (elements.errorMessage && elements.errorText) {
        elements.errorText.textContent = message;
        elements.errorMessage.style.display = 'flex';
        
        // Auto hide after 5 seconds
        setTimeout(hideError, 5000);
    }
}

function hideError() {
    if (elements.errorMessage) {
        elements.errorMessage.style.display = 'none';
    }
}

// ===== OPEN CREATE MODAL =====
function openCreateModal() {
    state.editingCategory = null;
    state.selectedColor = '#10b981';
    
    // Reset form
    elements.categoryNameInput.value = '';
    
    // Update modal UI
    elements.modalTitle.textContent = 'Create New Category';
    elements.submitBtnText.textContent = 'Create Category';
    elements.submitCategoryBtn.querySelector('i').className = 'fas fa-plus';
    
    // Update color preview
    updateColorPreview(state.selectedColor);
    
    // Render color options
    renderColorOptions('colorOptions', state.selectedColor, handleColorSelect);
    
    // Show modal
    elements.categoryModal.style.display = 'flex';
}

// ===== OPEN EDIT MODAL =====
function openEditModal(categoryId) {
    const categories = getCategories();
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
        showError('Category not found');
        return;
    }
    
    state.editingCategory = category;
    state.selectedColor = category.color;
    
    // Fill form
    elements.categoryNameInput.value = category.name;
    
    // Update modal UI
    elements.modalTitle.textContent = 'Edit Category';
    elements.submitBtnText.textContent = 'Update Category';
    elements.submitCategoryBtn.querySelector('i').className = 'fas fa-save';
    
    // Update color preview
    updateColorPreview(state.selectedColor);
    
    // Render color options
    renderColorOptions('colorOptions', state.selectedColor, handleColorSelect);
    
    // Show modal
    elements.categoryModal.style.display = 'flex';
}

// ===== CLOSE MODAL =====
function closeModal() {
    elements.categoryModal.style.display = 'none';
    state.editingCategory = null;
    state.selectedColor = '#10b981';
    elements.categoryForm.reset();
    hideError();
}

// ===== HANDLE COLOR SELECT =====
function handleColorSelect(color) {
    state.selectedColor = color;
    updateColorPreview(color);
    
    // Re-render color options to update selected state
    renderColorOptions('colorOptions', color, handleColorSelect);
}

// ===== UPDATE COLOR PREVIEW =====
function updateColorPreview(color) {
    elements.colorPreview.style.backgroundColor = color;
    elements.colorValue.textContent = color;
}

// ===== HANDLE FORM SUBMIT =====
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const name = elements.categoryNameInput.value.trim();
    
    if (!name) {
        showError('Category name is required');
        return;
    }
    
    try {
        const categoryData = {
            name: name,
            color: state.selectedColor
        };
        
        if (state.editingCategory) {
            // Update existing category
            updateCategory(state.editingCategory.id, categoryData);
            console.log('✅ Category updated');
        } else {
            // Create new category
            createCategory(categoryData);
            console.log('✅ Category created');
        }
        
        // Reload and close modal
        loadAndRenderCategories();
        closeModal();
        
    } catch (error) {
        console.error('Error saving category:', error);
        showError('Failed to save category. Please try again.');
    }
}

// ===== HANDLE CATEGORY ACTIONS (Event Delegation) =====
function handleCategoryAction(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    
    const action = button.dataset.action;
    const categoryId = button.dataset.id;
    
    switch (action) {
        case 'edit':
            openEditModal(categoryId);
            break;
            
        case 'delete':
            handleDeleteCategory(categoryId);
            break;
            
        case 'view':
            handleViewTasks(categoryId);
            break;
    }
}

// ===== HANDLE DELETE CATEGORY =====
function handleDeleteCategory(categoryId) {
    const categories = getCategories();
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
        showError('Category not found');
        return;
    }
    
    const confirmed = confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`);
    
    if (!confirmed) return;
    
    try {
        deleteCategory(categoryId);
        loadAndRenderCategories();
        console.log('✅ Category deleted');
    } catch (error) {
        console.error('Error deleting category:', error);
        showError('Failed to delete category. Please try again.');
    }
}

// ===== HANDLE VIEW TASKS =====
function handleViewTasks(categoryId) {
    console.log('View tasks for category:', categoryId);
    // Navigate to dashboard with category filter
    if (window.__SPA_MODE__) {
        // In SPA mode, use router navigation
        import('../scripts/core/Router.js').then(({ router }) => {
            router.navigate(`/dashboard?categoryFilter=${categoryId}`);
        });
    } else {
        window.location.href = `/views/DashboardPage.html?categoryFilter=${categoryId}`;
    }
}

// For standalone HTML page (MPA mode)
if (!window.__SPA_MODE__) {
    document.addEventListener('DOMContentLoaded', initializePage);
}

// ===== SPA MODE =====

/**
 * Load Categories page for SPA
 */
export async function loadCategoriesPage() {
    console.log('📄 Loading Categories Page...');

    // Load CSS
    loadPageCSS();

    // Get app container
    const app = document.getElementById('app');
    if (!app) {
        console.error('App container not found');
        return;
    }

    // Inject HTML
    app.innerHTML = getPageHTML();

    // Initialize Categories
    initializePage();
}

/**
 * Load CSS for Categories page
 */
function loadPageCSS() {
    const cssFiles = [
        '/public/styles/CategoriesPage.css'
    ];

    // Remove existing page-specific stylesheets
    document.querySelectorAll('link[data-page-style]').forEach(link => link.remove());

    // Load new stylesheets
    cssFiles.forEach(href => {
        const existing = document.querySelector(`link[href="${href}"]`);
        if (existing) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute('data-page-style', 'true');
        document.head.appendChild(link);
    });
}

/**
 * Get Categories HTML
 */
function getPageHTML() {
    return `
        <!-- Loading State -->
        <div id="loadingState" class="categories-loading">
            <div class="loading-content">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Loading categories...</p>
            </div>
        </div>

        <!-- Main Content -->
        <div class="categories-page" id="mainContent" style="display: none;">
            <div class="categories-container">
                <!-- Header -->
                <header class="categories-header">
                    <div class="header-left">
                        <h1 class="categories-title">
                            <i class="fas fa-folder-open"></i>
                            Categories
                        </h1>
                        <p class="categories-subtitle">
                            Organize your tasks with colorful categories
                        </p>
                    </div>

                    <div class="header-actions">
                        <button class="action-btn create-category-btn" id="createCategoryBtn">
                            <i class="fas fa-plus"></i>
                            New Category
                        </button>
                    </div>
                </header>

                <!-- Error Message -->
                <div id="errorMessage" class="error-message" style="display: none;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span id="errorText"></span>
                    <button id="closeErrorBtn" class="error-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Categories Content -->
                <div class="categories-content">
                    <!-- Empty State -->
                    <div id="emptyState" class="empty-state" style="display: none;">
                        <i class="fas fa-folder-plus"></i>
                        <h3>No categories yet</h3>
                        <p>Create your first category to organize your tasks!</p>
                        <button class="btn-primary" id="emptyStateCreateBtn">
                            <i class="fas fa-plus"></i>
                            Create Category
                        </button>
                    </div>

                    <!-- Categories Grid -->
                    <div id="categoriesGrid" class="categories-grid"></div>
                </div>
            </div>
        </div>

        <!-- Create/Edit Category Modal -->
        <div id="categoryModal" class="modal-overlay" style="display: none;">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-folder"></i>
                        <span id="modalTitle">Create New Category</span>
                    </h3>
                    <button class="modal-close" id="closeModalBtn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <form id="categoryForm" class="category-form">
                    <div class="form-group">
                        <label>Category Name</label>
                        <input type="text" id="categoryNameInput" placeholder="Enter category name..." required/>
                    </div>

                    <div class="form-group">
                        <label>Color</label>
                        <div class="color-picker">
                            <div class="selected-color">
                                <div class="color-preview" id="colorPreview"></div>
                                <span id="colorValue">#10b981</span>
                            </div>
                            <div class="color-options" id="colorOptions"></div>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" id="cancelModalBtn">Cancel</button>
                        <button type="submit" class="btn-primary" id="submitCategoryBtn">
                            <i class="fas fa-plus"></i>
                            <span id="submitBtnText">Create Category</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;
}