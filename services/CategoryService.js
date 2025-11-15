// ===== CATEGORY SERVICE =====
// Central service for category management
// Supports both localStorage (current) and API (future)

import { STORAGE_KEYS } from '../utils/StorageKeys.js';
import { apiRequest } from './AuthService.js';

// ===== CONFIGURATION =====
const CONFIG = {
    useAPI: true, // API is now ready!
    apiBaseURL: '/categories',
    storageKey: STORAGE_KEYS.CATEGORIES
};

// ===== CACHE =====
let categoriesCache = null;
let cacheLoadPromise = null; // To prevent multiple concurrent loads

// ===== DEFAULT CATEGORIES =====
const DEFAULT_CATEGORIES = [
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

// ===== AVAILABLE COLORS =====
export const CATEGORY_COLORS = [
    '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1',
    '#14b8a6', '#eab308', '#dc2626', '#7c3aed', '#059669'
];

// ===== LOCALSTORAGE METHODS (Current) // 

function getCategoriesFromLocalStorage() {
    try {
        const stored = localStorage.getItem(CONFIG.storageKey);
        
        if (stored) {
            const categories = JSON.parse(stored);
            
            // Validate categories - if any is invalid, reset
            const hasInvalidCategories = categories.some(cat => 
                !cat.name || cat.name === 'Untitled' || !cat.color || !cat.id
            );
            
            if (hasInvalidCategories) {
                console.warn('⚠️ Found invalid categories, resetting to defaults...');
                saveCategoriesLocally(DEFAULT_CATEGORIES);
                return DEFAULT_CATEGORIES;
            }
            
            return categories;
        }
        
        // No categories found, return defaults
        saveCategoriesLocally(DEFAULT_CATEGORIES);
        return DEFAULT_CATEGORIES;
        
    } catch (error) {
        console.error('Error loading categories from localStorage:', error);
        return DEFAULT_CATEGORIES;
    }
}

function saveCategoriesLocally(categories) {
    try {
        localStorage.setItem(CONFIG.storageKey, JSON.stringify(categories));
        return true;
    } catch (error) {
        console.error('Error saving categories to localStorage:', error);
        return false;
    }
}

function createCategoryLocally(categoryData) {
    const categories = getCategoriesFromLocalStorage();
    
    const newCategory = {
        id: `cat_${Date.now()}`,
        name: categoryData.name.trim(),
        color: categoryData.color,
        taskCount: 0,
        createdAt: new Date().toISOString()
    };
    
    categories.push(newCategory);
    saveCategoriesLocally(categories);
    
    return newCategory;
}

function updateCategoryLocally(categoryId, updatedData) {
    const categories = getCategoriesFromLocalStorage();
    const index = categories.findIndex(cat => cat.id === categoryId);
    
    if (index === -1) return null;
    
    categories[index] = {
        ...categories[index],
        name: updatedData.name.trim(),
        color: updatedData.color
    };
    
    saveCategoriesLocally(categories);
    return categories[index];
}

function deleteCategoryLocally(categoryId) {
    const categories = getCategoriesFromLocalStorage();
    const filtered = categories.filter(cat => cat.id !== categoryId);
    
    if (filtered.length === categories.length) return false;
    
    saveCategoriesLocally(filtered);
    return true;
}

function getCategoryByIdLocally(categoryId) {
    const categories = getCategoriesFromLocalStorage();
    return categories.find(cat => cat.id === categoryId) || null;
}

// ===== API METHODS //

async function getCategoriesFromAPI() {
    try {
        const data = await apiRequest(CONFIG.apiBaseURL, {
            method: 'GET'
        });
        return data;
    } catch (error) {
        console.error('Error fetching categories from API:', error);
        throw error;
    }
}

async function createCategoryViaAPI(categoryData) {
    try {
        const data = await apiRequest(CONFIG.apiBaseURL, {
            method: 'POST',
            body: JSON.stringify({
                name: categoryData.name,
                color: categoryData.color
            })
        });
        return data;
    } catch (error) {
        console.error('Error creating category via API:', error);
        throw error;
    }
}

async function updateCategoryViaAPI(categoryId, updatedData) {
    try {
        const data = await apiRequest(`${CONFIG.apiBaseURL}/${categoryId}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: updatedData.name,
                color: updatedData.color
            })
        });
        return data;
    } catch (error) {
        console.error('Error updating category via API:', error);
        throw error;
    }
}

async function deleteCategoryViaAPI(categoryId) {
    try {
        await apiRequest(`${CONFIG.apiBaseURL}/${categoryId}`, {
            method: 'DELETE'
        });
        return true;
    } catch (error) {
        console.error('Error deleting category via API:', error);
        throw error;
    }
}

async function getCategoryByIdViaAPI(categoryId) {
    try {
        const data = await apiRequest(`${CONFIG.apiBaseURL}/${categoryId}`, {
            method: 'GET'
        });
        return data;
    } catch (error) {
        console.error('Error fetching category via API:', error);
        throw error;
    }
}

// ===== PUBLIC API (Auto-switches between localStorage/API) //

/**
 * Get all categories
 * @returns {Promise<Array>} Array of category objects
 */
export async function getAllCategories() {
    // Return cached data if available
    if (categoriesCache !== null) {
        return categoriesCache;
    }

    // If already loading, wait for that promise
    if (cacheLoadPromise !== null) {
        return await cacheLoadPromise;
    }

    // Start loading
    cacheLoadPromise = (async () => {
        try {
            let categories;
            if (CONFIG.useAPI) {
                categories = await getCategoriesFromAPI();
            } else {
                categories = getCategoriesFromLocalStorage();
            }
            categoriesCache = categories;
            return categories;
        } finally {
            cacheLoadPromise = null;
        }
    })();

    return await cacheLoadPromise;
}

/**
 * Clear categories cache (call after create/update/delete)
 */
export function clearCategoriesCache() {
    categoriesCache = null;
    cacheLoadPromise = null;
}

/**
 * Get all categories (synchronous - uses cache)
 * @returns {Array} Array of category objects
 */
export function getAllCategoriesSync() {
    // If cache is available, use it
    if (categoriesCache !== null) {
        return categoriesCache;
    }

    // Otherwise, return empty array and warn
    console.warn('⚠️ getAllCategoriesSync() called but cache not loaded - call await getAllCategories() first');
    return [];
}

/**
 * Create a new category
 * @param {Object} categoryData - { name, color }
 * @returns {Promise<Object>} Created category object
 */
export async function createCategory(categoryData) {
    let result;
    if (CONFIG.useAPI) {
        result = await createCategoryViaAPI(categoryData);
    } else {
        result = createCategoryLocally(categoryData);
    }
    clearCategoriesCache(); // Clear cache after mutation
    return result;
}

/**
 * Update an existing category
 * @param {string} categoryId - Category ID
 * @param {Object} updatedData - { name, color }
 * @returns {Promise<Object>} Updated category object
 */
export async function updateCategory(categoryId, updatedData) {
    let result;
    if (CONFIG.useAPI) {
        result = await updateCategoryViaAPI(categoryId, updatedData);
    } else {
        result = updateCategoryLocally(categoryId, updatedData);
    }
    clearCategoriesCache(); // Clear cache after mutation
    return result;
}

/**
 * Delete a category
 * @param {string} categoryId - Category ID
 * @returns {Promise<boolean>} Success status
 */
export async function deleteCategory(categoryId) {
    let result;
    if (CONFIG.useAPI) {
        result = await deleteCategoryViaAPI(categoryId);
    } else {
        result = deleteCategoryLocally(categoryId);
    }
    clearCategoriesCache(); // Clear cache after mutation
    return result;
}

/**
 * Get a single category by ID
 * @param {string} categoryId - Category ID
 * @returns {Promise<Object>} Category object
 */
export async function getCategoryById(categoryId) {
    if (CONFIG.useAPI) {
        return await getCategoryByIdViaAPI(categoryId);
    } else {
        return getCategoryByIdLocally(categoryId);
    }
}

/**
 * Enable API mode (call this when backend is ready)
 * @param {string} apiBaseURL - Base URL for API (optional)
 */
export function enableAPIMode(apiBaseURL) {
    CONFIG.useAPI = true;
    if (apiBaseURL) {
        CONFIG.apiBaseURL = apiBaseURL;
    }
    console.log('✅ CategoryService: API mode enabled');
    console.log('📡 API Base URL:', CONFIG.apiBaseURL);
}

/**
 * Disable API mode (fallback to localStorage)
 */
export function disableAPIMode() {
    CONFIG.useAPI = false;
    console.log('✅ CategoryService: localStorage mode enabled');
}

/**
 * Check if API mode is enabled
 * @returns {boolean}
 */
export function isAPIMode() {
    return CONFIG.useAPI;
}

// ===== HELPER FUNCTIONS //

/**
 * Get default categories
 * @returns {Array}
 */
export function getDefaultCategories() {
    return [...DEFAULT_CATEGORIES];
}

/**
 * Reset categories to defaults
 * @returns {Promise<Array>}
 */
export async function resetCategories() {
    if (CONFIG.useAPI) {
        console.warn('⚠️ resetCategories() not implemented for API mode yet');
        return [];
    } else {
        saveCategoriesLocally(DEFAULT_CATEGORIES);
        console.log('✅ Categories reset to defaults');
        return DEFAULT_CATEGORIES;
    }
}

/**
 * Increment task count for a category
 * @param {string} categoryId
 * @returns {Promise<boolean>}
 */
export async function incrementTaskCount(categoryId) {
    if (!categoryId) return false;

    const categories = await getAllCategories();
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
        console.warn(`⚠️ Category not found: ${categoryId}`);
        return false;
    }
    
    category.taskCount = (category.taskCount || 0) + 1;
    saveCategoriesLocally(categories);
    
    console.log(`✅ Incremented task count for ${category.name}: ${category.taskCount}`);
    return true;
}

/**
 * Decrement task count for a category
 * @param {string} categoryId
 * @returns {Promise<boolean>}
 */
export async function decrementTaskCount(categoryId) {
    if (!categoryId) return false;

    const categories = await getAllCategories();
    const category = categories.find(cat => cat.id === categoryId);
    
    if (!category) {
        console.warn(`⚠️ Category not found: ${categoryId}`);
        return false;
    }
    
    category.taskCount = Math.max(0, (category.taskCount || 0) - 1);
    saveCategoriesLocally(categories);
    
    console.log(`✅ Decremented task count for ${category.name}: ${category.taskCount}`);
    return true;
}

/**
 * Recalculate task counts for all categories based on actual tasks
 * @param {Array} tasks - All tasks from the system
 * @returns {Promise<boolean>}
 */
export async function recalculateTaskCounts(tasks) {
    const categories = await getAllCategories();

    // Reset all counts to 0
    categories.forEach(cat => cat.taskCount = 0);
    
    // Count tasks for each category
    tasks.forEach(task => {
        if (task.category) {
            const category = categories.find(cat => cat.id === task.category);
            if (category) {
                category.taskCount++;
            }
        }
    });
    
    saveCategoriesLocally(categories);
    console.log('✅ Task counts recalculated');
    return true;
}

// Log current mode on load
console.log(`📦 CategoryService loaded in ${CONFIG.useAPI ? 'API' : 'localStorage'} mode`);
// ===== CATEGORY OPTIONS HTML GENERATION =====

/**
 * Generate HTML <option> elements for category select dropdown
 * @param {string} selectedId - ID of selected category (optional)
 * @param {boolean} includeEmpty - Include "Select Category" option (default: true)
 * @param {Array} categoriesArray - Optional categories array to use (if not provided, uses sync call)
 * @returns {string} HTML string of options
 */
export function getCategoryOptionsHTML(selectedId = null, includeEmpty = true, categoriesArray = null) {
    // Use provided categories array, or fall back to sync call (with warning)
    const categories = categoriesArray || getAllCategoriesSync();

    console.log('📋 Generating category options HTML...');
    console.log('  Total categories:', categories.length);
    console.log('  Selected ID:', selectedId);
    console.log('  Include empty:', includeEmpty);

    let html = '';

    // Add empty option if requested
    if (includeEmpty) {
        const emptySelected = !selectedId ? 'selected' : '';
        html += `<option value="" ${emptySelected}>Select category...</option>`;
    }

    // Add category options
    categories.forEach(cat => {
        const selected = cat.id === selectedId ? 'selected' : '';
        html += `<option value="${cat.id}" ${selected}>${cat.name}</option>`;
        console.log(`  ✅ Added: ${cat.name} (${cat.id}) ${selected ? '← SELECTED' : ''}`);
    });

    console.log('  ✅ Generated', categories.length, 'category options');
    return html;
}

/**
 * Populate a select element with category options (async version for API mode)
 * @param {HTMLSelectElement} selectElement - Select element to populate
 * @param {string} selectedId - ID of selected category (optional)
 * @param {boolean} includeEmpty - Include empty option (default: true)
 */
export async function populateCategorySelectAsync(selectElement, selectedId = null, includeEmpty = true) {
    if (!selectElement) {
        console.error('Cannot populate category select: element not found');
        return;
    }

    const categories = await getAllCategories();
    selectElement.innerHTML = getCategoryOptionsHTML(selectedId, includeEmpty, categories);
    console.log('✅ Populated category select with', selectElement.options.length, 'options');
}

/**
 * Populate a select element with category options (helper function - sync version)
 * @param {HTMLSelectElement} selectElement - Select element to populate
 * @param {string} selectedId - ID of selected category (optional)
 * @param {boolean} includeEmpty - Include empty option (default: true)
 * @deprecated Use populateCategorySelectAsync() in API mode
 */
export function populateCategorySelect(selectElement, selectedId = null, includeEmpty = true) {
    if (!selectElement) {
        console.error('Cannot populate category select: element not found');
        return;
    }

    selectElement.innerHTML = getCategoryOptionsHTML(selectedId, includeEmpty);
    console.log('✅ Populated category select with', selectElement.options.length, 'options');
}