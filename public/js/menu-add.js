/**
 * Add Menu Item - Frontend JavaScript
 */

const API_BASE_URL = '/api';
let currentTruckId = null;

$(document).ready(function() {
    // Check if user is authenticated owner
    const user = API.getUser();
    if (!user || user.user_type !== 'owner') {
        window.location.href = '/login';
        return;
    }
    
    loadFoodTrucks();
    bindEventHandlers();
    
    // Setup logout handler
    $('#logoutBtn, .logout-btn').on('click', function() {
        API.logout();
    });
});

function bindEventHandlers() {
    $('#addMenuItemForm').on('submit', function(e) {
        e.preventDefault();
        addMenuItem();
    });
}

function loadFoodTrucks() {
    const user = API.getUser();
    if (!user) return;
    
    // Get owner ID first, then get their food truck
    $.ajax({
        url: API_BASE_URL + '/owners/user/' + user.user_id,
        method: 'GET',
        success: function(ownerResponse) {
            if (ownerResponse.success && ownerResponse.data) {
                const ownerId = ownerResponse.data.owner_id;
                $.ajax({
                    url: API_BASE_URL + '/food-trucks?owner_id=' + ownerId,
                    method: 'GET',
                    success: function(response) {
                        if (response.success && response.data && response.data.length > 0) {
                            currentTruckId = response.data[0].food_truck_id;
                        } else {
                            showToast('Warning', 'No food truck found. Please create one first.', 'warning');
                            setTimeout(() => window.location.href = '/create-truck', 2000);
                        }
                    }
                });
            }
        },
        error: function() {
            // Fallback: get any truck
            $.ajax({
                url: API_BASE_URL + '/food-trucks',
                method: 'GET',
                success: function(response) {
                    if (response.success && response.data && response.data.length > 0) {
                        currentTruckId = response.data[0].food_truck_id;
                    } else {
                        showToast('Warning', 'No food truck found.', 'warning');
                    }
                }
            });
        }
    });
}

function addMenuItem() {
    if (!currentTruckId) {
        showToast('Error', 'No food truck selected', 'danger');
        return;
    }

    const data = {
        food_truck_id: currentTruckId,
        name: $('#itemName').val(),
        description: $('#itemDescription').val(),
        price: parseFloat($('#itemPrice').val()),
        category: $('#itemCategory').val(),
        preparation_time: parseInt($('#itemPrepTime').val()) || 15,
        image_url: $('#itemImageUrl').val() || null,
        is_available: $('#itemAvailable').length ? $('#itemAvailable').prop('checked') : true  // Default to available
    };

    $.ajax({
        url: API_BASE_URL + '/menu-items',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success) {
                showToast('Success', 'Menu item added successfully!');
                setTimeout(function() {
                    window.location.href = '/menuItems';
                }, 1500);
            }
        },
        error: function(xhr) {
            const error = xhr.responseJSON?.error || 'Failed to add menu item';
            showToast('Error', error, 'danger');
        }
    });
}

function showToast(title, message, type) {
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    
    const toastEl = document.getElementById('notificationToast');
    const toastHeader = toastEl.querySelector('.toast-header');
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'text-white');
    
    if (type === 'danger') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastHeader.classList.add('bg-warning');
    } else {
        toastHeader.classList.add('bg-success', 'text-white');
    }
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
