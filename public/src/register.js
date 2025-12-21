/**
 * Register Page JavaScript
 * Handles user registration
 */

$(document).ready(function() {
    // Check if already logged in
    if (API.isAuthenticated()) {
        window.location.href = '/dashboard';
        return;
    }

    // Form submission
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        
        // Clear previous errors
        $('.error-message').text('').hide();
        $('#formError').text('').hide();
        
        const name = $('#name').val().trim();
        const email = $('#email').val().trim();
        const password = $('#password').val();
        const birthDate = $('#birthDate').val();
        
        // Validate
        let isValid = true;
        
        if (!name) {
            $('#nameError').text('Name is required').show();
            isValid = false;
        }
        
        if (!email) {
            $('#emailError').text('Email is required').show();
            isValid = false;
        } else if (!isValidEmail(email)) {
            $('#emailError').text('Please enter a valid email').show();
            isValid = false;
        }
        
        if (!password) {
            $('#passwordError').text('Password is required').show();
            isValid = false;
        } else if (password.length < 6) {
            $('#passwordError').text('Password must be at least 6 characters').show();
            isValid = false;
        }
        
        if (!birthDate) {
            $('#birthDateError').text('Birth date is required').show();
            isValid = false;
        }
        
        if (!isValid) return;
        
        // Disable button and show loading
        const $btn = $('#registerBtn');
        const originalText = $btn.html();
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Creating account...');
        
        // Split name into first and last
        const nameParts = name.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || '';
        
        // Make API call
        $.ajax({
            url: '/api/users/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                email: email,
                password: password,
                first_name: firstName,
                last_name: lastName,
                birth_date: birthDate,
                user_type: 'customer'
            }),
            success: function(response) {
                if (response.success) {
                    // Show success and redirect
                    showToast('Success', 'Account created successfully! Redirecting to login...', 'success');
                    setTimeout(function() {
                        window.location.href = '/';
                    }, 1500);
                } else {
                    $('#formError').text(response.error || 'Registration failed').show();
                    $btn.prop('disabled', false).html(originalText);
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.error || 'Registration failed. Please try again.';
                $('#formError').text(error).show();
                $btn.prop('disabled', false).html(originalText);
            }
        });
    });
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showToast(title, message, type) {
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    toast.show();
}
