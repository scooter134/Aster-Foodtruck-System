/**
 * Add Menu Item Page JavaScript
 * Handles creating new menu items
 */

let truckId = null;

$(document).ready(function() {
    // Check authentication
    const user = API.getUser();
    if (!user || user.user_type !== 'owner') {
        window.location.href = '/';
        return;
    }
    
    // Load truck ID
    loadTruckId();
    
    // Form submission
    $('#addMenuItemForm').on('submit', function(e) {
        e.preventDefault();
        addMenuItem();
    });
    
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
});

function loadTruckId() {
    $.ajax({
        url: '/api/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                truckId = response.data[0].food_truck_id;
            } else {
                showToast('Warning', 'No food truck found. Please create one first.', 'warning');
            }
        }
    });
}

function addMenuItem() {
    // Validate
    const name = $('#itemName').val().trim();
    const category = $('#itemCategory').val();
    const price = parseFloat($('#itemPrice').val());
    
    if (!name) {
        showToast('Error', 'Item name is required', 'danger');
        return;
    }
    
    if (!category) {
        showToast('Error', 'Please select a category', 'danger');
        return;
    }
    
    if (isNaN(price) || price <= 0) {
        showToast('Error', 'Please enter a valid price', 'danger');
        return;
    }
    
    if (!truckId) {
        showToast('Error', 'No food truck found', 'danger');
        return;
    }
    
    // Disable button
    const $btn = $('#submitBtn');
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Adding...');
    
    const data = {
        food_truck_id: truckId,
        name: name,
        category: category,
        description: $('#itemDescription').val().trim(),
        price: price,
        is_available: true
    };
    
    $.ajax({
        url: '/api/menu-items',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success) {
                showToast('Success', 'Menu item added successfully!', 'success');
                setTimeout(function() {
                    window.location.href = '/menuItems';
                }, 1500);
            } else {
                $btn.prop('disabled', false).html('<i class="bi bi-check-lg"></i> Add Menu Item');
                showToast('Error', response.error || 'Failed to add item', 'danger');
            }
        },
        error: function(xhr) {
            $btn.prop('disabled', false).html('<i class="bi bi-check-lg"></i> Add Menu Item');
            showToast('Error', xhr.responseJSON?.error || 'Failed to add item', 'danger');
        }
    });
}

function showToast(title, message, type) {
    const $header = $('#notificationToast .toast-header');
    $header.removeClass('bg-success bg-danger bg-warning text-white');
    
    if (type === 'danger') $header.addClass('bg-danger text-white');
    else if (type === 'success') $header.addClass('bg-success text-white');
    else if (type === 'warning') $header.addClass('bg-warning');
    
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    new bootstrap.Toast(document.getElementById('notificationToast')).show();
}
