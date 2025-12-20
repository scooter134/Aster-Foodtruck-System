/**
 * Menu Management - Frontend JavaScript
 */

const API_BASE_URL = '/api';
let currentTruckId = null;
let allMenuItems = [];
let currentCategory = 'all';
let currentEditItemId = null;

$(document).ready(function() {
    loadFoodTrucks();
    bindEventHandlers();
});

function bindEventHandlers() {
    // Category filter
    $('#categoryTabs .nav-link').on('click', function(e) {
        e.preventDefault();
        currentCategory = $(this).data('category');
        $('#categoryTabs .nav-link').removeClass('active');
        $(this).addClass('active');
        filterMenuItems();
    });

    // Search
    $('#searchMenu').on('input', function() {
        filterMenuItems();
    });

    // Edit item click
    $(document).on('click', '.edit-menu-btn', function() {
        const itemId = $(this).data('item-id');
        openEditModal(itemId);
    });

    // Toggle availability
    $(document).on('click', '.toggle-availability-btn', function() {
        const itemId = $(this).data('item-id');
        const isAvailable = $(this).data('available');
        toggleAvailability(itemId, !isAvailable);
    });

    // Save item changes
    $('#saveItemBtn').on('click', saveItemChanges);

    // Delete item
    $('#deleteItemBtn').on('click', deleteItem);
}

function loadFoodTrucks() {
    $.ajax({
        url: API_BASE_URL + '/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                currentTruckId = response.data[0].food_truck_id;
                loadMenuItems();
            }
        }
    });
}

function loadMenuItems() {
    $.ajax({
        url: API_BASE_URL + '/menu-items?food_truck_id=' + currentTruckId,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                allMenuItems = response.data || [];
                filterMenuItems();
            }
        },
        error: function() {
            $('#menuItemsGrid').html('<div class="col-12 text-center py-5"><p class="text-danger">Failed to load menu items</p></div>');
        }
    });
}

function filterMenuItems() {
    const searchTerm = $('#searchMenu').val().toLowerCase();
    let filtered = allMenuItems;

    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => item.category === currentCategory);
    }

    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchTerm) || 
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }

    renderMenuItems(filtered);
}

function renderMenuItems(items) {
    if (!items || items.length === 0) {
        $('#menuItemsGrid').html('<div class="col-12 text-center py-5"><div class="empty-state"><i class="bi bi-list-ul"></i><h5>No menu items found</h5><p>Add your first menu item to get started</p></div></div>');
        return;
    }

    let html = '';
    items.forEach(function(item) {
        html += '<div class="col-md-4 col-lg-3 mb-4">' +
            '<div class="card h-100 menu-item-card ' + (!item.is_available ? 'unavailable' : '') + '">' +
            '<div class="card-body">' +
            '<div class="d-flex justify-content-between align-items-start mb-2">' +
            '<h5 class="card-title mb-0">' + item.name + '</h5>' +
            '<span class="badge ' + (item.is_available ? 'bg-success' : 'bg-secondary') + '">' + (item.is_available ? 'Available' : 'Unavailable') + '</span>' +
            '</div>' +
            '<p class="text-muted small mb-2">' + (item.description || 'No description') + '</p>' +
            '<div class="d-flex justify-content-between align-items-center">' +
            '<span class="h5 text-success mb-0">$' + parseFloat(item.price).toFixed(2) + '</span>' +
            '<span class="badge bg-light text-dark">' + (item.category || 'Uncategorized') + '</span>' +
            '</div>' +
            '</div>' +
            '<div class="card-footer bg-white border-top-0">' +
            '<div class="btn-group w-100">' +
            '<button class="btn btn-sm btn-outline-primary edit-menu-btn" data-item-id="' + item.menu_item_id + '"><i class="bi bi-pencil"></i> Edit</button>' +
            '<button class="btn btn-sm ' + (item.is_available ? 'btn-outline-warning' : 'btn-outline-success') + ' toggle-availability-btn" data-item-id="' + item.menu_item_id + '" data-available="' + item.is_available + '">' +
            '<i class="bi ' + (item.is_available ? 'bi-eye-slash' : 'bi-eye') + '"></i> ' + (item.is_available ? 'Hide' : 'Show') +
            '</button>' +
            '</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    });

    $('#menuItemsGrid').html(html);
}

function openEditModal(itemId) {
    const item = allMenuItems.find(i => i.menu_item_id === itemId);
    if (!item) return;

    currentEditItemId = itemId;
    $('#editItemId').val(itemId);
    $('#editItemName').val(item.name);
    $('#editItemDescription').val(item.description || '');
    $('#editItemPrice').val(item.price);
    $('#editItemCategory').val(item.category || 'Main');
    $('#editItemAvailable').prop('checked', item.is_available);

    new bootstrap.Modal('#editMenuModal').show();
}

function saveItemChanges() {
    const data = {
        name: $('#editItemName').val(),
        description: $('#editItemDescription').val(),
        price: parseFloat($('#editItemPrice').val()),
        category: $('#editItemCategory').val(),
        is_available: $('#editItemAvailable').prop('checked')
    };

    $.ajax({
        url: API_BASE_URL + '/menu-items/' + currentEditItemId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success) {
                showToast('Success', 'Menu item updated');
                bootstrap.Modal.getInstance(document.getElementById('editMenuModal')).hide();
                loadMenuItems();
            }
        },
        error: function() {
            showToast('Error', 'Failed to update item', 'danger');
        }
    });
}

function deleteItem() {
    if (!confirm('Are you sure you want to delete this item?')) return;

    $.ajax({
        url: API_BASE_URL + '/menu-items/' + currentEditItemId,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                showToast('Success', 'Menu item deleted');
                bootstrap.Modal.getInstance(document.getElementById('editMenuModal')).hide();
                loadMenuItems();
            }
        },
        error: function() {
            showToast('Error', 'Failed to delete item', 'danger');
        }
    });
}

function toggleAvailability(itemId, isAvailable) {
    $.ajax({
        url: API_BASE_URL + '/menu-items/' + itemId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ is_available: isAvailable }),
        success: function(response) {
            if (response.success) {
                showToast('Success', isAvailable ? 'Item is now available' : 'Item is now hidden');
                loadMenuItems();
            }
        },
        error: function() {
            showToast('Error', 'Failed to update availability', 'danger');
        }
    });
}

function showToast(title, message, type) {
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    toast.show();
}
