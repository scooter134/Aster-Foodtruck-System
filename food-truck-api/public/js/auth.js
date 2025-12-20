// Utility Functions
function showError(fieldId, message) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`);
    
    if (input && errorElement) {
        input.classList.add('input-error');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideError(fieldId) {
    const input = document.getElementById(fieldId);
    const errorElement = document.getElementById(`${fieldId}Error`);
    
    if (input && errorElement) {
        input.classList.remove('input-error');
        errorElement.style.display = 'none';
    }
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Password Strength Indicator
function updatePasswordStrength(password) {
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthBar || !strengthText) return;
    
    // Reset
    strengthBar.className = 'password-strength mt-1';
    
    if (!password) {
        strengthBar.style.width = '0%';
        strengthText.textContent = '';
        return;
    }
    
    // Calculate strength
    let strength = 0;
    const strengthTexts = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    
    // Length check
    if (password.length >= 8) strength++;
    // Has lowercase
    if (/[a-z]/.test(password)) strength++;
    // Has uppercase
    if (/[A-Z]/.test(password)) strength++;
    // Has numbers
    if (/[0-9]/.test(password)) strength++;
    // Has special chars
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    // Cap at 4 for our CSS classes
    strength = Math.min(strength, 4);
    
    // Update UI
    strengthBar.className = `password-strength mt-1 strength-${strength}`;
    strengthText.textContent = strengthTexts[strength];
    
    // Update text color based on strength
    const colors = ['text-red-600', 'text-orange-500', 'text-yellow-500', 'text-blue-500', 'text-green-600'];
    strengthText.className = colors[strength];
}

// Registration Form
function initRegistrationForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;

    // Password strength
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }

    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            const email = e.target.value.trim();
            if (!email) {
                showError('email', 'Email is required');
            } else if (!validateEmail(email)) {
                showError('email', 'Please enter a valid email address');
            } else {
                hideError('email');
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error states
        document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
        document.querySelectorAll('input').forEach(input => input.classList.remove('input-error'));
        
        const formError = document.getElementById('formError');
        if (formError) formError.classList.add('hidden');

        // Get form data
        const name = document.getElementById('name')?.value.trim();
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('confirmPassword')?.value;
        const birthDate = document.getElementById('birthDate')?.value;
        const userType = document.querySelector('input[name="userType"]:checked')?.value;
        const terms = document.getElementById('terms')?.checked;

        // Validation
        let isValid = true;

        if (!name) {
            showError('name', 'Name is required');
            isValid = false;
        }

        if (!email) {
            showError('email', 'Email is required');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        }

        if (!password) {
            showError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError('password', 'Password must be at least 6 characters');
            isValid = false;
        }

        if (password !== confirmPassword) {
            showError('confirmPassword', 'Passwords do not match');
            isValid = false;
        }

        if (!birthDate) {
            showError('birthDate', 'Date of birth is required');
            isValid = false;
        } else {
            const birthDateObj = new Date(birthDate);
            const today = new Date();
            const minAgeDate = new Date();
            minAgeDate.setFullYear(today.getFullYear() - 13);
            
            if (birthDateObj > minAgeDate) {
                showError('birthDate', 'You must be at least 13 years old');
                isValid = false;
            }
        }

        if (!terms) {
            showError('terms', 'You must agree to the terms and conditions');
            isValid = false;
        }

        if (!isValid) return;

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        try {
            const response = await fetch('/api/v1/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email,
                    password,
                    birthDate,
                    userType
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // Redirect to login on success
            window.location.href = '/login?registered=true';

        } catch (error) {
            console.error('Registration error:', error);
            if (formError) {
                formError.textContent = error.message || 'An error occurred during registration. Please try again.';
                formError.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
}

// Login Form
function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    // Email validation
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', (e) => {
            const email = e.target.value.trim();
            if (!email) {
                showError('email', 'Email is required');
            } else if (!validateEmail(email)) {
                showError('email', 'Please enter a valid email address');
            } else {
                hideError('email');
            }
        });
    }

    // Password validation
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            const password = e.target.value;
            if (!password) {
                showError('password', 'Password is required');
            } else if (password.length < 6) {
                showError('password', 'Password must be at least 6 characters');
            } else {
                hideError('password');
            }
        });
    }

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Reset error states
        document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
        document.querySelectorAll('input').forEach(input => input.classList.remove('input-error'));
        
        const formError = document.getElementById('formError');
        if (formError) formError.classList.add('hidden');

        // Get form data
        const email = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        const remember = document.getElementById('remember')?.checked;

        // Validation
        let isValid = true;

        if (!email) {
            showError('email', 'Email is required');
            isValid = false;
        } else if (!validateEmail(email)) {
            showError('email', 'Please enter a valid email address');
            isValid = false;
        }

        if (!password) {
            showError('password', 'Password is required');
            isValid = false;
        } else if (password.length < 6) {
            showError('password', 'Password must be at least 6 characters');
            isValid = false;
        }

        if (!isValid) return;

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';

        try {
            const response = await fetch('/api/v1/user/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, remember })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            // Redirect to dashboard on success
            window.location.href = '/dashboard';

        } catch (error) {
            console.error('Login error:', error);
            if (formError) {
                formError.textContent = error.message || 'An error occurred during login. Please try again.';
                formError.classList.remove('hidden');
            }
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
}

// Initialize forms when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initRegistrationForm();
    initLoginForm();
});
