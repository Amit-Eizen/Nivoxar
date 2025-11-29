// LoginPage.js - Enhanced with Authentication & Redirect
import { checkIfLoggedIn, login, register, sendVerificationCode, verifyEmailCode } from '../services/AuthService.js';
import Logger from '../utils/Logger.js';

/**
 * Show username suggestions popup when name is already taken
 * @param {Array<string>} suggestions - Array of suggested usernames
 * @param {HTMLElement} nameInput - The name input field to update
 */
function showNameSuggestionsPopup(suggestions, nameInput) {
    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'name-suggestions-backdrop';

    // Create popup
    const popup = document.createElement('div');
    popup.className = 'name-suggestions-popup';

    // Popup content
    popup.innerHTML = `
        <h3>This name is already taken</h3>
        <p>Here are some available alternatives:</p>
        <div class="suggestions-list"></div>
        <div class="suggestions-actions">
            <button class="suggestions-cancel-btn">Cancel</button>
        </div>
    `;

    // Add suggestion buttons
    const suggestionsList = popup.querySelector('.suggestions-list');
    suggestions.forEach(suggestion => {
        const btn = document.createElement('button');
        btn.className = 'suggestion-btn';
        btn.textContent = suggestion;
        btn.addEventListener('click', () => {
            // Update name input with selected suggestion
            if (nameInput) {
                nameInput.value = suggestion;
            }
            // Close popup
            backdrop.remove();
        });
        suggestionsList.appendChild(btn);
    });

    // Cancel button
    const cancelBtn = popup.querySelector('.suggestions-cancel-btn');
    cancelBtn.addEventListener('click', () => {
        backdrop.remove();
    });

    // Close on backdrop click
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            backdrop.remove();
        }
    });

    // Append popup to backdrop and backdrop to body
    backdrop.appendChild(popup);
    document.body.appendChild(backdrop);
}

