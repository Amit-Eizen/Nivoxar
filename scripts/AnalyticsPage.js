import { getCurrentUser, logout } from '../services/AuthService.js';
import { getAllCategoriesSync } from '../services/CategoryService.js';
import { calculateAnalytics, isTaskOverdue } from '../utils/TaskUtils.js';
import { initNavbar } from '../scripts/components/Navbar.js';

// State Management
const state = {
    tasks: [],
    categories: [],
    timeFilter: 'all',
    activeTab: 'overview',
    charts: {} // Store chart instances
};

// Initialize Analytics Page
async function init() {
    try {
        // Check authentication
        const user = getCurrentUser();
        if (!user) {
            window.location.href = './LoginPage.html';
            return;
        }
        
        // Initialize Navbar
        initNavbar();
        
        // Show loading
        showLoading();
        
        // Load data
        await loadAnalyticsData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Render initial view
        renderAnalytics();
        
        // Hide loading, show content
        hideLoading();
        
    } catch (error) {
        console.error('Failed to initialize analytics:', error);
        showError('Failed to load analytics. Please refresh the page.');
        hideLoading();
    }
}

// Data Loading
async function loadAnalyticsData() {
    try {
        // Get tasks from localStorage
        const tasksJson = localStorage.getItem('nivoxar_tasks');
        state.tasks = tasksJson ? JSON.parse(tasksJson) : [];
        
        // Get categories from CategoryService
        state.categories = getAllCategoriesSync();
        
    } catch (error) {
        console.error('Error loading data:', error);
        throw error;
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Time filter
    const timeFilter = document.getElementById('time-filter');
    if (timeFilter) {
        timeFilter.addEventListener('change', (e) => {
            state.timeFilter = e.target.value;
            renderAnalytics();
        });
    }
    
    // Tab navigation
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            switchTab(tab);
        });
    });
}

// Tab Management
function switchTab(tabName) {
    // Update state
    state.activeTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        const contentId = `tab-${tabName}`;
        content.style.display = content.id === contentId ? 'block' : 'none';
    });
    
    // Render specific tab content
    renderTabContent(tabName);
}

// Render Main Analytics
function renderAnalytics() {
    const filteredTasks = getFilteredTasks();
    const analytics = calculateAnalyticsExtended(filteredTasks);
    
    // Update metrics
    updateMetrics(analytics);
    
    // Render current tab
    renderTabContent(state.activeTab);
}

// Render Tab-Specific Content
function renderTabContent(tabName) {
    const filteredTasks = getFilteredTasks();
    const analytics = calculateAnalyticsExtended(filteredTasks);
    
    switch(tabName) {
        case 'overview':
            renderOverviewCharts(filteredTasks);
            break;
        case 'trends':
            renderTrendsCharts(analytics);
            break;
        case 'productivity':
            renderProductivityMetrics(analytics);
            break;
        case 'insights':
            renderInsights(analytics);
            break;
    }
}

// Filter Tasks by Time (Analytics-specific)
function getFilteredTasks() {
    if (state.timeFilter === 'all') {
        return state.tasks;
    }
    
    const now = new Date();
    const filterDate = new Date();
    
    switch(state.timeFilter) {
        case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
        case 'quarter':
            filterDate.setMonth(now.getMonth() - 3);
            break;
        case 'year':
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
        default:
            return state.tasks;
    }
    
    return state.tasks.filter(task => {
        const taskDate = new Date(task.createdAt || task.dueDate);
        return taskDate >= filterDate;
    });
}

// Calculate Extended Analytics (adds to TaskUtils)
function calculateAnalyticsExtended(tasks) {
    // Use TaskUtils calculateAnalytics as base
    const baseAnalytics = calculateAnalytics(tasks);
    
    // Add Analytics-specific calculations
    const overdueTasks = tasks.filter(task => isTaskOverdue(task)).length;
    
    // Tasks due today
    const today = new Date().toDateString();
    const tasksToday = tasks.filter(task => {
        if (!task.dueDate) return false;
        return new Date(task.dueDate).toDateString() === today;
    }).length;
    
    // Average completion time (estimated)
    const avgCompletionTime = baseAnalytics.completed > 0 
        ? Math.round(7 - (baseAnalytics.completionRate / 20)) 
        : 0;
    
    // Productivity score
    const productivityScore = Math.min(
        Math.round(
            (baseAnalytics.completionRate * 0.4) + 
            (Math.max(0, 100 - (overdueTasks / baseAnalytics.total * 100)) * 0.3) +
            (Math.min(tasksToday, 5) * 6 * 0.3)
        ), 
        100
    );
    
    // Weekly trend
    const weeklyTrend = calculateWeeklyTrend(tasks);
    
    return {
        ...baseAnalytics,
        totalTasks: baseAnalytics.total,
        completedTasks: baseAnalytics.completed,
        pendingTasks: baseAnalytics.pending,
        overdueTasks,
        tasksToday,
        avgCompletionTime,
        productivityScore,
        weeklyTrend
    };
}

