// PasswordResetForm.js - 3-Step Password Reset Component
import { forgotPassword, resetPassword } from '../../services/AuthService.js';

export class PasswordResetForm {
    constructor() {
        this.currentStep = 1;
        this.email = '';
        this.codeVerified = false;
    }

    /**
     * Get HTML for 3-step password reset form
     */
    getHTML() {
        return `
            <div class="password-reset-form">
                <!-- Progress Indicator -->
                <div class="reset-progress">
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
                        <span class="step-label">Reset</span>
                    </div>
                </div>

                <!-- Step 1: Email Input -->
                <div class="reset-step ${this.currentStep === 1 ? 'active' : 'hidden'}" data-step="1">
                    <div class="step-header">
                        <h3>Reset Your Password</h3>
                        <p>Enter your email to receive a reset code</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="resetEmail">
                            <i>📧</i>
                            <span>Email Address</span>
                        </label>
                        <input
                            type="email"
                            id="resetEmail"
                            class="form-input"
                            placeholder="your@email.com"
                            required
                        >
                    </div>
                    <button type="button" class="reset-btn" id="sendResetCodeBtn">
                        <span>Send Reset Code</span>
                        <i>→</i>
                    </button>
                    <button type="button" class="back-to-login-btn" id="backToLoginFromEmail">
                        ← Back to Login
                    </button>
                </div>

                <!-- Step 2: Code Verification -->
                <div class="reset-step ${this.currentStep === 2 ? 'active' : 'hidden'}" data-step="2">
                    <div class="step-header">
                        <h3>Enter Reset Code</h3>
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
                    <div class="reset-actions">
                        <button type="button" class="reset-btn" id="verifyResetCodeBtn">
                            <span>Continue</span>
                            <i>→</i>
                        </button>
                        <button type="button" class="resend-btn" id="resendResetCodeBtn">
                            Resend Code
                        </button>
                    </div>
                    <button type="button" class="back-btn" id="backToResetEmailBtn">
                        ← Back
                    </button>
                </div>

                <!-- Step 3: New Password -->
                <div class="reset-step ${this.currentStep === 3 ? 'active' : 'hidden'}" data-step="3">
                    <div class="step-header">
                        <h3>Create New Password</h3>
                        <p>Enter your new password</p>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="newPassword">
                            <i>🔐</i>
                            <span>New Password</span>
                        </label>
                        <div class="password-input-container">
                            <input
                                type="password"
                                id="newPassword"
                                class="form-input"
                                placeholder="••••••••"
                                required
                            >
                            <button type="button" class="password-toggle" id="toggleNewPassword">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label" for="confirmNewPassword">
                            <i>🔐</i>
                            <span>Confirm New Password</span>
                        </label>
                        <div class="password-input-container">
                            <input
                                type="password"
                                id="confirmNewPassword"
                                class="form-input"
                                placeholder="••••••••"
                                required
                            >
                            <button type="button" class="password-toggle" id="toggleConfirmNewPassword">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>
                    <button type="button" class="reset-btn" id="completeResetBtn">
                        <span>Reset Password</span>
                        <i>✓</i>
                    </button>
                    <button type="button" class="back-btn" id="backToVerifyResetBtn">
                        ← Back
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get CSS for password reset form
     */
    getCSS() {
        return `
            <style>
                .password-reset-form {
                    width: 100%;
                }

                .reset-progress {
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
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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
                    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
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
                    color: #ef4444;
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
                    background: linear-gradient(to right, #ef4444, #dc2626);
                }

                .reset-step {
                    display: none;
                    animation: fadeIn 0.3s;
                }

                .reset-step.active {
                    display: block;
                }

                .reset-step.hidden {
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
                    border-color: #ef4444;
                    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
                }

                .reset-btn {
                    width: 100%;
                    padding: 16px;
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
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

                .reset-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(239, 68, 68, 0.3);
                }

                .reset-btn:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .reset-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }

                .resend-btn {
                    background: none;
                    border: none;
                    color: #ef4444;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    text-align: center;
                    transition: color 0.3s;
                }

                .resend-btn:hover {
                    color: #dc2626;
                    text-decoration: underline;
                }

                .back-btn, .back-to-login-btn {
                    margin-top: 15px;
                    background: none;
                    border: none;
                    color: #888;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    text-align: center;
                    transition: color 0.3s;
                    width: 100%;
                }

                .back-btn:hover, .back-to-login-btn:hover {
                    color: #ef4444;
                }
            </style>
        `;
    }

    /**
     * Initialize event listeners
     */
    init(onBackToLogin) {
        this.onBackToLogin = onBackToLogin;

        // Step 1: Send Code
        document.getElementById('sendResetCodeBtn')?.addEventListener('click', () => this.handleSendResetCode());
        document.getElementById('backToLoginFromEmail')?.addEventListener('click', () => this.handleBackToLogin());

        // Step 2: Verify Code
        document.getElementById('verifyResetCodeBtn')?.addEventListener('click', () => this.handleVerifyCode());
        document.getElementById('resendResetCodeBtn')?.addEventListener('click', () => this.handleSendResetCode());
        document.getElementById('backToResetEmailBtn')?.addEventListener('click', () => this.goToStep(1));

        // Step 3: Reset Password
        document.getElementById('completeResetBtn')?.addEventListener('click', () => this.handleCompleteReset());
        document.getElementById('backToVerifyResetBtn')?.addEventListener('click', () => this.goToStep(2));

        // Code digit inputs - auto-focus next
        this.setupCodeInputs();

        // Password toggle
        this.setupPasswordToggle('toggleNewPassword', 'newPassword');
        this.setupPasswordToggle('toggleConfirmNewPassword', 'confirmNewPassword');
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
        document.querySelectorAll('.reset-step').forEach(el => {
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
     * Handle back to login
     */
    handleBackToLogin() {
        if (this.onBackToLogin) {
            this.onBackToLogin();
        }
    }

    /**
     * Handle send reset code
     */
    async handleSendResetCode() {
        const emailInput = document.getElementById('resetEmail');
        const email = emailInput.value.trim();

        if (!email) {
            alert('Please enter your email');
            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            alert('Please enter a valid email address');
            return;
        }

        const btn = document.getElementById('sendResetCodeBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Sending...</span>';

        const result = await forgotPassword(email);

        if (result.success) {
            this.email = email;
            this.goToStep(2);
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        } else {
            alert(result.error || 'Failed to send reset code');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }

    /**
     * Handle verify code - just move to step 3
     */
    handleVerifyCode() {
        const codeInputs = document.querySelectorAll('.code-digit');
        const code = Array.from(codeInputs).map(input => input.value).join('');

        if (code.length !== 6) {
            alert('Please enter the complete 6-digit code');
            return;
        }

        // Store code and move to password reset step
        this.resetCode = code;
        this.goToStep(3);
    }

    /**
     * Handle complete password reset
     */
    async handleCompleteReset() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmNewPassword').value;

        if (!newPassword || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (newPassword.length < 4) {
            alert('Password must be at least 4 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        const btn = document.getElementById('completeResetBtn');
        const originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span>Resetting Password...</span>';

        const result = await resetPassword(this.email, this.resetCode, newPassword);

        if (result.success) {
            alert('Password reset successful! You can now login with your new password.');
            // Go back to login
            this.handleBackToLogin();
        } else {
            alert(result.error || 'Password reset failed');
            btn.disabled = false;
            btn.innerHTML = originalHTML;
        }
    }
}
