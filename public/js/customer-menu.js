/**
 * Customer Menu - Frontend JavaScript
 * Handles menu display, category filtering, add to cart, and quick view functionality
 */

const API_BASE_URL = '/api';
let truckId = null;
let userId = null;
let allMenuItems = [];
let categories = new Set();
let currentCategory = 'all';
let currentModalItem = null;
let userFavorites = [];
let cartItems = [];

$(document).ready(function() {
    truckId = $('#truckId').val();
    
    // Get user from authenticated session (optional for menu viewing)
    const user = API.getUser();
    userId = user ? user.user_id : null;
    
    if (!truckId) {
        showToast('Error', 'No truck ID specified', 'danger');
        return;
    }
    
    loadTruckInfo();
    loadMenuItems();
    if (userId) {
        loadUserFavorites();
        loadCart();
    }
    bindEventHandlers();
    
    // Setup logout handler
    $('#logoutBtn, .logout-btn').on('click', function() {
        API.logout();
    });
});

function bindEventHandlers() {
    // Category filter
    $(document).on('click', '.category-btn', function() {
        currentCategory = $(this).data('category');
        $('.category-btn').removeClass('active btn-primary').addClass('btn-outline-secondary');
        $(this).removeClass('btn-outline-secondary').addClass('active btn-primary');
        filterMenuItems();
    });

    // Search
    $('#searchMenu').on('input', function() {
        filterMenuItems();
    });

    // Quick view button
    $(document).on('click', '.quick-view-btn', function() {
        const itemId = $(this).data('item-id');
        openQuickView(itemId);
    });

    // Add to cart from card
    $(document).on('click', '.add-to-cart-btn', function() {
        const itemId = $(this).data('item-id');
        const item = allMenuItems.find(i => i.menu_item_id === itemId);
        if (item && item.is_available) {
            addToCart(itemId, 1, '');
        }
    });

    // Modal quantity controls
    $('#modalQtyMinus').on('click', function() {
        let qty = parseInt($('#modalQuantity').val());
        if (qty > 1) {
            $('#modalQuantity').val(qty - 1);
            updateModalTotal();
        }
    });

    $('#modalQtyPlus').on('click', function() {
        let qty = parseInt($('#modalQuantity').val());
        if (qty < 10) {
            $('#modalQuantity').val(qty + 1);
            updateModalTotal();
        }
    });

    // Add to cart from modal
    $('#modalAddToCartBtn').on('click', function() {
        if (!currentModalItem) return;
        const qty = parseInt($('#modalQuantity').val());
        const allergyNote = $('#modalAllergyNote').val().trim();
        addToCart(currentModalItem.menu_item_id, qty, allergyNote);
        bootstrap.Modal.getInstance(document.getElementById('quickViewModal')).hide();
    });

    // Cart item removal
    $(document).on('click', '.remove-cart-item', function() {
        const cartItemId = $(this).data('cart-item-id');
        removeFromCart(cartItemId);
    });

    // Cart quantity update
    $(document).on('change', '.cart-item-qty', function() {
        const cartItemId = $(this).data('cart-item-id');
        const qty = parseInt($(this).val());
        updateCartItemQuantity(cartItemId, qty);
    });
}

function loadTruckInfo() {
    $.ajax({
        url: `${API_BASE_URL}/food-trucks/${truckId}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const truck = response.data;
                $('#truckName').text(truck.name || 'Food Truck');
                $('#truckCuisine span').text(truck.cuisine_type || 'Various');
                $('#truckDescription').text(truck.description || '');
                
                if (truck.logo_url) {
                    $('#truckLogo').html(`<img src="${truck.logo_url}" alt="${truck.name}" class="truck-logo-img">`);
                }
                
                const isActive = truck.is_active;
                $('#truckStatusBadge')
                    .removeClass('status-active status-inactive')
                    .addClass(isActive ? 'status-active' : 'status-inactive')
                    .html(`<i class="bi bi-circle-fill"></i> <span>${isActive ? 'Open' : 'Closed'}</span>`);
            }
        },
        error: function() {
            $('#truckName').text('Food Truck');
        }
    });
}

function loadMenuItems() {
    $.ajax({
        url: `${API_BASE_URL}/menu-items?food_truck_id=${truckId}`,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                allMenuItems = response.data || [];
                
                // Extract unique categories
                categories.clear();
                allMenuItems.forEach(item => {
                    if (item.category) {
                        categories.add(item.category);
                    }
                });
                
                renderCategoryButtons();
                filterMenuItems();
            }
        },
        error: function() {
            $('#menuItemsGrid').html(`
                <div class="col-12 text-center py-5">
                    <div class="empty-state">
                        <i class="bi bi-exclamation-circle text-danger"></i>
                        <h5>Failed to load menu</h5>
                        <p>Please try refreshing the page</p>
                    </div>
                </div>
            `);
        }
    });
}

function loadUserFavorites() {
    if (!userId) return;
    
    $.ajax({
        url: `${API_BASE_URL}/favorites?customer_id=${userId}&favorite_type=MENU_ITEM`,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                userFavorites = response.data || [];
            }
        }
    });
}

function loadCart() {
    if (!userId) return;
    
    $.ajax({
        url: `${API_BASE_URL}/cart/${userId}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                cartItems = response.data.items || [];
                updateCartUI();
            }
        }
    });
}

