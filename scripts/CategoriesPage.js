// ===== IMPORTS =====
import { initNavbar } from './components/Navbar.js';
import { getCategories, createCategory, updateCategory, deleteCategory,
    renderCategories, renderColorOptions } from './managers/CategoriesManager.js';

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
    
    // Initialize Navbar (no parameter needed - it auto-detects page)
    initNavbar();
    
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
    window.location.href = `/views/DashboardPage.html?categoryFilter=${categoryId}`;
}

// ===== START APPLICATION =====
document.addEventListener('DOMContentLoaded', initializePage);