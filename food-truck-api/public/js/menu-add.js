/**
 * Add Menu Item - Frontend JavaScript
 */

const API_BASE_URL = '/api';
let currentTruckId = null;

$(document).ready(function() {
    loadFoodTrucks();
    bindEventHandlers();
});

function bindEventHandlers() {
    $('#addMenuForm').on('submit', function(e) {
        e.preventDefault();
        addMenuItem();
    });
}

function loadFoodTrucks() {
    $.ajax({
        url: API_BASE_URL + '/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                currentTruckId = response.data[0].food_truck_id;
            } else {
                showToast('Warning', 'No food truck found. Please create one first.', 'warning');
            }
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
        is_available: $('#itemAvailable').prop('checked')
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
                    window.location.href = '/menu';
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