function renderCategoryButtons() {
    let html = `
        <button class="btn ${currentCategory === 'all' ? 'btn-primary active' : 'btn-outline-secondary'} category-btn" data-category="all">
            <i class="bi bi-grid-3x3-gap"></i> All Items
        </button>
    `;
    
    const categoryIcons = {
        'Main': 'bi-egg-fried',
        'Sides': 'bi-box',
        'Drinks': 'bi-cup-straw',
        'Desserts': 'bi-cake2',
        'Appetizers': 'bi-basket',
        'Specials': 'bi-star'
    };
    
    categories.forEach(category => {
        const icon = categoryIcons[category] || 'bi-tag';
        const isActive = currentCategory === category;
        html += `
            <button class="btn ${isActive ? 'btn-primary active' : 'btn-outline-secondary'} category-btn" data-category="${category}">
                <i class="bi ${icon}"></i> ${category}
            </button>
        `;
    });
    
    $('#categoryPills').html(html);
}

function filterMenuItems() {
    const searchTerm = $('#searchMenu').val().toLowerCase();
    let filtered = allMenuItems;

    // Filter by category
    if (currentCategory !== 'all') {
        filtered = filtered.filter(item => item.category === currentCategory);
    }

    // Filter by search term
    if (searchTerm) {
        filtered = filtered.filter(item => 
            item.name.toLowerCase().includes(searchTerm) || 
            (item.description && item.description.toLowerCase().includes(searchTerm))
        );
    }

    $('#itemCount').text(`${filtered.length} item${filtered.length !== 1 ? 's' : ''}`);
    renderMenuItems(filtered);
}

function renderMenuItems(items) {
    if (!items || items.length === 0) {
        $('#menuItemsGrid').html(`
            <div class="col-12 text-center py-5">
                <div class="empty-state">
                    <i class="bi bi-search"></i>
                    <h5>No items found</h5>
                    <p>Try adjusting your search or filter</p>
                </div>
            </div>
        `);
        return;
    }

    let html = '';
    items.forEach(item => {
        const isFavorite = userFavorites.some(f => f.menu_item_id === item.menu_item_id);
        const isAvailable = item.is_available;
        
        html += `
            <div class="col-sm-6 col-lg-4 col-xl-3 mb-4">
                <div class="card h-100 customer-menu-card ${!isAvailable ? 'unavailable' : ''}">
                    <div class="card-img-container">
                        ${item.image_url 
                            ? `<img src="${item.image_url}" class="card-img-top" alt="${item.name}">`
                            : `<div class="card-img-placeholder"><i class="bi bi-image"></i></div>`
                        }
                        ${isFavorite ? `<span class="favorite-badge"><i class="bi bi-heart-fill"></i></span>` : ''}
                        ${!isAvailable ? `<span class="unavailable-overlay">Unavailable</span>` : ''}
                    </div>
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title mb-0">${item.name}</h5>
                            <span class="badge bg-light text-dark">${item.category || 'Other'}</span>
                        </div>
                        <p class="card-text text-muted small mb-2">${item.description || 'No description available'}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="h5 text-success mb-0">$${parseFloat(item.price).toFixed(2)}</span>
                            ${isAvailable 
                                ? `<span class="badge bg-success-subtle text-success"><i class="bi bi-check-circle"></i> In Stock</span>`
                                : `<span class="badge bg-danger-subtle text-danger"><i class="bi bi-x-circle"></i> Out of Stock</span>`
                            }
                        </div>
                    </div>
                    <div class="card-footer bg-white border-top-0">
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary quick-view-btn" data-item-id="${item.menu_item_id}">
                                <i class="bi bi-eye"></i> View
                            </button>
                            <button class="btn btn-primary add-to-cart-btn" data-item-id="${item.menu_item_id}" ${!isAvailable ? 'disabled' : ''}>
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

function openQuickView(itemId) {
    const item = allMenuItems.find(i => i.menu_item_id === itemId);
    if (!item) return;

    currentModalItem = item;
    const isFavorite = userFavorites.some(f => f.menu_item_id === item.menu_item_id);
    const isAvailable = item.is_available;

    // Set modal content
    $('#modalItemName').text(item.name);
    $('#modalItemCategory').text(item.category || 'Other');
    $('#modalItemDescription').text(item.description || 'No description available');
    $('#modalItemPrice').text(`$${parseFloat(item.price).toFixed(2)}`);
    
    // Image
    if (item.image_url) {
        $('#modalItemImage').html(`<img src="${item.image_url}" alt="${item.name}">`);
    } else {
        $('#modalItemImage').html('<i class="bi bi-image"></i>');
    }
    
    // Favorite indicator
    $('#modalFavoriteIndicator').toggle(isFavorite);
    
    // Availability
    if (isAvailable) {
        $('#modalItemAvailability')
            .removeClass('bg-danger-subtle text-danger')
            .addClass('bg-success-subtle text-success')
            .html('<i class="bi bi-check-circle"></i> Available');
        $('#modalAddToCartBtn').prop('disabled', false);
        $('#modalAllergyContainer').show();
    } else {
        $('#modalItemAvailability')
            .removeClass('bg-success-subtle text-success')
            .addClass('bg-danger-subtle text-danger')
            .html('<i class="bi bi-x-circle"></i> Unavailable');
        $('#modalAddToCartBtn').prop('disabled', true);
        $('#modalAllergyContainer').hide();
    }
    
    // Reset quantity and allergy note
    $('#modalQuantity').val(1);
    $('#modalAllergyNote').val('');
    updateModalTotal();

    new bootstrap.Modal('#quickViewModal').show();
}

function updateModalTotal() {
    if (!currentModalItem) return;
    const qty = parseInt($('#modalQuantity').val());
    const total = (parseFloat(currentModalItem.price) * qty).toFixed(2);
    $('#modalTotalPrice').text(`$${total}`);
}

function addToCart(menuItemId, quantity, allergyNote) {
    $.ajax({
        url: `${API_BASE_URL}/cart`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            user_id: userId,
            menu_item_id: menuItemId,
            quantity: quantity
        }),
        success: function(response) {
            if (response.success) {
                showToast('Added to Cart', 'Item has been added to your cart', 'success');
                loadCart();
            }
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON?.error || 'Failed to add item to cart';
            if (errorMsg.includes('already')) {
                showToast('Already in Cart', 'This item is already in your cart. Quantity has been updated.', 'info');
                loadCart();
            } else {
                showToast('Error', errorMsg, 'danger');
            }
        }
    });
}

function removeFromCart(cartItemId) {
    $.ajax({
        url: `${API_BASE_URL}/cart/${cartItemId}`,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                showToast('Removed', 'Item removed from cart', 'info');
                loadCart();
            }
        },
        error: function() {
            showToast('Error', 'Failed to remove item', 'danger');
        }
    });
}

function updateCartItemQuantity(cartItemId, quantity) {
    if (quantity < 1 || quantity > 10) return;
    
    $.ajax({
        url: `${API_BASE_URL}/cart/${cartItemId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ quantity: quantity }),
        success: function(response) {
            if (response.success) {
                loadCart();
            }
        },
        error: function() {
            showToast('Error', 'Failed to update quantity', 'danger');
        }
    });
}

