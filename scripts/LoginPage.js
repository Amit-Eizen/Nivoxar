// LoginPage.js - Clean Version

document.addEventListener('DOMContentLoaded', function() {
    
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
    
    // Form submissions
    document.getElementById('loginFormElement')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe')?.checked || false;
        
        if (!email || !password) {
            alert('Please fill in all fields');
            return;
        }
        
        if (!isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Signing In...</span>';
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Login successful! (Connect to backend)');
        } catch (error) {
            alert('An error occurred. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    });
    
    document.getElementById('registerFormElement')?.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('registerName')?.value.trim();
        const email = document.getElementById('registerEmail')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;
        const confirmPassword = document.getElementById('registerPasswordConfirm')?.value;
        const agreeTerms = document.getElementById('agreeTerms')?.checked;
        
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
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalHTML = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Creating Account...</span>';
        
        try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            alert('Registration successful! (Connect to backend)');
        } catch (error) {
            alert('An error occurred. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalHTML;
        }
    });
    
    // Initial state
    showLoginForm();
});