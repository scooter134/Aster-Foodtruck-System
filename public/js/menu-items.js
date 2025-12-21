/**
 * Menu Items Management - jQuery
 */

const API_BASE_URL = '/api';
let currentTruckId = null;
let menuItems = [];

$(document).ready(function() {
    const user = API.getUser();
    if (!user || user.user_type !== 'owner') {
        window.location.href = '/login';
        return;
    }
    
    loadFoodTruck();
    bindEventHandlers();
    
    $('#logoutBtn').on('click', () => API.logout());
});

function bindEventHandlers() {
    // Edit form submit
    $('#editItemForm').on('submit', function(e) {
        e.preventDefault();
        saveEditItem();
    });
    
    // Save edit button click
    $('#saveEditBtn').on('click', function() {
        saveEditItem();
    });
    
    // Delete confirmation
    $('#confirmDeleteBtn').on('click', deleteItem);
}

function loadFoodTruck() {
    const user = API.getUser();
    if (!user) return;
    
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
                            loadMenuItems();
                        } else {
                            showEmptyState('No food truck found. <a href="/create-truck">Create one first</a>.');
                        }
                    }
                });
            }
        },
        error: function() {
            // Fallback
            $.ajax({
                url: API_BASE_URL + '/food-trucks',
                method: 'GET',
                success: function(response) {
                    if (response.success && response.data && response.data.length > 0) {
                        currentTruckId = response.data[0].food_truck_id;
                        loadMenuItems();
                    } else {
                        showEmptyState('No food truck found.');
                    }
                }
            });
        }
    });
}

function loadMenuItems() {
    $.ajax({
        url: API_BASE_URL + '/menu-items?food_truck_id=' + currentTruckId,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                menuItems = response.data;
                renderMenuItems(response.data);
            }
        },
        error: function() {
            showEmptyState('Failed to load menu items.');
        }
    });
}

function renderMenuItems(items) {
    if (!items || items.length === 0) {
        showEmptyState('No menu items yet. <a href="/addMenuItem">Add your first item</a>.');
        return;
    }
    
    let html = '';
    items.forEach(function(item) {
        const statusBadge = item.is_available 
            ? '<span class="badge bg-success">Available</span>' 
            : '<span class="badge bg-secondary">Unavailable</span>';
        
        html += `
            <tr>
                <td>${item.menu_item_id}</td>
                <td><strong>${item.name}</strong></td>
                <td><span class="badge bg-info">${item.category || 'N/A'}</span></td>
                <td class="text-muted">${item.description ? item.description.substring(0, 50) + '...' : '-'}</td>
                <td class="fw-bold text-success">$${parseFloat(item.price).toFixed(2)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewItem(${item.menu_item_id})" title="View">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editItem(${item.menu_item_id})" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="confirmDelete(${item.menu_item_id}, '${item.name.replace(/'/g, "\\'")}')">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    $('#menuItemsBody').html(html);
}

function showEmptyState(message) {
    $('#menuItemsBody').html(`
        <tr>
            <td colspan="7" class="text-center py-5">
                <i class="bi bi-inbox" style="font-size: 3rem; color: #dee2e6;"></i>
                <p class="mt-2 text-muted">${message}</p>
            </td>
        </tr>
    `);
}

function viewItem(id) {
    const item = menuItems.find(i => i.menu_item_id === id);
    if (!item) return;
    
    const statusBadge = item.is_available 
        ? '<span class="badge bg-success">Available</span>' 
        : '<span class="badge bg-secondary">Unavailable</span>';
    
    $('#viewItemBody').html(`
        <div class="text-center mb-3">
            ${item.image_url ? `<img src="${item.image_url}" class="img-fluid rounded mb-3" style="max-height: 200px;">` : '<i class="bi bi-image" style="font-size: 4rem; color: #dee2e6;"></i>'}
        </div>
        <h4>${item.name}</h4>
        <p class="text-muted">${item.description || 'No description'}</p>
        <hr>
        <div class="row">
            <div class="col-6">
                <strong>Category:</strong><br>
                <span class="badge bg-info">${item.category || 'N/A'}</span>
            </div>
            <div class="col-6">
                <strong>Price:</strong><br>
                <span class="fs-4 text-success">$${parseFloat(item.price).toFixed(2)}</span>
            </div>
        </div>
        <div class="mt-3">
            <strong>Status:</strong> ${statusBadge}
        </div>
    `);
    
    new bootstrap.Modal('#viewItemModal').show();
}

function editItem(id) {
    const item = menuItems.find(i => i.menu_item_id === id);
    if (!item) return;
    
    $('#editItemId').val(item.menu_item_id);
    $('#editItemName').val(item.name);
    $('#editItemCategory').val(item.category || 'Main');
    $('#editItemDescription').val(item.description || '');
    $('#editItemPrice').val(item.price);
    $('#editItemAvailable').prop('checked', item.is_available);
    
    new bootstrap.Modal('#editItemModal').show();
}

function saveEditItem() {
    const id = $('#editItemId').val();
    const data = {
        name: $('#editItemName').val(),
        category: $('#editItemCategory').val(),
        description: $('#editItemDescription').val(),
        price: parseFloat($('#editItemPrice').val()),
        is_available: $('#editItemAvailable').prop('checked')
    };
    
    $.ajax({
        url: API_BASE_URL + '/menu-items/' + id,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('editItemModal')).hide();
                showToast('Success', 'Menu item updated!');
                loadMenuItems();
            }
        },
        error: function(xhr) {
            showToast('Error', xhr.responseJSON?.error || 'Failed to update item', 'danger');
        }
    });
}

let deleteItemId = null;

function confirmDelete(id, name) {
    deleteItemId = id;
    $('#deleteItemName').text(name);
    new bootstrap.Modal('#deleteConfirmModal').show();
}

function deleteItem() {
    if (!deleteItemId) return;
    
    $.ajax({
        url: API_BASE_URL + '/menu-items/' + deleteItemId,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
                showToast('Deleted', 'Menu item removed');
                loadMenuItems();
            }
        },
        error: function() {
            showToast('Error', 'Failed to delete item', 'danger');
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
    } else {
        toastHeader.classList.add('bg-success', 'text-white');
    }
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
