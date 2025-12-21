/**
 * Truck Menu Page JavaScript
 * Displays menu items for a specific truck
 */

let truckId = null;
let allMenuItems = [];
let currentCategory = 'all';

$(document).ready(function() {
    // Check authentication
    const user = API.getUser();
    if (!user) {
        window.location.href = '/';
        return;
    }
    
    // Get truck ID from URL
    truckId = $('#truckId').val();
    if (!truckId) {
        showToast('Error', 'No truck specified', 'danger');
        return;
    }
    
    // Display username
    $('#userName').text(user.first_name || 'Customer');
    
    // Load data
    loadTruckInfo();
    loadMenuItems();
    
    // Event handlers
    $(document).on('click', '.category-btn', function() {
        currentCategory = $(this).data('category');
        $('.category-btn').removeClass('active btn-primary').addClass('btn-outline-secondary');
        $(this).removeClass('btn-outline-secondary').addClass('active btn-primary');
        filterMenuItems();
    });
    
    $(document).on('click', '.add-to-cart-btn', function() {
        const itemId = $(this).data('item-id');
        const quantity = parseInt($(this).closest('.card').find('.quantity-input').val()) || 1;
        addToCart(itemId, quantity);
    });
    
    // Logout handler
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
});

function loadTruckInfo() {
    $.ajax({
        url: '/api/food-trucks/' + truckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const truck = response.data;
                $('#truckName').text(truck.name);
                $('#truckBreadcrumb').text(truck.name);
                
                const statusClass = truck.is_active ? 'bg-success' : 'bg-secondary';
                const statusText = truck.is_active ? 'Open' : 'Closed';
                $('#truckStatus').html(`<span class="badge ${statusClass}">${statusText}</span>`);
                
                if (truck.image_url) {
                    $('#truckLogo').html(`<img src="${truck.image_url}" alt="${truck.name}" style="width:80px;height:80px;object-fit:cover;border-radius:10px;">`);
                }
            }
        }
    });
}

function loadMenuItems() {
    $('#loadingState').show();
    $('#emptyState').hide();
    $('#menuItemsGrid').empty();
    
    $.ajax({
        url: '/api/menu-items?food_truck_id=' + truckId,
        method: 'GET',
        success: function(response) {
            $('#loadingState').hide();
            
            if (response.success && response.data && response.data.length > 0) {
                allMenuItems = response.data.filter(item => item.is_available);
                populateCategories();
                filterMenuItems();
            } else {
                $('#emptyState').show();
            }
        },
        error: function() {
            $('#loadingState').hide();
            $('#emptyState').show();
        }
    });
}

function populateCategories() {
    const categories = new Set();
    allMenuItems.forEach(item => {
        if (item.category) categories.add(item.category);
    });
    
    let html = '<button class="btn btn-primary category-btn active" data-category="all"><i class="bi bi-grid-3x3-gap"></i> All Items</button>';
    categories.forEach(cat => {
        html += `<button class="btn btn-outline-secondary category-btn" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`;
    });
    
    $('#categoryFilter').html(html);
}

function filterMenuItems() {
    let filtered = allMenuItems;
    
    if (currentCategory !== 'all') {
        filtered = allMenuItems.filter(item => item.category === currentCategory);
    }
    
    renderMenuItems(filtered);
}

function renderMenuItems(items) {
    if (!items || items.length === 0) {
        $('#menuItemsGrid').html('<div class="col-12 text-center py-5"><p class="text-muted">No items found in this category</p></div>');
        return;
    }
    
    let html = '';
    items.forEach(function(item) {
        html += `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100 shadow-sm">
                    ${item.image_url 
                        ? `<img src="${item.image_url}" class="card-img-top" alt="${escapeHtml(item.name)}" style="height: 150px; object-fit: cover;">`
                        : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 150px;">
                               <i class="bi bi-image" style="font-size: 3rem; color: #dee2e6;"></i>
                           </div>`
                    }
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h6 class="card-title mb-0">${escapeHtml(item.name)}</h6>
                            <span class="badge bg-light text-dark">${escapeHtml(item.category || 'Other')}</span>
                        </div>
                        <p class="card-text small text-muted">${escapeHtml(item.description || 'No description')}</p>
                        <h5 class="text-success mb-0">$${parseFloat(item.price).toFixed(2)}</h5>
                    </div>
                    <div class="card-footer bg-white">
                        <div class="d-flex gap-2">
                            <div class="input-group input-group-sm" style="width: 100px;">
                                <button class="btn btn-outline-secondary qty-btn" type="button" onclick="changeQty(this, -1)">-</button>
                                <input type="number" class="form-control text-center quantity-input" value="1" min="1" max="10">
                                <button class="btn btn-outline-secondary qty-btn" type="button" onclick="changeQty(this, 1)">+</button>
                            </div>
                            <button class="btn btn-primary btn-sm flex-grow-1 add-to-cart-btn" data-item-id="${item.menu_item_id}">
                                <i class="bi bi-cart-plus"></i> Add
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#menuItemsGrid').html(html);
}

function changeQty(btn, delta) {
    const input = $(btn).siblings('.quantity-input');
    let val = parseInt(input.val()) || 1;
    val = Math.max(1, Math.min(10, val + delta));
    input.val(val);
}

function addToCart(itemId, quantity) {
    const user = API.getUser();
    if (!user) {
        window.location.href = '/';
        return;
    }
    
    $.ajax({
        url: '/api/cart',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            user_id: user.user_id,
            menu_item_id: itemId,
            quantity: quantity
        }),
        success: function(response) {
            if (response.success) {
                const item = allMenuItems.find(i => i.menu_item_id == itemId);
                $('#addedItemName').text(`${item ? item.name : 'Item'} (x${quantity}) added to cart`);
                new bootstrap.Modal('#addToCartModal').show();
            } else {
                showToast('Error', response.error || 'Failed to add to cart', 'danger');
            }
        },
        error: function(xhr) {
            showToast('Error', xhr.responseJSON?.error || 'Failed to add to cart', 'danger');
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