// Calculate Weekly Trend
function calculateWeeklyTrend(tasks) {
    const weeklyTrend = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const dayTasks = tasks.filter(task => {
            const taskDate = new Date(task.createdAt || task.dueDate);
            return taskDate.toDateString() === date.toDateString();
        });
        
        const completed = dayTasks.filter(t => t.completed).length;
        const created = dayTasks.length;
        const productivity = created > 0 ? Math.round((completed / created) * 100) : 0;
        
        weeklyTrend.push({
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            completed,
            created,
            productivity
        });
    }
    
    return weeklyTrend;
}

// Update Metrics Display
function updateMetrics(analytics) {
    // Total tasks
    updateElement('total-tasks', analytics.totalTasks);
    
    // Completed tasks
    updateElement('completed-tasks', analytics.completedTasks);
    updateElement('completion-rate', `${analytics.completionRate}% completion rate`);
    updateProgressBar('completed-progress', analytics.completionRate);
    
    // Pending tasks
    updateElement('pending-tasks', analytics.pendingTasks);
    updateElement('overdue-info', 
        analytics.overdueTasks > 0 
            ? `${analytics.overdueTasks} overdue` 
            : 'No overdue tasks'
    );
    
    // Productivity score
    updateElement('productivity-score', analytics.productivityScore);
    updateScoreRing(analytics.productivityScore);
    
    // Today's tasks
    updateElement('today-tasks', analytics.tasksToday);
    
    // Average completion
    updateElement('avg-completion', analytics.avgCompletionTime);
}

// Update Element Helper
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

// Update Progress Bar
function updateProgressBar(id, percentage) {
    const element = document.getElementById(id);
    if (element) {
        element.style.width = `${percentage}%`;
    }
}

// Update Score Ring (SVG Circle)
function updateScoreRing(score) {
    const ring = document.getElementById('score-ring');
    if (ring) {
        const radius = 40;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (score / 100) * circumference;
        
        ring.style.strokeDasharray = `${circumference} ${circumference}`;
        ring.style.strokeDashoffset = offset;
    }
}

// Render Overview Charts
function renderOverviewCharts(tasks) {
    renderCategoryChart(tasks);
    renderPriorityChart(tasks);
}

// Render Category Distribution Chart
function renderCategoryChart(tasks) {
    const canvas = document.getElementById('category-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (state.charts.category) {
        state.charts.category.destroy();
    }
    
    // Prepare data - task.category is a string ID
    const categoryData = state.categories.map(category => {
        const categoryTasks = tasks.filter(task => task.category === category.id);
        return {
            label: category.name,
            value: categoryTasks.length,
            color: category.color || '#10b981'
        };
    }).filter(item => item.value > 0);
    
    // Create chart
    state.charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: categoryData.map(d => d.label),
            datasets: [{
                data: categoryData.map(d => d.value),
                backgroundColor: categoryData.map(d => d.color),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f8fafc',
                        padding: 15,
                        font: { size: 12, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true
                }
            }
        }
    });
}

// Render Priority Distribution Chart
function renderPriorityChart(tasks) {
    const canvas = document.getElementById('priority-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (state.charts.priority) {
        state.charts.priority.destroy();
    }
    
    // Prepare data
    const priorityData = [
        { label: 'Low', value: tasks.filter(t => t.priority === 1).length, color: '#10b981' },
        { label: 'Medium', value: tasks.filter(t => t.priority === 2).length, color: '#f59e0b' },
        { label: 'High', value: tasks.filter(t => t.priority === 3).length, color: '#ef4444' },
        { label: 'Critical', value: tasks.filter(t => t.priority === 4).length, color: '#dc2626' }
    ].filter(item => item.value > 0);
    
    // Create chart
    state.charts.priority = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: priorityData.map(d => d.label),
            datasets: [{
                data: priorityData.map(d => d.value),
                backgroundColor: priorityData.map(d => d.color),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#f8fafc',
                        padding: 15,
                        font: { size: 12, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    borderWidth: 1,
                    padding: 12
                }
            }
        }
    });
}

