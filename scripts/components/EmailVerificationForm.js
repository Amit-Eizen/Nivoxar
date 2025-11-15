// EmailVerificationForm.js - 3-Step Email Verification Registration Component
import { sendVerificationCode, verifyEmailCode, register } from '../../services/AuthService.js';

export class EmailVerificationForm {
    constructor() {
        this.currentStep = 1;
        this.email = '';
        this.verifiedEmail = false;
    }

    /**
     * Get HTML for 3-step registration form
     */
    getHTML() {
        return `
            <div class="email-verification-form">
                <!-- Progress Indicator -->
                <div class="verification-progress">
                    <div class="progress-step ${this.currentStep >= 1 ? 'active' : ''} ${this.currentStep > 1 ? 'completed' : ''}">
                        <div class="step-circle">1</div>
                        <span class="step-label">Email</span>
                    </div>
                    <div class="progress-line ${this.currentStep > 1 ? 'completed' : ''}"></div>
                    <div class="progress-step ${this.currentStep >= 2 ? 'active' : ''} ${this.currentStep > 2 ? 'completed' : ''}">
                        <div class="step-circle">2</div>
                        <span class="step-label">Verify</span>
                    </div>
                    <div class="progress-line ${this.currentStep > 2 ? 'completed' : ''}"></div>
                    <div class="progress-step ${this.currentStep >= 3 ? 'active' : ''}">
                        <div class="step-circle">3</div>
                        <span class="step-label">Complete</span>
                    </div>
                </div>

                <!-- Step 1: Email Input -->
                <div class="verification-step ${this.currentStep === 1 ? 'active' : 'hidden'}" data-step="1">
                    <div class="step-header">
                        <h3>Enter Your Email</h3>
                        <p>We'll send you a verification code</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="verifyEmail">
                            <i>📧</i>
                            <span>Email Address</span>
                        </label>
                        <input
                            type="email"
                            id="verifyEmail"
                            class="form-input"
                            placeholder="your@email.com"
                            required
                        >
                    </div>
                    <button type="button" class="verification-btn" id="sendCodeBtn">
                        <span>Send Verification Code</span>
                        <i>→</i>
                    </button>
                </div>

                <!-- Step 2: Code Verification -->
                <div class="verification-step ${this.currentStep === 2 ? 'active' : 'hidden'}" data-step="2">
                    <div class="step-header">
                        <h3>Enter Verification Code</h3>
                        <p>Check your email for the 6-digit code</p>
                    </div>
                    <div class="code-input-container">
                        <input type="text" maxlength="1" class="code-digit" data-index="0">
                        <input type="text" maxlength="1" class="code-digit" data-index="1">
                        <input type="text" maxlength="1" class="code-digit" data-index="2">
                        <input type="text" maxlength="1" class="code-digit" data-index="3">
                        <input type="text" maxlength="1" class="code-digit" data-index="4">
                        <input type="text" maxlength="1" class="code-digit" data-index="5">
                    </div>
                    <div class="verification-actions">
                        <button type="button" class="verification-btn" id="verifyCodeBtn">
                            <span>Verify Code</span>
                            <i>✓</i>
                        </button>
                        <button type="button" class="resend-btn" id="resendCodeBtn">
                            Resend Code
                        </button>
                    </div>
                    <button type="button" class="back-btn" id="backToEmailBtn">
                        ← Back
                    </button>
                </div>

                <!-- Step 3: Complete Registration -->
                <div class="verification-step ${this.currentStep === 3 ? 'active' : 'hidden'}" data-step="3">
                    <div class="step-header">
                        <h3>Complete Your Profile</h3>
                        <p>Email verified: ${this.email}</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="finalName">
                            <i>👤</i>
                            <span>Full Name</span>
                        </label>
                        <input
                            type="text"
                            id="finalName"
                            class="form-input"
                            placeholder="Enter your name"
                            required
                        >
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="finalPassword">
                            <i>🔐</i>
                            <span>Password</span>
                        </label>
                        <div class="password-input-container">
                            <input
                                type="password"
                                id="finalPassword"
                                class="form-input"
                                placeholder="••••••••"
                                required
                            >
                            <button type="button" class="password-toggle" id="toggleFinalPassword">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="finalPasswordConfirm">
                            <i>🔐</i>
                            <span>Confirm Password</span>
                        </label>
                        <div class="password-input-container">
                            <input
                                type="password"
                                id="finalPasswordConfirm"
                                class="form-input"
                                placeholder="••••••••"
                                required
                            >
                            <button type="button" class="password-toggle" id="toggleFinalPasswordConfirm">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-options">
                        <label class="checkbox-container">
                            <input type="checkbox" id="finalAgreeTerms" required>
                            <span class="checkmark"></span>
                            <span>I agree to Terms & Conditions</span>
                        </label>
                    </div>
                    <button type="button" class="verification-btn" id="completeRegistrationBtn">
                        <span>Create Account</span>
                        <i>→</i>
                    </button>
                    <button type="button" class="back-btn" id="backToVerifyBtn">
                        ← Back
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get CSS for email verification form
     */
    getCSS() {
        return `
            <style>
                .email-verification-form {
                    width: 100%;
                }

                .verification-progress {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 30px;
                    padding: 0 20px;
                }

                .progress-step {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    opacity: 0.4;
                    transition: opacity 0.3s;
                }

                .progress-step.active {
                    opacity: 1;
                }

                .progress-step.completed {
                    opacity: 1;
                }

                .step-circle {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 18px;
                    transition: transform 0.3s;
                }

                .progress-step.active .step-circle {
                    transform: scale(1.2);
                    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
                }

                .progress-step.completed .step-circle {
                    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                }

                .progress-step.completed .step-circle::before {
                    content: '✓';
                }

                .step-label {
                    font-size: 12px;
                    font-weight: 500;
                    color: #888;
                }

                .progress-step.active .step-label {
                    color: #667eea;
                    font-weight: 600;
                }

                .progress-line {
                    flex: 1;
                    height: 2px;
                    background: #e5e7eb;
                    margin: 0 10px;
                    transition: background 0.3s;
                }

                .progress-line.completed {
                    background: linear-gradient(to right, #667eea, #764ba2);
                }

                .verification-step {
                    display: none;
                    animation: fadeIn 0.3s;
                }

                .verification-step.active {
                    display: block;
                }

                .verification-step.hidden {
                    display: none;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .step-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .step-header h3 {
                    font-size: 24px;
                    font-weight: 700;
                    margin-bottom: 10px;
                    color: #1a1a1a;
                }

                .step-header p {
                    font-size: 14px;
                    color: #666;
                }

                .code-input-container {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin: 30px 0;
                }

                .code-digit {
                    width: 50px;
                    height: 60px;
                    font-size: 24px;
                    font-weight: bold;
                    text-align: center;
                    border: 2px solid #e5e7eb;
                    border-radius: 10px;
                    background: #fff;
                    transition: all 0.3s;
                }

                .code-digit:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .verification-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    border: none;
                    border-radius: 12px;
                    font-size: 16px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    transition: all 0.3s;
                }

                .verification-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
                }

                .verification-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .verification-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .resend-btn {
                    background: none;
                    border: none;
                    color: #667eea;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    text-align: center;
                    transition: color 0.3s;
                }

                .resend-btn:hover {
                    color: #764ba2;
                    text-decoration: underline;
                }

                .back-btn {
                    margin-top: 15px;
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    text-align: center;
                    transition: color 0.3s;
                }

                .back-btn:hover {
                    color: #667eea;
                }
            </style>
        `;
    }

    /**
     * Initialize event listeners
     */
    init() {
        // Step 1: Send Code
        document.getElementById('sendCodeBtn')?.addEventListener('click', () => this.handleSendCode());

        // Step 2: Verify Code
        document.getElementById('verifyCodeBtn')?.addEventListener('click', () => this.handleVerifyCode());
        document.getElementById('resendCodeBtn')?.addEventListener('click', () => this.handleSendCode());
        document.getElementById('backToEmailBtn')?.addEventListener('click', () => this.goToStep(1));

        // Step 3: Complete Registration
        document.getElementById('completeRegistrationBtn')?.addEventListener('click', () => this.handleCompleteRegistration());
        document.getElementById('backToVerifyBtn')?.addEventListener('click', () => this.goToStep(2));

        // Code digit inputs - auto-focus next
        this.setupCodeInputs();

        // Password toggle
        this.setupPasswordToggle('toggleFinalPassword', 'finalPassword');
        this.setupPasswordToggle('toggleFinalPasswordConfirm', 'finalPasswordConfirm');
    }

    /**
     * Setup code input auto-focus
     */
    setupCodeInputs() {
        const codeInputs = document.querySelectorAll('.code-digit');
        codeInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                if (e.target.value.length === 1 && index < 5) {
                    codeInputs[index + 1].focus();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && index > 0) {
                    codeInputs[index - 1].focus();
                }
            });
        });
    }

    /**
     * Setup password toggle
     */
    setupPasswordToggle(toggleId, inputId) {
        const toggle = document.getElementById(toggleId);
        const input = document.getElementById(inputId);

        if (!toggle || !input) return;

        toggle.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            toggle.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        });
    }

    /**
     * Go to specific step
     */
    goToStep(step) {
        this.currentStep = step;
        document.querySelectorAll('.verification-step').forEach(el => {
            el.classList.remove('active');
            el.classList.add('hidden');
        });
        document.querySelector(`[data-step="${step}"]`).classList.add('active');
        document.querySelector(`[data-step="${step}"]`).classList.remove('hidden');

        // Update progress
        document.querySelectorAll('.progress-step').forEach((el, index) => {
            if (index < step - 1) {
                el.classList.add('completed');
                el.classList.remove('active');
            } else if (index === step - 1) {
                el.classList.add('active');
                el.classList.remove('completed');
            } else {
                el.classList.remove('active', 'completed');
            }
        });

        document.querySelectorAll('.progress-line').forEach((el, index) => {
            if (index < step - 1) {
                el.classList.add('completed');
            } else {
                el.classList.remove('completed');
            }
        });
    }

    /**
     * Handle send verification code
     */
    async handleSendCode() {
        const emailInput = document.getElementById('verifyEmail');
        const email = emailInput.value.trim();

        if (!email) {
            alert('Please enter your email');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        const btn = document.getElementById('sendCodeBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Sending...</span>';

        const result = await sendVerificationCode(email);

        if (result.success) {
            this.email = email;
            this.goToStep(2);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        } else {
            alert(result.error || 'Failed to send verification code');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    /**
     * Handle verify code
     */
    async handleVerifyCode() {
        const codeInputs = document.querySelectorAll('.code-digit');
        const code = Array.from(codeInputs).map(input => input.value).join('');

        if (code.length !== 6) {
            alert('Please enter the complete 6-digit code');
            return;
        }

        const btn = document.getElementById('verifyCodeBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Verifying...</span>';

        const result = await verifyEmailCode(this.email, code);

        if (result.success) {
            this.verifiedEmail = true;
            this.goToStep(3);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        } else {
            alert(result.error || 'Invalid verification code');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    /**
     * Handle complete registration
     */
    async handleCompleteRegistration() {
        const name = document.getElementById('finalName').value.trim();
        const password = document.getElementById('finalPassword').value;
        const confirmPassword = document.getElementById('finalPasswordConfirm').value;
        const agreeTerms = document.getElementById('finalAgreeTerms').checked;

        if (!name || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (name.length < 2) {
            alert('Name must be at least 2 characters');
            return;
        }

        if (password.length < 4) {
            alert('Password must be at least 4 characters');
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

        if (!this.verifiedEmail) {
            alert('Email not verified');
            return;
        }

        const btn = document.getElementById('completeRegistrationBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Creating Account...</span>';

        const result = await register({ name, email: this.email, password });

        if (result.success) {
            // Redirect to dashboard
            if (window.__SPA_MODE__) {
                const { router } = await import('../../scripts/core/Router.js');
                await router.navigate('/dashboard');
            } else {
                window.location.href = '/views/DashboardPage.html';
            }
        } else {
            alert(result.error || 'Registration failed');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }
}
