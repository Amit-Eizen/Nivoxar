/**
 * Router - History-based SPA Router
 * Handles client-side routing without page reloads
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.beforeNavigateCallbacks = [];
        this.afterNavigateCallbacks = [];
        this.isNavigating = false;

        console.log('🚀 Router: Initializing...');

        // Get global loading element
        this.globalLoading = document.getElementById('globalLoading');
        this.appContainer = document.getElementById('app');

        // Listen to browser navigation events
        window.addEventListener('popstate', () => this.handlePopState());

        // Intercept all link clicks - use capture phase to ensure we catch it first
        document.addEventListener('click', (e) => this.handleLinkClick(e), true);

        console.log('✅ Router: Event listeners attached');
    }

    /**
     * Register a route
     * @param {string} path - Route path (e.g., '/dashboard')
     * @param {Function} handler - Async function to render the view
     */
    register(path, handler) {
        this.routes.set(path, handler);
    }

    /**
     * Navigate to a route programmatically
     * @param {string} path - Route path to navigate to
     * @param {boolean} replace - Replace history instead of push
     */
    async navigate(path, replace = false) {
        // Prevent multiple simultaneous navigations
        if (this.isNavigating) {
            console.log('⚠️ Router: Navigation already in progress');
            return;
        }

        this.isNavigating = true;

        // Run before navigate callbacks
        for (const callback of this.beforeNavigateCallbacks) {
            const shouldContinue = await callback(path);
            if (shouldContinue === false) {
                this.isNavigating = false;
                return;
            }
        }

        // Show loading state
        this.showLoading();

        // Update browser history
        if (replace) {
            window.history.replaceState({ path }, '', path);
        } else {
            window.history.pushState({ path }, '', path);
        }

        // Wait for exit animation to complete
        await new Promise(resolve => setTimeout(resolve, 200));

        // Render the route
        await this.renderRoute(path);

        // Small delay to ensure content is rendered
        await new Promise(resolve => setTimeout(resolve, 50));

        // Hide loading state
        this.hideLoading();

        // Run after navigate callbacks
        for (const callback of this.afterNavigateCallbacks) {
            await callback(path);
        }

        this.isNavigating = false;
    }

    /**
     * Render a route based on current path
     * @param {string} path - Route path to render
     */
    async renderRoute(path) {
        this.currentRoute = path;

        // Cleanup before rendering new route
        this.cleanup();

        const handler = this.routes.get(path);

        if (handler) {
            try {
                await handler();
            } catch (error) {
                console.error(`Error rendering route ${path}:`, error);
                this.handleError(error);
            }
        } else {
            // Route not found - redirect to dashboard
            console.warn(`Route ${path} not found, redirecting to /dashboard`);
            this.navigate('/dashboard', true);
        }
    }

    /**
     * Cleanup before rendering new route
     * Removes old modals, popups, and overlays
     */
    cleanup() {
        // Remove all modals/popups/overlays that might be open
        const elementsToRemove = [
            '.modal-overlay',
            '.popup-overlay',
            '.side-panel',
            '[id$="Modal"]',
            '[id$="Popup"]',
            '[id$="Overlay"]'
        ];

        elementsToRemove.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
                el.remove();
            });
        });

        // Remove backdrop/overlay classes from body
        document.body.classList.remove('modal-open', 'popup-open', 'no-scroll');

        // Clear any inline styles that might have been added to body
        document.body.style.overflow = '';
    }

    /**
     * Handle browser back/forward button
     */
    async handlePopState() {
        const path = window.location.pathname;
        await this.renderRoute(path);
    }

    /**
     * Intercept link clicks for SPA navigation
     * @param {Event} e - Click event
     */
    handleLinkClick(e) {
        const link = e.target.closest('a');

        if (!link) return;

        const href = link.getAttribute('href');

        console.log('🔗 Router: Link clicked:', href);

        // Only intercept internal links
        if (!href || href.startsWith('http') || href.startsWith('//') || href.startsWith('#')) {
            console.log('⚠️ Router: External link, not intercepting');
            return;
        }

        console.log('✅ Router: Intercepting navigation to:', href);

        // Prevent default navigation
        e.preventDefault();

        // Navigate using router
        this.navigate(href);
    }

    /**
     * Register callback before navigation
     * @param {Function} callback - Callback function
     */
    beforeNavigate(callback) {
        this.beforeNavigateCallbacks.push(callback);
    }

    /**
     * Register callback after navigation
     * @param {Function} callback - Callback function
     */
    afterNavigate(callback) {
        this.afterNavigateCallbacks.push(callback);
    }

    /**
     * Handle routing errors
     * @param {Error} error - Error object
     */
    handleError(error) {
        const appContainer = document.getElementById('app');
        if (appContainer) {
            appContainer.innerHTML = `
                <div style="padding: 40px; text-align: center;">
                    <h1>Something went wrong</h1>
                    <p>${error.message}</p>
                    <button onclick="window.location.href='/dashboard'">Go to Dashboard</button>
                </div>
            `;
        }
    }

    /**
     * Show global loading state with smooth animation
     */
    showLoading() {
        // Add transitioning class to app container for fade effect
        if (this.appContainer) {
            this.appContainer.classList.add('page-transitioning');
            // Remove any previous animation classes
            this.appContainer.classList.remove('page-enter');
        }

        // Show global loading spinner if exists
        if (this.globalLoading) {
            this.globalLoading.style.display = 'flex';
            // Force reflow to ensure display change takes effect
            this.globalLoading.offsetHeight;
            this.globalLoading.classList.add('active');
        }
    }

    /**
     * Hide global loading state with smooth animation
     */
    hideLoading() {
        // Remove transitioning state and add enter animation
        if (this.appContainer) {
            this.appContainer.classList.remove('page-transitioning');
            // Force reflow before adding animation class
            this.appContainer.offsetHeight;
            this.appContainer.classList.add('page-enter');

            // Clean up animation class after it completes
            setTimeout(() => {
                this.appContainer?.classList.remove('page-enter');
            }, 350);
        }

        // Hide global loading spinner
        if (this.globalLoading) {
            this.globalLoading.classList.remove('active');

            // Wait for fade-out transition before hiding
            setTimeout(() => {
                if (this.globalLoading && !this.globalLoading.classList.contains('active')) {
                    this.globalLoading.style.display = 'none';
                }
            }, 250);
        }
    }

    /**
     * Initialize router and load current route
     */
    async init() {
        const path = window.location.pathname;

        // Default to /dashboard if on root
        if (path === '/' || path === '/index.html') {
            await this.navigate('/dashboard', true);
        } else {
            await this.renderRoute(path);
        }
    }
}

// Export singleton instance
export const router = new Router();