// Render Trends Charts
function renderTrendsCharts(analytics) {
    renderWeeklyTrendChart(analytics.weeklyTrend);
    renderCategoryCompletionChart();
}

// Render Weekly Trend Chart
function renderWeeklyTrendChart(weeklyTrend) {
    const canvas = document.getElementById('weekly-trend-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart
    if (state.charts.weeklyTrend) {
        state.charts.weeklyTrend.destroy();
    }
    
    // Create chart
    state.charts.weeklyTrend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weeklyTrend.map(d => d.day),
            datasets: [
                {
                    label: 'Completed',
                    data: weeklyTrend.map(d => d.completed),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Created',
                    data: weeklyTrend.map(d => d.created),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#f8fafc',
                        padding: 15,
                        font: { size: 13, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

// Render Category Completion Chart
function renderCategoryCompletionChart() {
    const canvas = document.getElementById('category-completion-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const tasks = getFilteredTasks();
    
    // Destroy existing chart
    if (state.charts.categoryCompletion) {
        state.charts.categoryCompletion.destroy();
    }
    
    // Prepare data - task.category is a string ID, task.completed not isCompleted
    const categoryData = state.categories.map(category => {
        const categoryTasks = tasks.filter(task => task.category === category.id);
        const completed = categoryTasks.filter(t => t.completed).length;
        const pending = categoryTasks.length - completed;
        
        return {
            name: category.name,
            completed,
            pending,
            color: category.color || '#10b981'
        };
    }).filter(item => (item.completed + item.pending) > 0);
    
    // Create chart
    state.charts.categoryCompletion = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: categoryData.map(d => d.name),
            datasets: [
                {
                    label: 'Completed',
                    data: categoryData.map(d => d.completed),
                    backgroundColor: '#10b981',
                    borderRadius: 8
                },
                {
                    label: 'Pending',
                    data: categoryData.map(d => d.pending),
                    backgroundColor: '#f59e0b',
                    borderRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#f8fafc',
                        padding: 15,
                        font: { size: 13, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleColor: '#f8fafc',
                    bodyColor: '#94a3b8',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                x: {
                    stacked: true,
                    ticks: { color: '#94a3b8', font: { size: 11 } },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            }
        }
    });
}

// Render Productivity Metrics
function renderProductivityMetrics(analytics) {
    // Goal Achievement
    updateElement('goal-achievement', `${analytics.completionRate}%`);
    document.getElementById('goal-achievement-bar').style.width = `${analytics.completionRate}%`;
    
    // Speed & Efficiency
    const speedScore = Math.max(0, 100 - analytics.avgCompletionTime * 10);
    updateElement('speed-efficiency', `${speedScore}%`);
    document.getElementById('speed-efficiency-bar').style.width = `${speedScore}%`;
    
    // Work-Life Balance
    const balanceScore = Math.min(analytics.tasksToday <= 5 ? 100 : 60, 100);
    updateElement('work-life-balance', `${balanceScore}%`);
    document.getElementById('work-life-balance-bar').style.width = `${balanceScore}%`;
    
    // Overall Score
    updateElement('overall-score', `${analytics.productivityScore}%`);
    document.getElementById('overall-score-bar').style.width = `${analytics.productivityScore}%`;
}

// Render Insights
function renderInsights(analytics) {
    const tasks = getFilteredTasks();
    const insights = generateInsights(analytics, tasks);
    
    // Render insights cards
    const insightsGrid = document.getElementById('insights-grid');
    if (insightsGrid) {
        insightsGrid.innerHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-icon">
                    <i class="${insight.icon}"></i>
                </div>
                <div class="insight-content">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');
    }
    
    // Render recommendations
    const recommendations = generateRecommendations(analytics, tasks);
    const recommendationsList = document.getElementById('recommendations-list');
    if (recommendationsList) {
        recommendationsList.innerHTML = recommendations.map(rec => `
            <div class="recommendation-item">
                <div class="recommendation-priority ${rec.priority}">
                    <i class="${rec.icon}"></i>
                </div>
                <div class="recommendation-content">
                    <h5>${rec.title}</h5>
                    <p>${rec.description}</p>
                    <div class="recommendation-actions">
                        <button class="btn-small">${rec.actionText}</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Generate Insights
function generateInsights(analytics, tasks) {
    const insights = [];
    
    // Completion rate insight
    if (analytics.completionRate >= 80) {
        insights.push({
            type: 'success',
            icon: 'fas fa-trophy',
            title: 'Excellent Performance!',
            description: `You're maintaining an impressive ${analytics.completionRate}% completion rate. Keep up the great work!`
        });
    } else if (analytics.completionRate < 50) {
        insights.push({
            type: 'warning',
            icon: 'fas fa-exclamation-triangle',
            title: 'Focus Needed',
            description: `Your completion rate is ${analytics.completionRate}%. Try breaking tasks into smaller steps.`
        });
    }
    
    // Overdue tasks insight
    if (analytics.overdueTasks > 0) {
        insights.push({
            type: 'danger',
            icon: 'fas fa-clock',
            title: 'Overdue Tasks',
            description: `You have ${analytics.overdueTasks} overdue task${analytics.overdueTasks > 1 ? 's' : ''}. Prioritize these to stay on track.`
        });
    } else {
        insights.push({
            type: 'success',
            icon: 'fas fa-check-double',
            title: 'On Schedule',
            description: 'Great job! You have no overdue tasks. Your time management is excellent.'
        });
    }
    
    // Today's tasks insight
    if (analytics.tasksToday > 0) {
        insights.push({
            type: 'info',
            icon: 'fas fa-calendar-day',
            title: 'Today\'s Focus',
            description: `You have ${analytics.tasksToday} task${analytics.tasksToday > 1 ? 's' : ''} due today. Stay focused!`
        });
    }
    
    // Productivity insight
    if (analytics.productivityScore >= 75) {
        insights.push({
            type: 'success',
            icon: 'fas fa-fire',
            title: 'High Productivity',
            description: `Your productivity score is ${analytics.productivityScore}. You're in the zone!`
        });
    }
    
    // Add static helpful insights
    insights.push({
        type: 'tip',
        icon: 'fas fa-brain',
        title: 'Smart Tip',
        description: 'Try breaking large tasks into smaller subtasks. This can increase your completion rate by up to 40%!'
    });
    
    insights.push({
        type: 'recommendation',
        icon: 'fas fa-calendar-check',
        title: 'Time Management',
        description: 'Your most productive time appears to be in the morning. Consider scheduling important tasks between 9-11 AM.'
    });
    
    insights.push({
        type: 'goal',
        icon: 'fas fa-bullseye',
        title: 'Next Milestone',
        description: `You're ${100 - analytics.completionRate}% away from achieving a 100% completion rate. Keep pushing!`
        });
    
    return insights;
}

// Generate Recommendations
function generateRecommendations(analytics, tasks) {
    const recommendations = [];
    
    // High priority tasks
    const highPriorityCount = tasks.filter(t => t.priority === 3 && !t.completed).length;
    if (highPriorityCount > 0) {
        recommendations.push({
            priority: 'high',
            icon: 'fas fa-exclamation',
            title: 'Focus on High-Priority Tasks',
            description: `You have ${highPriorityCount} high-priority tasks. Complete these first to maximize impact.`,
            actionText: 'View High Priority'
        });
    }
    
    // Time blocking
    recommendations.push({
        priority: 'medium',
        icon: 'fas fa-clock',
        title: 'Time Blocking Strategy',
        description: 'Based on your patterns, try dedicating 2-hour blocks for deep work on complex tasks.',
        actionText: 'Learn More'
    });
    
    // Collaboration
    if (state.categories.length > 0) {
        recommendations.push({
            priority: 'low',
            icon: 'fas fa-users',
            title: 'Collaboration Opportunity',
            description: 'Consider delegating some tasks in your busiest category to improve overall efficiency.',
            actionText: 'Explore Options'
        });
    }
    
    return recommendations;
}

// UI Helpers
function showLoading() {
    const loading = document.getElementById('loading');
    const page = document.getElementById('analytics-page');
    if (loading) loading.style.display = 'flex';
    if (page) page.style.display = 'none';
}

function hideLoading() {
    const loading = document.getElementById('loading');
    const page = document.getElementById('analytics-page');
    if (loading) loading.style.display = 'none';
    if (page) page.style.display = 'block';
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    const errorText = document.getElementById('error-text');
    
    if (errorDiv && errorText) {
        errorText.textContent = message;
        errorDiv.classList.add('active');
    }
}

// Initialize on DOM Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}