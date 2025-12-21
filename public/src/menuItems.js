/**
 * Menu Items Management Page JavaScript
 * Displays and manages menu items for truck owners
 */

let truckId = null;
let menuItems = [];
let currentItemId = null;

$(document).ready(function() {
    // Check authentication
    const user = API.getUser();
    if (!user || user.user_type !== 'owner') {
        window.location.href = '/';
        return;
    }
    
    // Load truck and menu items
    loadTruckAndItems();
    
    // Event handlers
    $(document).on('click', '.view-item-btn', function() {
        viewItem($(this).data('item-id'));
    });
    
    $(document).on('click', '.edit-item-btn', function() {
        editItem($(this).data('item-id'));
    });
    
    $(document).on('click', '.delete-item-btn', function() {
        confirmDelete($(this).data('item-id'));
    });
    
    $('#saveEditBtn').on('click', saveItemChanges);
    $('#confirmDeleteBtn').on('click', deleteItem);
    
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
});

function loadTruckAndItems() {
    $.ajax({
        url: '/api/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                truckId = response.data[0].food_truck_id;
                loadMenuItems();
            }
        }
    });
}

function loadMenuItems() {
    $('#menuItemsBody').html('<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>');
    
    $.ajax({
        url: '/api/menu-items?food_truck_id=' + truckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                menuItems = response.data;
                renderMenuItems();
            } else {
                $('#menuItemsBody').html('<tr><td colspan="7" class="text-center py-5">No menu items found</td></tr>');
            }
        },
        error: function() {
            $('#menuItemsBody').html('<tr><td colspan="7" class="text-center py-5 text-danger">Failed to load menu items</td></tr>');
        }
    });
}

function renderMenuItems() {
    if (!menuItems || menuItems.length === 0) {
        $('#menuItemsBody').html('<tr><td colspan="7" class="text-center py-5">No menu items. <a href="/addMenuItem">Add your first item</a></td></tr>');
        return;
    }
    
    let html = '';
    menuItems.forEach(function(item) {
        const statusClass = item.is_available ? 'bg-success' : 'bg-secondary';
        const statusText = item.is_available ? 'Available' : 'Unavailable';
        
        html += `
            <tr>
                <td>${item.menu_item_id}</td>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td><span class="badge bg-light text-dark">${escapeHtml(item.category || 'Other')}</span></td>
                <td><small class="text-muted">${escapeHtml((item.description || '').substring(0, 50))}${(item.description || '').length > 50 ? '...' : ''}</small></td>
                <td><strong>$${parseFloat(item.price).toFixed(2)}</strong></td>
                <td><span class="badge ${statusClass}">${statusText}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary view-item-btn" data-item-id="${item.menu_item_id}" title="View">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary edit-item-btn" data-item-id="${item.menu_item_id}" title="Edit">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger delete-item-btn" data-item-id="${item.menu_item_id}" title="Delete">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    $('#menuItemsBody').html(html);
}

function viewItem(itemId) {
    $.ajax({
        url: '/api/menu-items/' + itemId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const item = response.data;
                const statusClass = item.is_available ? 'bg-success' : 'bg-secondary';
                
                const html = `
                    <div class="text-center mb-3">
                        ${item.image_url 
                            ? `<img src="${item.image_url}" alt="${escapeHtml(item.name)}" class="img-fluid rounded" style="max-height: 200px;">`
                            : `<div class="bg-light rounded d-flex align-items-center justify-content-center" style="height: 150px;"><i class="bi bi-image" style="font-size: 3rem; color: #dee2e6;"></i></div>`
                        }
                    </div>
                    <h5>${escapeHtml(item.name)}</h5>
                    <p><span class="badge bg-light text-dark">${escapeHtml(item.category || 'Other')}</span> <span class="badge ${statusClass}">${item.is_available ? 'Available' : 'Unavailable'}</span></p>
                    <p class="text-muted">${escapeHtml(item.description || 'No description')}</p>
                    <h4 class="text-success">$${parseFloat(item.price).toFixed(2)}</h4>
                `;
                
                $('#viewItemBody').html(html);
                new bootstrap.Modal('#viewItemModal').show();
            }
        }
    });
}

function editItem(itemId) {
    const item = menuItems.find(i => i.menu_item_id == itemId);
    if (!item) return;
    
    currentItemId = itemId;
    $('#editItemId').val(itemId);
    $('#editItemName').val(item.name);
    $('#editItemCategory').val(item.category || 'Main');
    $('#editItemDescription').val(item.description || '');
    $('#editItemPrice').val(item.price);
    $('#editItemAvailable').prop('checked', item.is_available);
    
    new bootstrap.Modal('#editItemModal').show();
}

function saveItemChanges() {
    const data = {
        name: $('#editItemName').val(),
        category: $('#editItemCategory').val(),
        description: $('#editItemDescription').val(),
        price: parseFloat($('#editItemPrice').val()),
        is_available: $('#editItemAvailable').prop('checked')
    };
    
    $.ajax({
        url: '/api/menu-items/' + currentItemId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify(data),
        success: function(response) {
            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('editItemModal')).hide();
                showToast('Success', 'Menu item updated', 'success');
                loadMenuItems();
            }
        },
        error: function() {
            showToast('Error', 'Failed to update item', 'danger');
        }
    });
}

function confirmDelete(itemId) {
    const item = menuItems.find(i => i.menu_item_id == itemId);
    if (!item) return;
    
    currentItemId = itemId;
    $('#deleteItemName').text(item.name);
    new bootstrap.Modal('#deleteConfirmModal').show();
}

function deleteItem() {
    $.ajax({
        url: '/api/menu-items/' + currentItemId,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal')).hide();
                showToast('Success', 'Menu item deleted', 'success');
                loadMenuItems();
            }
        },
        error: function() {
            showToast('Error', 'Failed to delete item', 'danger');
        }
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(title, message, type) {
    const $header = $('#notificationToast .toast-header');
    $header.removeClass('bg-success bg-danger text-white');
    if (type === 'danger') $header.addClass('bg-danger text-white');
    else if (type === 'success') $header.addClass('bg-success text-white');
    
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    new bootstrap.Toast(document.getElementById('notificationToast')).show();
}
