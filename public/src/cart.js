/**
 * Shopping Cart Page JavaScript
 * Handles cart display, quantity updates, and order placement
 */

let cartItems = [];
let userId = null;

$(document).ready(function() {
    // Check authentication
    const user = API.getUser();
    if (!user) {
        window.location.href = '/';
        return;
    }
    
    userId = user.user_id;
    $('#userName').text(user.first_name || 'Customer');
    
    // Set min date for pickup
    const today = new Date().toISOString().split('T')[0];
    $('#pickupDate').attr('min', today).val(today);
    
    // Load cart
    loadCart();
    
    // Event handlers
    $(document).on('click', '.qty-decrease', function() {
        const cartId = $(this).data('cart-id');
        const currentQty = parseInt($(this).siblings('.qty-value').text());
        if (currentQty > 1) updateQuantity(cartId, currentQty - 1);
    });
    
    $(document).on('click', '.qty-increase', function() {
        const cartId = $(this).data('cart-id');
        const currentQty = parseInt($(this).siblings('.qty-value').text());
        if (currentQty < 10) updateQuantity(cartId, currentQty + 1);
    });
    
    $(document).on('click', '.remove-item-btn', function() {
        const cartId = $(this).data('cart-id');
        removeItem(cartId);
    });
    
    $('#placeOrderBtn').on('click', placeOrder);
    
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
});

function loadCart() {
    $('#loadingState').show();
    $('#emptyState').hide();
    $('#cartContent').hide();
    
    $.ajax({
        url: '/api/cart/' + userId,
        method: 'GET',
        success: function(response) {
            $('#loadingState').hide();
            
            if (response.success && response.data && response.data.items && response.data.items.length > 0) {
                cartItems = response.data.items;
                renderCart();
                updateTotal();
                $('#cartContent').show();
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

function renderCart() {
    let html = '';
    
    cartItems.forEach(function(item) {
        const subtotal = (parseFloat(item.price) * item.quantity).toFixed(2);
        
        html += `
            <div class="card mb-3 cart-item" data-cart-id="${item.cart_item_id}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h6 class="mb-1">${escapeHtml(item.name)}</h6>
                            <small class="text-muted">$${parseFloat(item.price).toFixed(2)} each</small>
                        </div>
                        <div class="col-md-3">
                            <div class="d-flex align-items-center">
                                <button class="btn btn-outline-secondary btn-sm qty-decrease" data-cart-id="${item.cart_item_id}">-</button>
                                <span class="mx-3 qty-value">${item.quantity}</span>
                                <button class="btn btn-outline-secondary btn-sm qty-increase" data-cart-id="${item.cart_item_id}">+</button>
                            </div>
                        </div>
                        <div class="col-md-2 text-end">
                            <strong>$${subtotal}</strong>
                        </div>
                        <div class="col-md-1 text-end">
                            <button class="btn btn-link text-danger remove-item-btn" data-cart-id="${item.cart_item_id}">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#cartItemsList').html(html);
}

function updateQuantity(cartId, newQty) {
    $.ajax({
        url: '/api/cart/' + cartId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ quantity: newQty }),
        success: function(response) {
            if (response.success) {
                const item = cartItems.find(i => i.cart_item_id == cartId);
                if (item) item.quantity = newQty;
                
                $(`.cart-item[data-cart-id="${cartId}"] .qty-value`).text(newQty);
                const subtotal = (parseFloat(item.price) * newQty).toFixed(2);
                $(`.cart-item[data-cart-id="${cartId}"] strong`).text('$' + subtotal);
                updateTotal();
            }
        },
        error: function() {
            showToast('Error', 'Failed to update quantity', 'danger');
        }
    });
}

function removeItem(cartId) {
    $.ajax({
        url: '/api/cart/' + cartId,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                cartItems = cartItems.filter(i => i.cart_item_id != cartId);
                $(`.cart-item[data-cart-id="${cartId}"]`).fadeOut(300, function() {
                    $(this).remove();
                    if (cartItems.length === 0) {
                        $('#cartContent').hide();
                        $('#emptyState').show();
                    }
                    updateTotal();
                });
                showToast('Removed', 'Item removed from cart', 'info');
            }
        },
        error: function() {
            showToast('Error', 'Failed to remove item', 'danger');
        }
    });
}

function updateTotal() {
    let total = 0;
    cartItems.forEach(function(item) {
        total += parseFloat(item.price) * item.quantity;
    });
    $('#cartTotal').text('$' + total.toFixed(2));
    $('#itemCount').text(cartItems.length + ' item' + (cartItems.length !== 1 ? 's' : ''));
}

function placeOrder() {
    if (cartItems.length === 0) {
        showToast('Error', 'Your cart is empty', 'danger');
        return;
    }
    
    const pickupTime = $('#pickupTime').val();
    if (!pickupTime) {
        showToast('Error', 'Please select a pickup time', 'danger');
        return;
    }
    
    const $btn = $('#placeOrderBtn');
    $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span> Processing...');
    
    // Get food truck ID from first cart item
    const foodTruckId = cartItems[0].food_truck_id;
    
    $.ajax({
        url: '/api/orders',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            customer_id: userId,
            food_truck_id: foodTruckId,
            items: cartItems.map(item => ({
                menu_item_id: item.menu_item_id,
                quantity: item.quantity
            })),
            scheduled_pickup: pickupTime,
            payment_method: 'cash'
        }),
        success: function(response) {
            if (response.success) {
                // Clear cart
                $.ajax({ url: '/api/cart/user/' + userId, method: 'DELETE' });
                
                showToast('Success', 'Order placed successfully!', 'success');
                setTimeout(function() {
                    window.location.href = '/myOrders';
                }, 1500);
            } else {
                $btn.prop('disabled', false).html('<i class="bi bi-check-circle"></i> Place Order');
                showToast('Error', response.error || 'Failed to place order', 'danger');
            }
        },
        error: function(xhr) {
            $btn.prop('disabled', false).html('<i class="bi bi-check-circle"></i> Place Order');
            showToast('Error', xhr.responseJSON?.error || 'Failed to place order', 'danger');
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
    $header.removeClass('bg-success bg-danger bg-info text-white');
    if (type === 'danger') $header.addClass('bg-danger text-white');
    else if (type === 'success') $header.addClass('bg-success text-white');
    else if (type === 'info') $header.addClass('bg-info text-white');
    
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    new bootstrap.Toast(document.getElementById('notificationToast')).show();
}