function updateCartUI() {
    const itemCount = cartItems.length;
    
    // Update badge
    if (itemCount > 0) {
        $('#cartBadge').text(itemCount).show();
        $('#cartFooter').show();
    } else {
        $('#cartBadge').hide();
        $('#cartFooter').hide();
    }
    
    // Update cart items list
    if (itemCount === 0) {
        $('#cartItems').html(`
            <div class="text-center py-5 text-muted">
                <i class="bi bi-cart-x" style="font-size: 3rem;"></i>
                <p class="mt-2">Your cart is empty</p>
            </div>
        `);
        return;
    }
    
    let html = '';
    let total = 0;
    
    cartItems.forEach(item => {
        const lineTotal = parseFloat(item.line_total);
        total += lineTotal;
        
        html += `
            <div class="cart-item p-3 border-bottom">
                <div class="d-flex gap-3">
                    <div class="cart-item-image">
                        ${item.image_url 
                            ? `<img src="${item.image_url}" alt="${item.name}">`
                            : `<i class="bi bi-image"></i>`
                        }
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start">
                            <h6 class="mb-1">${item.name}</h6>
                            <button class="btn btn-sm btn-link text-danger p-0 remove-cart-item" data-cart-item-id="${item.cart_item_id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        <p class="text-muted small mb-2">$${parseFloat(item.price).toFixed(2)} each</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <select class="form-select form-select-sm cart-item-qty" data-cart-item-id="${item.cart_item_id}" style="width: 70px;">
                                ${[1,2,3,4,5,6,7,8,9,10].map(n => 
                                    `<option value="${n}" ${item.quantity === n ? 'selected' : ''}>${n}</option>`
                                ).join('')}
                            </select>
                            <span class="fw-bold text-success">$${lineTotal.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#cartItems').html(html);
    $('#cartTotal').text(`$${total.toFixed(2)}`);
}

function showToast(title, message, type) {
    const toast = $('#notificationToast');
    const header = toast.find('.toast-header');
    
    // Remove previous type classes
    header.removeClass('bg-success bg-danger bg-warning bg-info text-white');
    
    // Add type-specific styling
    if (type === 'success') {
        header.addClass('bg-success text-white');
    } else if (type === 'danger') {
        header.addClass('bg-danger text-white');
    } else if (type === 'warning') {
        header.addClass('bg-warning');
    } else if (type === 'info') {
        header.addClass('bg-info text-white');
    }
    
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    new bootstrap.Toast(document.getElementById('notificationToast')).show();
}
