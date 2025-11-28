// AnalyticsService.js - Analytics and Statistics API Service
// Handles all analytics-related API calls
import Logger from '../utils/Logger.js';

import { apiRequest } from './AuthService.js';

// ===== GET OVERVIEW ANALYTICS =====

/**
 * Get overview analytics (total tasks, completion rate, etc.)
 * @returns {Promise<Object>} Analytics overview object
 */
export async function getOverviewAnalytics() {
    try {
        const data = await apiRequest('/analytics/overview', {
            method: 'GET'
        });
        Logger.success(' Analytics overview loaded');
        return data;
    } catch (error) {
        Logger.error(' Failed to load analytics overview:', error);
        throw error;
    }
}

// ===== GET PRODUCTIVITY STATS =====

/**
 * Get productivity statistics
 * @param {number} days - Number of days to analyze (default: 30)
 * @returns {Promise<Object>} Productivity stats
 */
export async function getProductivityStats(days = 30) {
    try {
        const data = await apiRequest(`/analytics/productivity?days=${days}`, {
            method: 'GET'
        });
        Logger.success(' Productivity stats loaded');
        return data;
    } catch (error) {
        Logger.error(' Failed to load productivity stats:', error);
        throw error;
    }
}

// ===== GET CATEGORY STATISTICS =====

/**
 * Get statistics by category
 * @returns {Promise<Array>} Array of category stats
 */
export async function getCategoryStats() {
    try {
        const data = await apiRequest('/analytics/categories', {
            method: 'GET'
        });
        Logger.success(' Category stats loaded');
        return data;
    } catch (error) {
        Logger.error(' Failed to load category stats:', error);
        throw error;
    }
}

// ===== GET TRENDS =====

/**
 * Get task creation and completion trends
 * @param {number} months - Number of months to analyze (default: 6)
 * @returns {Promise<Array>} Monthly trends data
 */
export async function getTrends(months = 6) {
    try {
        const data = await apiRequest(`/analytics/trends?months=${months}`, {
            method: 'GET'
        });
        Logger.success(' Trends data loaded');
        return data;
    } catch (error) {
        Logger.error(' Failed to load trends:', error);
        throw error;
    }
}

// ===== GET RECURRING TASKS STATS =====

/**
 * Get recurring tasks statistics
 * @returns {Promise<Object>} Recurring tasks stats
 */
export async function getRecurringStats() {
    try {
        const data = await apiRequest('/analytics/recurring', {
            method: 'GET'
        });
        Logger.success(' Recurring tasks stats loaded');
        return data;
    } catch (error) {
        Logger.error(' Failed to load recurring stats:', error);
        throw error;
    }
}

// ===== GET SHARED TASKS STATS =====

/**
 * Get shared tasks statistics
 * @returns {Promise<Object>} Shared tasks stats
 */
export async function getSharedTasksStats() {
    try {
        const data = await apiRequest('/analytics/shared', {
            method: 'GET'
        });
        Logger.success(' Shared tasks stats loaded');
        return data;
    } catch (error) {
        Logger.error(' Failed to load shared tasks stats:', error);
        throw error;
    }
}

// ===== HELPER FUNCTIONS FOR LOCAL CALCULATIONS =====

/**
 * Calculate completion percentage
 * @param {number} completed - Number of completed items
 * @param {number} total - Total number of items
 * @returns {number} Percentage (0-100)
 */
export function calculateCompletionPercentage(completed, total) {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
}

/**
 * Get priority label
 * @param {number} priority - Priority value (1-3)
 * @returns {string} Priority label
 */
export function getPriorityLabel(priority) {
    const labels = {
        1: 'High',
        2: 'Medium',
        3: 'Low'
    };
    return labels[priority] || 'Unknown';
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Calculate streak from daily stats
 * @param {Array} dailyStats - Array of {date, count} objects
 * @returns {number} Current streak in days
 */
export function calculateStreak(dailyStats) {
    if (!dailyStats || dailyStats.length === 0) return 0;

    const today = new Date().toISOString().split('T')[0];
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const hasTasks = dailyStats.some(stat => stat.date === dateStr && stat.count > 0);

        if (hasTasks) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}