function initializeLoginPage() {
    // Check if already logged in
    checkIfLoggedIn();
    
    // Elements
    const headerLoginBtn = document.getElementById('headerLoginBtn');
    const headerRegisterBtn = document.getElementById('headerRegisterBtn');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
    // Form switching
    function showLoginForm() {
        if (loginForm) loginForm.style.display = 'block';
        if (registerForm) registerForm.style.display = 'none';
        headerLoginBtn?.classList.add('active');
        headerRegisterBtn?.classList.remove('active');
    }
    
    function showRegisterForm() {
        if (loginForm) loginForm.style.display = 'none';
        if (registerForm) registerForm.style.display = 'block';
        headerRegisterBtn?.classList.add('active');
        headerLoginBtn?.classList.remove('active');

        // Initialize Email Verification Form
        initEmailVerificationForm();
    }

    // Email Verification State
    let verificationStep = 1; // 1: Email, 2: Code, 3: Complete Registration
    let verifiedEmail = '';

    // Initialize Email Verification Form for registration
    function initEmailVerificationForm() {
        const container = document.getElementById('emailVerificationContainer');
        if (!container) return;

        // Reset to step 1
        verificationStep = 1;
        verifiedEmail = '';
        renderVerificationStep();
    }

    // Render current verification step
    function renderVerificationStep() {
        const container = document.getElementById('emailVerificationContainer');
        const registerFormElement = document.getElementById('registerFormElement');

        if (!container) return;

        if (verificationStep === 1) {
            // Step 1: Enter Email
            container.innerHTML = `
                <form id="verificationEmailForm">
                    <div class="form-group">
                        <label class="form-label" for="verificationEmail">
                            <i>📧</i>
                            <span>Email Address</span>
                        </label>
                        <input
                            type="email"
                            id="verificationEmail"
                            class="form-input"
                            placeholder="your@email.com"
                            required
                        >
                    </div>

                    <button type="submit" class="auth-submit-btn">
                        <span>Send Verification Code</span>
                        <i>→</i>
                    </button>

                    <div class="auth-divider">
                        <span>or</span>
                    </div>

                    <p class="auth-footer">
                        Already have an account?
                        <button type="button" class="auth-link" id="verificationBackToLogin">
                            Sign in
                        </button>
                    </p>
                </form>
            `;

            registerFormElement.style.display = 'none';

            // Add event listeners
            const emailForm = document.getElementById('verificationEmailForm');
            const backToLoginBtn = document.getElementById('verificationBackToLogin');

            emailForm?.addEventListener('submit', handleSendVerificationCode);
            backToLoginBtn?.addEventListener('click', (e) => {
                e.preventDefault();
                showLoginForm();
            });

        } else if (verificationStep === 2) {
            // Step 2: Enter Verification Code
            container.innerHTML = `
                <form id="verificationCodeForm">
                    <p style="color: #94a3b8; margin-bottom: 24px; text-align: center; font-size: 13px;">
                        We sent a 6-digit code to <strong style="color: #10b981;">${verifiedEmail}</strong>
                    </p>

                    <div class="form-group">
                        <label class="form-label" for="verificationCode">
                            <i>🔑</i>
                            <span>Verification Code</span>
                        </label>
                        <input
                            type="text"
                            id="verificationCode"
                            class="form-input"
                            placeholder="000000"
                            maxlength="6"
                            required
                            style="text-align: center; font-size: 17px; letter-spacing: 5px;"
                        >
                    </div>

                    <button type="submit" class="auth-submit-btn">
                        <span>Verify Code</span>
                        <i>✓</i>
                    </button>

                    <div class="auth-divider">
                        <span>or</span>
                    </div>

                    <p class="auth-footer">
                        <button type="button" class="auth-link" id="backToEmailBtn">
                            ← Change Email
                        </button>
                        •
                        <button type="button" class="auth-link" id="resendCodeBtn">
                            Resend Code
                        </button>
                    </p>
                </form>
            `;

            registerFormElement.style.display = 'none';

            // Add event listeners
            const codeForm = document.getElementById('verificationCodeForm');
            const resendBtn = document.getElementById('resendCodeBtn');
            const backToEmailBtn = document.getElementById('backToEmailBtn');

            codeForm?.addEventListener('submit', handleVerifyCode);
            resendBtn?.addEventListener('click', handleResendCode);
            backToEmailBtn?.addEventListener('click', handleBackToEmail);

        } else if (verificationStep === 3) {
            // Step 3: Complete Registration (show the original form with verified email)
            container.innerHTML = '';
            registerFormElement.style.display = 'block';

            // Pre-fill the email field with verified email
            const emailInput = document.getElementById('registerEmail');
            if (emailInput) {
                emailInput.value = verifiedEmail;
                emailInput.readOnly = true;
            }
        }
    }

    // Handle Send Verification Code
    async function handleSendVerificationCode(e) {
        e.preventDefault();

        const emailInput = document.getElementById('verificationEmail');
        const email = emailInput?.value.trim();

        if (!email || !isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Sending...</span><i>⏳</i>';

        const result = await sendVerificationCode(email);

        if (result.success) {
            verifiedEmail = email;
            verificationStep = 2;
            renderVerificationStep();
        } else {
            alert(result.error || 'Failed to send verification code');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Send Verification Code</span><i>→</i>';
        }
    }

    // Handle Verify Code
    async function handleVerifyCode(e) {
        e.preventDefault();

        const codeInput = document.getElementById('verificationCode');
        const code = codeInput?.value.trim();

        if (!code || code.length !== 6) {
            alert('Please enter a valid 6-digit code');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Verifying...</span><i>⏳</i>';

        const result = await verifyEmailCode(verifiedEmail, code);

        if (result.success && result.verified) {
            verificationStep = 3;
            renderVerificationStep();
        } else {
            alert(result.error || 'Invalid verification code');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Verify Code</span><i>✓</i>';
        }
    }

    // Handle Resend Code
    async function handleResendCode(e) {
        e.preventDefault();

        const btn = e.target;
        btn.disabled = true;
        btn.textContent = 'Sending...';

        const result = await sendVerificationCode(verifiedEmail);

        if (result.success) {
            alert('Verification code resent successfully!');
            btn.disabled = false;
            btn.textContent = 'Resend Code';
        } else {
            alert(result.error || 'Failed to resend code');
            btn.disabled = false;
            btn.textContent = 'Resend Code';
        }
    }

    // Handle Back to Email
    function handleBackToEmail(e) {
        e.preventDefault();
        verificationStep = 1;
        renderVerificationStep();
    }
    
    // Event listeners
    headerLoginBtn?.addEventListener('click', showLoginForm);
    headerRegisterBtn?.addEventListener('click', showRegisterForm);
    showRegisterLink?.addEventListener('click', (e) => { e.preventDefault(); showRegisterForm(); });
    showLoginLink?.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    forgotPasswordLink?.addEventListener('click', (e) => { e.preventDefault(); alert('Forgot password feature - coming soon!'); });
    
    // Password toggle
    function setupPasswordToggle(toggleBtn, passwordInput) {
        if (!toggleBtn || !passwordInput) return;
        
        toggleBtn.addEventListener('click', function() {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            toggleBtn.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        });
    }
    
    setupPasswordToggle(document.getElementById('toggleLoginPassword'), document.getElementById('loginPassword'));
    setupPasswordToggle(document.getElementById('toggleRegisterPassword'), document.getElementById('registerPassword'));
    setupPasswordToggle(document.getElementById('toggleRegisterPasswordConfirm'), document.getElementById('registerPasswordConfirm'));
    
    // Email validation
    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    // Password strength
    let passwordStrengthContainer = null;
    
    function checkPasswordStrength(password) {
        let strength = 0;
        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password)) strength++;
        if (/[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
        return strength;
    }
    
    function getStrengthLabel(strength) {
        const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        return labels[strength - 1] || 'Enter password';
    }
    
    function getStrengthClass(strength) {
        const classes = ['', 'weak', 'fair', 'good', 'strong'];
        return classes[strength] || '';
    }
    
    function updatePasswordStrength() {
        const registerPasswordInput = document.getElementById('registerPassword');
        if (!registerPasswordInput) return;
        
        const password = registerPasswordInput.value;
        const strength = checkPasswordStrength(password);
        
        if (!passwordStrengthContainer) {
            passwordStrengthContainer = document.createElement('div');
            passwordStrengthContainer.className = 'password-strength';
            passwordStrengthContainer.innerHTML = `
                <div class="strength-bar">
                    <div class="strength-fill"></div>
                </div>
                <span class="strength-text"></span>
            `;
            registerPasswordInput.parentElement.parentElement.appendChild(passwordStrengthContainer);
        }
        
        const passwordStrengthBar = passwordStrengthContainer.querySelector('.strength-fill');
        const passwordStrengthText = passwordStrengthContainer.querySelector('.strength-text');
        
        if (password && passwordStrengthBar && passwordStrengthText) {
            const strengthClass = getStrengthClass(strength);
            passwordStrengthBar.className = 'strength-fill';
            if (strengthClass) passwordStrengthBar.classList.add(strengthClass);
            passwordStrengthText.textContent = getStrengthLabel(strength);
        } else if (passwordStrengthBar && passwordStrengthText) {
            passwordStrengthBar.className = 'strength-fill';
            passwordStrengthText.textContent = '';
        }
    }
    
    document.getElementById('registerPassword')?.addEventListener('input', updatePasswordStrength);
    
    // ========== FORM SUBMISSIONS ==========
    
    // Login Form
    document.getElementById('loginFormElement')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        
        // Validation
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        // UI feedback
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Signing In...</span>';
        
        try {
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Attempt login using AuthService
            const result = await login(email, password);

            if (result.success) {
                // Redirect to dashboard - SPA or MPA mode
                if (window.__SPA_MODE__) {
                    const { router } = await import('../scripts/core/Router.js');
                    await router.navigate('/dashboard');
                } else {
                    window.location.href = '/views/DashboardPage.html';
                }
            } else {
                alert(result.error);
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    });
    
    // Register Form
    document.getElementById('registerFormElement')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName')?.value.trim();
        const email = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('registerPasswordConfirm')?.value;
        const agreeTerms = document.getElementById('agreeTerms')?.checked;
        
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }
        
        if (name.length < 2) {
            alert('Name must be at least 2 characters');
            return;
        }
        
        if (!isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        if (password.length < 8) {
            alert('Password must be at least 8 characters');
            return;
        }
        
        const strength = checkPasswordStrength(password);
        if (strength < 3) {
            alert('Password is too weak. Please use a stronger password.');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
        
        if (!agreeTerms) {
            alert('Please agree to Terms & Conditions');
            return;
        }
        
        // UI feedback
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Creating Account...</span>';
        
        try {
            // Simulate delay
            await new Promise(resolve => setTimeout(resolve, 500));

            // Attempt registration using AuthService
            const result = await register({ name, email, password });

            if (result.success) {
                // Redirect to dashboard - SPA or MPA mode
                if (window.__SPA_MODE__) {
                    const { router } = await import('../scripts/core/Router.js');
                    await router.navigate('/dashboard');
                } else {
                    window.location.href = '/views/DashboardPage.html';
                }
            } else {
                // Check if this is a "name taken" error with suggestions
                if (result.errorData?.nameTaken && result.errorData?.suggestions) {
                    // Show suggestions popup
                    showNameSuggestionsPopup(result.errorData.suggestions, document.getElementById('registerName'));
                } else {
                    // Show error below appropriate field
                    const errorMessage = result.error || 'Registration failed';

                    if (errorMessage.toLowerCase().includes('username') || errorMessage.toLowerCase().includes('name')) {
                        // Username/Name error - show below name field
                        const nameInput = document.getElementById('registerName');
                        const formGroup = nameInput?.closest('.form-group') || nameInput?.parentElement;

                        // Remove any existing error message
                        const existingError = formGroup?.querySelector('.error-message');
                        if (existingError) {
                            existingError.remove();
                        }

                        // Create new error message
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'error-message';

                        // Extract clean error message
                        let cleanError = errorMessage;
                        if (errorMessage.includes('Failed to create user:')) {
                            cleanError = errorMessage.split('Failed to create user:')[1].trim();
                        }
                        if (errorMessage.includes('Unable to generate unique username')) {
                            cleanError = 'This name is already taken. Please choose another name.';
                        }
                        errorDiv.textContent = cleanError;

                        // Append error after the form group
                        formGroup?.appendChild(errorDiv);
                    } else if (errorMessage.toLowerCase().includes('password')) {
                        // Password error - show below password field
                        const passwordInput = document.getElementById('registerPasswordConfirm');
                        // Find the form-group container
                        const formGroup = passwordInput?.closest('.form-group') || passwordInput?.parentElement;

                        // Remove any existing error message
                        const existingError = formGroup?.querySelector('.error-message');
                        if (existingError) {
                            existingError.remove();
                        }

                        // Create new error message
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'error-message';

                        // Extract clean error message
                        let cleanError = errorMessage;
                        if (errorMessage.includes('Failed to create user:')) {
                            cleanError = errorMessage.split('Failed to create user:')[1].trim();
                        }
                        errorDiv.textContent = cleanError;

                        // Append error after the form group
                        formGroup?.appendChild(errorDiv);
                    } else {
                        // Generic error
                        alert(errorMessage);
                    }
                }

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHTML;
            }
        } catch (error) {
            alert('An error occurred. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    });

    // Initial state
    showLoginForm();
}

// For standalone HTML page (MPA mode)
if (!window.__SPA_MODE__) {
    document.addEventListener('DOMContentLoaded', initializeLoginPage);
}

// ===== SPA MODE =====

/**
 * Load Login page for SPA
 */
export async function loadLoginPage() {
    Logger.debug('📄 Loading Login Page...');

    // Load CSS
    loadPageCSS();

    // Get app container
    const app = document.getElementById('app');
    if (!app) {
        Logger.error('App container not found');
        return;
    }

    // Inject HTML
    app.innerHTML = getPageHTML();

    // Initialize Login
    initializeLoginPage();
}

/**
 * Load CSS for Login page
 */
function loadPageCSS() {
    const cssFiles = [
        '/public/styles/LoginPage.css'
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
 * Get Login HTML
 */
function getPageHTML() {
    return `
        <!-- Auth Page Wrapper -->
        <div class="auth-page">
            <!-- Floating Shapes -->
            <div class="floating-shapes">
                <div class="shape shape-1"></div>
                <div class="shape shape-2"></div>
                <div class="shape shape-3"></div>
                <div class="shape shape-4"></div>
                <div class="shape shape-5"></div>
            </div>

            <!-- Grid Overlay -->
            <div class="grid-overlay"></div>

            <!-- Header -->
            <header class="main-header">
                <div class="header-content">
                    <a href="#" class="header-logo">
                        <span class="logo-icon">📋</span>
                        <span class="logo-text">Nivoxar</span>
                    </a>
                    <div class="header-actions">
                        <button class="header-btn btn-login active" id="headerLoginBtn">
                            <span>🔐</span>
                            <span>Login</span>
                        </button>
                        <button class="header-btn btn-register" id="headerRegisterBtn">
                            <span>👤</span>
                            <span>Register</span>
                        </button>
                    </div>
                </div>
            </header>

            <!-- Main Container -->
            <div class="auth-container">
                <!-- Left Panel -->
                <div class="auth-left-panel">
                    <div class="brand-section">
                        <div class="logo-container">
                            <span class="brand-logo-icon">📋</span>
                            <h1 class="brand-title">Nivoxar</h1>
                        </div>
                        <p class="brand-subtitle">Smart task management for modern teams</p>
                    </div>

                    <div class="feature-highlights">
                        <div class="feature-item">
                            <div class="feature-icon">✅</div>
                            <div class="feature-text">Task Management</div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">🔄</div>
                            <div class="feature-text">Recurring Tasks</div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">📊</div>
                            <div class="feature-text">Analytics Dashboard</div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon">📅</div>
                            <div class="feature-text">Calendar View</div>
                        </div>
                    </div>

                    <div class="stats-section">
                        <div class="stat-item">
                            <span class="stat-number">10K+</span>
                            <span class="stat-label">Active Users</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">50K+</span>
                            <span class="stat-label">Tasks Completed</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-number">99%</span>
                            <span class="stat-label">Satisfaction</span>
                        </div>
                    </div>

                    <div class="user-review">
                        <p class="userReview-quote">
                            Nivoxar transformed how our team manages projects. The recurring tasks feature alone saved us hours every week!
                        </p>
                        <div class="userReview-author">
                            <div class="author-avatar">AE</div>
                            <div class="author-info">
                                <strong>Amit Eizenberg</strong>
                                <span>Founder & CEO</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Panel -->
                <div class="auth-right-panel">
                    <!-- Login Form -->
                    <div class="auth-form" id="loginForm">
                        <div class="form-header">
                            <h2>Welcome Back!</h2>
                            <p>Sign in to your account</p>
                        </div>

                        <form id="loginFormElement">
                            <div class="form-group">
                                <label class="form-label" for="loginEmail">
                                    <i>📧</i>
                                    <span>Email</span>
                                </label>
                                <input
                                    type="email"
                                    id="loginEmail"
                                    class="form-input"
                                    placeholder="your@email.com"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="loginPassword">
                                    <i>🔐</i>
                                    <span>Password</span>
                                </label>
                                <div class="password-input-container">
                                    <input
                                        type="password"
                                        id="loginPassword"
                                        class="form-input"
                                        placeholder="••••••••"
                                        required
                                    >
                                    <button type="button" class="password-toggle" id="toggleLoginPassword">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="form-options">
                                <label class="checkbox-container">
                                    <input type="checkbox" id="rememberMe">
                                    <span class="checkmark"></span>
                                    <span>Remember me</span>
                                </label>
                                <a href="#" class="forgot-password" id="forgotPasswordLink">
                                    Forgot password?
                                </a>
                            </div>

                            <button type="submit" class="auth-submit-btn">
                                <span>Sign In</span>
                                <i>→</i>
                            </button>

                            <div class="auth-divider">
                                <span>or</span>
                            </div>

                            <div class="social-login">
                                <button type="button" class="social-btn google-btn">
                                    <i class="fab fa-google"></i>
                                    Google
                                </button>
                                <button type="button" class="social-btn github-btn">
                                    <i class="fab fa-github"></i>
                                    GitHub
                                </button>
                            </div>

                            <div class="auth-footer">
                                <p>
                                    Don't have an account?
                                    <button type="button" class="auth-link" id="showRegisterLink">
                                        Sign up now
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>

                    <!-- Register Form -->
                    <div class="auth-form" id="registerForm" style="display: none;">
                        <div class="form-header">
                            <h2>Create Account</h2>
                            <p>Join Nivoxar today</p>
                        </div>

                        <!-- Email Verification Form Component -->
                        <div id="emailVerificationContainer"></div>

                        <form id="registerFormElement" style="display: none;">
                            <div class="form-group">
                                <label class="form-label" for="registerName">
                                    <i>👤</i>
                                    <span>Full Name</span>
                                </label>
                                <input
                                    type="text"
                                    id="registerName"
                                    class="form-input"
                                    placeholder="Enter your name"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="registerEmail">
                                    <i>📧</i>
                                    <span>Email</span>
                                </label>
                                <input
                                    type="email"
                                    id="registerEmail"
                                    class="form-input"
                                    placeholder="your@email.com"
                                    required
                                >
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="registerPassword">
                                    <i>🔐</i>
                                    <span>Password</span>
                                </label>
                                <div class="password-input-container">
                                    <input
                                        type="password"
                                        id="registerPassword"
                                        class="form-input"
                                        placeholder="••••••••"
                                        required
                                    >
                                    <button type="button" class="password-toggle" id="toggleRegisterPassword">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="registerPasswordConfirm">
                                    <i>🔐</i>
                                    <span>Confirm Password</span>
                                </label>
                                <div class="password-input-container">
                                    <input
                                        type="password"
                                        id="registerPasswordConfirm"
                                        class="form-input"
                                        placeholder="••••••••"
                                        required
                                    >
                                    <button type="button" class="password-toggle" id="toggleRegisterPasswordConfirm">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="form-options">
                                <label class="checkbox-container">
                                    <input type="checkbox" id="agreeTerms" required>
                                    <span class="checkmark"></span>
                                    <span>I agree to Terms & Conditions</span>
                                </label>
                            </div>

                            <button type="submit" class="auth-submit-btn">
                                <span>Create Account</span>
                                <i>→</i>
                            </button>

                            <div class="auth-divider">
                                <span>or</span>
                            </div>

                            <div class="social-login">
                                <button type="button" class="social-btn google-btn">
                                    <i class="fab fa-google"></i>
                                    Google
                                </button>
                                <button type="button" class="social-btn github-btn">
                                    <i class="fab fa-github"></i>
                                    GitHub
                                </button>
                            </div>

                            <div class="auth-footer">
                                <p>
                                    Already have an account?
                                    <button type="button" class="auth-link" id="showLoginLink">
                                        Sign in
                                    </button>
                                </p>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;
}