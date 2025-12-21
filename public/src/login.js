/**
 * Login Page JavaScript
 * Handles user authentication
 */

$(document).ready(function() {
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

    // Form submission
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        
        // Clear previous errors
        $('#emailError').text('').hide();
        $('#passwordError').text('').hide();
        $('#formError').text('').hide();
        
        const email = $('#email').val().trim();
        const password = $('#password').val();
        
        // Validate
        let isValid = true;
        
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
        }
        
        if (!isValid) return;
        
        // Disable button and show loading
        const $btn = $('#loginBtn');
        const originalText = $btn.html();
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-2"></span>Signing in...');
        
        // Make API call
        $.ajax({
            url: '/api/users/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, password: password }),
            success: function(response) {
                if (response.success) {
                    // Store auth data
                    localStorage.setItem('authToken', response.data.token);
                    localStorage.setItem('user', JSON.stringify(response.data.user));
                    
                    // Redirect based on user type
                    if (response.data.user.user_type === 'owner') {
                        window.location.href = '/ownerDashboard';
                    } else {
                        window.location.href = '/dashboard';
                    }
                } else {
                    $('#formError').text(response.error || 'Login failed').show();
                    $btn.prop('disabled', false).html(originalText);
                }
            },
            error: function(xhr) {
                const error = xhr.responseJSON?.error || 'Login failed. Please check your credentials.';
                $('#formError').text(error).show();
                $btn.prop('disabled', false).html(originalText);
            }
        });
    });
});

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
