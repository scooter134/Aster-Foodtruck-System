/**
 * Authentication Module for Food Truck System
 * Handles login and registration functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Check if already logged in
    if (API.isAuthenticated()) {
        const user = API.getUser();
        if (user && user.user_type === 'owner') {
            window.location.href = '/ownerDashboard';
        } else {
            window.location.href = '/dashboard';
        }
        return;
    }

    // ============================================
    // Login Form Handler
    // ============================================
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        initLoginForm();
    }

    // ============================================
    // Register Form Handler
    // ============================================
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        initRegisterForm();
    }
});

// ============================================
// Login Form Initialization
// ============================================
function initLoginForm() {
    const form = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const formError = document.getElementById('formError');

    // Real-time validation
    emailInput.addEventListener('blur', () => validateEmail(emailInput, emailError));
    passwordInput.addEventListener('blur', () => validatePassword(passwordInput, passwordError));

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        hideError(formError);
        
        // Validate
        const isEmailValid = validateEmail(emailInput, emailError);
        const isPasswordValid = validatePassword(passwordInput, passwordError);
        
        if (!isEmailValid || !isPasswordValid) {
            return;
        }

        // Disable button and show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Signing in...';

        try {
            const response = await API.auth.login(emailInput.value.trim(), passwordInput.value);
            
            if (response.success) {
                // Redirect based on user type
                const user = response.data.user;
                if (user.user_type === 'owner') {
                    window.location.href = '/ownerDashboard';
                } else {
                    window.location.href = '/dashboard';
                }
            } else {
                showError(formError, response.error || 'Login failed. Please try again.');
            }
        } catch (error) {
            showError(formError, error.message || 'Login failed. Please check your credentials.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// ============================================
// Register Form Initialization
// ============================================
function initRegisterForm() {
    const form = document.getElementById('registerForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const birthDateInput = document.getElementById('birthDate');
    const termsCheckbox = document.getElementById('terms');
    
    const nameError = document.getElementById('nameError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const confirmPasswordError = document.getElementById('confirmPasswordError');
    const birthDateError = document.getElementById('birthDateError');
    const termsError = document.getElementById('termsError');
    const formError = document.getElementById('formError');
    
    const passwordStrength = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('strengthText');

    // Set max date for birth date (must be at least 13 years old)
    const today = new Date();
    const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
    birthDateInput.max = minAge.toISOString().split('T')[0];

    // Real-time validation
    nameInput.addEventListener('blur', () => validateName(nameInput, nameError));
    emailInput.addEventListener('blur', () => validateEmail(emailInput, emailError));
    passwordInput.addEventListener('input', () => {
        validatePassword(passwordInput, passwordError);
        updatePasswordStrength(passwordInput.value, passwordStrength, strengthText);
    });
    confirmPasswordInput.addEventListener('blur', () => 
        validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordError)
    );
    birthDateInput.addEventListener('blur', () => validateBirthDate(birthDateInput, birthDateError));

    // Role selection visual feedback
    const roleInputs = document.querySelectorAll('input[name="userType"]');
    roleInputs.forEach(input => {
        input.addEventListener('change', function() {
            // Reset all labels
            document.querySelectorAll('input[name="userType"] + label').forEach(label => {
                label.classList.remove('border-blue-500', 'ring-2', 'ring-blue-200', 'bg-blue-50');
                label.classList.add('border-gray-300');
            });
            // Highlight selected
            if (this.checked) {
                const label = this.nextElementSibling;
                label.classList.remove('border-gray-300');
                label.classList.add('border-blue-500', 'ring-2', 'ring-blue-200', 'bg-blue-50');
            }
        });
        // Trigger for initially checked
        if (input.checked) {
            input.dispatchEvent(new Event('change'));
        }
    });

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Clear previous errors
        hideError(formError);
        
        // Validate all fields
        const isNameValid = validateName(nameInput, nameError);
        const isEmailValid = validateEmail(emailInput, emailError);
        const isPasswordValid = validatePassword(passwordInput, passwordError);
        const isConfirmValid = validateConfirmPassword(passwordInput, confirmPasswordInput, confirmPasswordError);
        const isBirthDateValid = validateBirthDate(birthDateInput, birthDateError);
        const isTermsAccepted = validateTerms(termsCheckbox, termsError);
        
        if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmValid || !isBirthDateValid || !isTermsAccepted) {
            return;
        }

        // Get selected role
        const userType = document.querySelector('input[name="userType"]:checked')?.value || 'customer';

        // Disable button and show loading
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating account...';

        try {
            // Parse name into first and last name
            const nameParts = nameInput.value.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || nameParts[0];

            const response = await API.auth.register({
                email: emailInput.value.trim(),
                password: passwordInput.value,
                first_name: firstName,
                last_name: lastName,
                user_type: userType
            });
            
            if (response.success) {
                // Redirect based on user type
                const user = response.data.user;
                if (user.user_type === 'owner') {
                    window.location.href = '/ownerDashboard';
                } else {
                    window.location.href = '/dashboard';
                }
            } else {
                showError(formError, response.error || 'Registration failed. Please try again.');
            }
        } catch (error) {
            showError(formError, error.message || 'Registration failed. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}

// ============================================
// Validation Functions
// ============================================
function validateName(input, errorEl) {
    const value = input.value.trim();
    if (!value) {
        showFieldError(input, errorEl, 'Name is required');
        return false;
    }
    if (value.length < 2) {
        showFieldError(input, errorEl, 'Name must be at least 2 characters');
        return false;
    }
    hideFieldError(input, errorEl);
    return true;
}

function validateEmail(input, errorEl) {
    const value = input.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!value) {
        showFieldError(input, errorEl, 'Email is required');
        return false;
    }
    if (!emailRegex.test(value)) {
        showFieldError(input, errorEl, 'Please enter a valid email address');
        return false;
    }
    hideFieldError(input, errorEl);
    return true;
}

function validatePassword(input, errorEl) {
    const value = input.value;
    
    if (!value) {
        showFieldError(input, errorEl, 'Password is required');
        return false;
    }
    if (value.length < 6) {
        showFieldError(input, errorEl, 'Password must be at least 6 characters');
        return false;
    }
    hideFieldError(input, errorEl);
    return true;
}

function validateConfirmPassword(passwordInput, confirmInput, errorEl) {
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    
    if (!confirm) {
        showFieldError(confirmInput, errorEl, 'Please confirm your password');
        return false;
    }
    if (password !== confirm) {
        showFieldError(confirmInput, errorEl, 'Passwords do not match');
        return false;
    }
    hideFieldError(confirmInput, errorEl);
    return true;
}

function validateBirthDate(input, errorEl) {
    const value = input.value;
    
    if (!value) {
        showFieldError(input, errorEl, 'Date of birth is required');
        return false;
    }
    
    const birthDate = new Date(value);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    
    if (age < 13) {
        showFieldError(input, errorEl, 'You must be at least 13 years old');
        return false;
    }
    
    hideFieldError(input, errorEl);
    return true;
}

function validateTerms(checkbox, errorEl) {
    if (!checkbox.checked) {
        errorEl.style.display = 'block';
        return false;
    }
    errorEl.style.display = 'none';
    return true;
}

// ============================================
// Password Strength Indicator
// ============================================
function updatePasswordStrength(password, strengthBar, strengthText) {
    let strength = 0;
    
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;
    
    // Cap at 4 for display
    strength = Math.min(strength, 4);
    
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    
    if (strengthBar) {
        strengthBar.className = 'password-strength';
        if (password.length > 0) {
            strengthBar.classList.add(`strength-${strength}`);
        }
    }
    
    if (strengthText) {
        strengthText.textContent = password.length > 0 ? strengthLabels[strength] : 'Very Weak';
    }
}

// ============================================
// Error Display Helpers
// ============================================
function showFieldError(input, errorEl, message) {
    input.classList.add('input-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function hideFieldError(input, errorEl) {
    input.classList.remove('input-error');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function showError(errorEl, message) {
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
        errorEl.style.display = 'block';
    }
}

function hideError(errorEl) {
    if (errorEl) {
        errorEl.classList.add('hidden');
        errorEl.style.display = 'none';
    }
}
