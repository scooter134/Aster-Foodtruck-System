/**
 * Cart & Order Placement - Frontend JavaScript
 * Handles cart display, item management, time slot selection, and order placement
 */

// ============================================
// Configuration & State
// ============================================

const API_BASE_URL = '/api';
let userId = null;
let customerId = null;         // Customer ID (linked to user)
let cartData = null;           // Current cart data from API
let cartItems = [];            // Array of cart items
let foodTruckId = null;        // Current food truck ID (from cart items)
let selectedSlotId = null;     // Selected time slot ID
let selectedSlotInfo = null;   // Selected time slot details
let availableSlots = [];       // Available time slots
let isProcessingOrder = false; // Flag to prevent double-submission
let allergyNotes = {};         // Store allergy notes per cart item

// ============================================
// Initialization
// ============================================

$(document).ready(function() {
    // Get user from authenticated session
    const user = API.getUser();
    
    if (!user || !user.user_id) {
        // Redirect to login if not authenticated
        window.location.href = '/login';
        return;
    }
    
    userId = user.user_id;
    
    // Display username in nav
    const displayName = user.first_name || 'Customer';
    $('#navUsername').html(`<i class="bi bi-person-circle"></i> ${displayName}`);
    
    // Set minimum date for date picker (today)
    setMinDate();
    
    // Load customer ID then cart data
    loadCustomerId();
    
    // Bind event handlers
    bindEventHandlers();
    
    // Setup logout handler
    $('#logoutBtn, .logout-btn').on('click', function() {
        API.logout();
    });
});

/**
 * Sets the minimum selectable date to today
 */
function setMinDate() {
    const today = new Date().toISOString().split('T')[0];
    $('#pickupDate').attr('min', today).val(today);
}

/**
 * Binds all event handlers for user interactions
 */
function bindEventHandlers() {
    // Quantity decrease button
    $(document).on('click', '.qty-decrease', function() {
        const cartItemId = $(this).data('cart-item-id');
        const currentQty = parseInt($(this).siblings('.quantity-value').text());
        if (currentQty > 1) {
            updateCartItemQuantity(cartItemId, currentQty - 1);
        }
    });

    // Quantity increase button
    $(document).on('click', '.qty-increase', function() {
        const cartItemId = $(this).data('cart-item-id');
        const currentQty = parseInt($(this).siblings('.quantity-value').text());
        if (currentQty < 10) {
            updateCartItemQuantity(cartItemId, currentQty + 1);
        }
    });

    // Remove item button
    $(document).on('click', '.remove-item-btn', function() {
        const cartItemId = $(this).data('cart-item-id');
        removeCartItem(cartItemId);
    });

    // Allergy note change (with debounce)
    let allergyNoteTimeout;
    $(document).on('input', '.allergy-note-textarea', function() {
        const cartItemId = $(this).data('cart-item-id');
        const note = $(this).val();
        
        clearTimeout(allergyNoteTimeout);
        allergyNoteTimeout = setTimeout(() => {
            saveAllergyNote(cartItemId, note);
        }, 500); // Debounce 500ms
    });

    // Date selection change
    $('#pickupDate').on('change', function() {
        const selectedDate = $(this).val();
        if (selectedDate) {
            loadTimeSlots(selectedDate);
        }
    });

    // Time slot selection
    $(document).on('click', '.time-slot-btn:not(.disabled)', function() {
        selectTimeSlot($(this));
    });

    // Clear cart button
    $('#clearCartBtn').on('click', function() {
        new bootstrap.Modal('#clearCartModal').show();
    });

    // Confirm clear cart
    $('#confirmClearCartBtn').on('click', function() {
        clearCart();
    });

    // Place order button
    $('#placeOrderBtn').on('click', function() {
        placeOrder();
    });
}

// ============================================
// Cart Data Loading
// ============================================

/**
 * Loads the customer ID for the current user
 */
function loadCustomerId() {
    $.ajax({
        url: `${API_BASE_URL}/customers/user/${userId}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                customerId = response.data.customer_id;
            }
            // Load cart regardless of customer lookup result
            loadCart();
        },
        error: function() {
            // Customer might not exist yet, still try to load cart
            loadCart();
        }
    });
}

/**
 * Fetches cart data from the API and renders it
 */
function loadCart() {
    showCartLoading(true);
    
    $.ajax({
        url: `${API_BASE_URL}/cart/${userId}`,
        method: 'GET',
        success: function(response) {
            showCartLoading(false);
            
            if (response.success && response.data) {
                cartData = response.data;
                cartItems = response.data.items || [];
                
                if (cartItems.length > 0) {
                    // Get food truck ID from first item
                    foodTruckId = cartItems[0].food_truck_id;
                    
                    // Initialize allergy notes from existing data
                    cartItems.forEach(item => {
                        if (item.allergy_note) {
                            allergyNotes[item.cart_item_id] = item.allergy_note;
                        }
                    });
                    
                    renderCartItems();
                    updateOrderSummary();
                    loadTruckInfo(foodTruckId);
                    
                    // Load time slots for today
                    const today = new Date().toISOString().split('T')[0];
                    loadTimeSlots(today);
                } else {
                    showEmptyCart();
                }
            } else {
                showEmptyCart();
            }
        },
        error: function(xhr) {
            showCartLoading(false);
            showEmptyCart();
            
            // Only show error if it's not a "cart not found" error
            if (xhr.status !== 404) {
                const errorMsg = xhr.responseJSON?.error || 'Failed to load cart';
                showToast('Error', errorMsg, 'danger');
            }
        }
    });
}

/**
 * Loads food truck information for display
 */
function loadTruckInfo(truckId) {
    if (!truckId) return;
    
    $.ajax({
        url: `${API_BASE_URL}/food-trucks/${truckId}`,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const truck = response.data;
                $('#truckName').text(truck.name || 'Food Truck');
                $('#truckLocation').html(`<i class="bi bi-geo-alt"></i> ${truck.location || 'On Campus'}`);
                
                if (truck.logo_url) {
                    $('#truckLogo').html(`<img src="${truck.logo_url}" alt="${truck.name}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;">`);
                }
                
                $('#truckInfoCard').show();
            }
        }
    });
}

// ============================================
// Cart Rendering
// ============================================

/**
 * Renders all cart items to the DOM
 */
function renderCartItems() {
    let html = '';
    
    cartItems.forEach(item => {
        const subtotal = (parseFloat(item.price) * item.quantity).toFixed(2);
        const hasAllergyNote = item.allergy_note && item.allergy_note.trim() !== '';
        
        html += `
            <div class="cart-item" data-cart-item-id="${item.cart_item_id}">
                <div class="d-flex gap-3">
                    <!-- Item Image -->
                    <div class="cart-item-image">
                        ${item.image_url 
                            ? `<img src="${item.image_url}" alt="${item.name}">`
                            : `<i class="bi bi-image"></i>`
                        }
                    </div>
                    
                    <!-- Item Details -->
                    <div class="cart-item-details">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="cart-item-name mb-1">${item.name}</h6>
                                <p class="cart-item-price mb-2">$${parseFloat(item.price).toFixed(2)} each</p>
                                ${hasAllergyNote ? `<span class="allergy-note-badge"><i class="bi bi-exclamation-triangle-fill"></i> Has allergy note</span>` : ''}
                            </div>
                            <button class="btn btn-link remove-item-btn p-0" data-cart-item-id="${item.cart_item_id}" title="Remove item">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                        
                        <!-- Quantity Controls & Subtotal -->
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <div class="quantity-controls">
                                <button class="btn btn-outline-secondary qty-decrease" data-cart-item-id="${item.cart_item_id}" ${item.quantity <= 1 ? 'disabled' : ''}>
                                    <i class="bi bi-dash"></i>
                                </button>
                                <span class="quantity-value">${item.quantity}</span>
                                <button class="btn btn-outline-secondary qty-increase" data-cart-item-id="${item.cart_item_id}" ${item.quantity >= 10 ? 'disabled' : ''}>
                                    <i class="bi bi-plus"></i>
                                </button>
                            </div>
                            <span class="cart-item-subtotal">$${subtotal}</span>
                        </div>
                        
                        <!-- Allergy Notes Input -->
                        <div class="allergy-note-input">
                            <label class="form-label mb-1">
                                <i class="bi bi-exclamation-triangle"></i> Allergy / Special Instructions
                            </label>
                            <textarea 
                                class="form-control allergy-note-textarea" 
                                data-cart-item-id="${item.cart_item_id}"
                                rows="2" 
                                placeholder="E.g., No peanuts, extra sauce, etc."
                            >${item.allergy_note || ''}</textarea>
                        </div>
                    </div>
                </div>
                
                ${!item.is_available ? `
                    <div class="item-unavailable-warning">
                        <i class="bi bi-exclamation-circle"></i> This item is currently unavailable and will be removed from your order
                    </div>
                ` : ''}
            </div>
        `;
    });
    
    $('#cartItemsList').html(html).show();
    $('#cartEmpty').hide();
    $('#cartActions').show();
    $('#cartItemCount').text(`${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`);
}

/**
 * Shows the empty cart state
 */
function showEmptyCart() {
    $('#cartItemsList').hide();
    $('#cartActions').hide();
    $('#cartEmpty').show();
    $('#cartItemCount').text('0 items');
    
    // Reset order summary
    $('#subtotalAmount').text('$0.00');
    $('#totalItemsCount').text('0');
    $('#totalAmount').text('$0.00');
    
    // Disable checkout
    updateCheckoutButton();
}

/**
 * Shows/hides loading state
 */
function showCartLoading(show) {
    if (show) {
        $('#cartLoading').show();
        $('#cartItemsList').hide();
        $('#cartEmpty').hide();
        $('#cartActions').hide();
    } else {
        $('#cartLoading').hide();
    }
}

// ============================================
// Cart Item Management
// ============================================

/**
 * Updates the quantity of a cart item
 */
function updateCartItemQuantity(cartItemId, newQuantity) {
    // Optimistic UI update
    const $item = $(`.cart-item[data-cart-item-id="${cartItemId}"]`);
    const $qtyValue = $item.find('.quantity-value');
    const oldQty = parseInt($qtyValue.text());
    
    $qtyValue.text(newQuantity);
    updateItemSubtotal(cartItemId, newQuantity);
    updateOrderSummary();
    
    // Update button states
    $item.find('.qty-decrease').prop('disabled', newQuantity <= 1);
    $item.find('.qty-increase').prop('disabled', newQuantity >= 10);
    
    // API call - using PUT /api/cart/:cartItemId
    $.ajax({
        url: `${API_BASE_URL}/cart/${cartItemId}`,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ quantity: newQuantity }),
        success: function(response) {
            if (response.success) {
                // Update local state
                const item = cartItems.find(i => i.cart_item_id === cartItemId);
                if (item) {
                    item.quantity = newQuantity;
                }
                showToast('Updated', 'Quantity updated', 'success');
            }
        },
        error: function(xhr) {
            // Revert on error
            $qtyValue.text(oldQty);
            updateItemSubtotal(cartItemId, oldQty);
            updateOrderSummary();
            
            const errorMsg = xhr.responseJSON?.error || 'Failed to update quantity';
            showToast('Error', errorMsg, 'danger');
        }
    });
}

/**
 * Updates the subtotal display for a single item
 */
function updateItemSubtotal(cartItemId, quantity) {
    const item = cartItems.find(i => i.cart_item_id === cartItemId);
    if (item) {
        const subtotal = (parseFloat(item.price) * quantity).toFixed(2);
        $(`.cart-item[data-cart-item-id="${cartItemId}"] .cart-item-subtotal`).text(`$${subtotal}`);
    }
}

/**
 * Removes an item from the cart
 */
function removeCartItem(cartItemId) {
    const $item = $(`.cart-item[data-cart-item-id="${cartItemId}"]`);
    
    // Fade out animation
    $item.css('opacity', '0.5');
    
    // API call - using DELETE /api/cart/:cartItemId
    $.ajax({
        url: `${API_BASE_URL}/cart/${cartItemId}`,
        method: 'DELETE',
        success: function(response) {
            if (response.success) {
                // Remove allergy note for this item
                delete allergyNotes[cartItemId];
                
                // Remove from local state
                cartItems = cartItems.filter(i => i.cart_item_id !== cartItemId);
                
                // Remove from DOM with animation
                $item.slideUp(300, function() {
                    $(this).remove();
                    
                    if (cartItems.length === 0) {
                        // Reset all state when cart is empty
                        foodTruckId = null;
                        selectedSlotId = null;
                        selectedSlotInfo = null;
                        $('#selectedSlotDisplay').addClass('d-none');
                        $('#timeSlotsContainer').html('<p class="text-muted small">Please add items to your cart first</p>');
                        $('#truckInfoCard').hide();
                        showEmptyCart();
                    } else {
                        updateOrderSummary();
                        $('#cartItemCount').text(`${cartItems.length} item${cartItems.length !== 1 ? 's' : ''}`);
                    }
                });
                
                showToast('Removed', 'Item removed from cart', 'info');
            }
        },
        error: function(xhr) {
            $item.css('opacity', '1');
            const errorMsg = xhr.responseJSON?.error || 'Failed to remove item';
            showToast('Error', errorMsg, 'danger');
        }
    });
}

/**
 * Saves allergy note for a cart item (stored locally, sent with order)
 */
function saveAllergyNote(cartItemId, note) {
    // Store allergy note locally (will be sent with order)
    allergyNotes[cartItemId] = note;
    
    // Update local state
    const item = cartItems.find(i => i.cart_item_id === cartItemId);
    if (item) {
        item.allergy_note = note;
    }
    
    // Update badge visibility
    const $badge = $(`.cart-item[data-cart-item-id="${cartItemId}"] .allergy-note-badge`);
    if (note && note.trim() !== '') {
        if ($badge.length === 0) {
            $(`.cart-item[data-cart-item-id="${cartItemId}"] .cart-item-price`).after(
                '<span class="allergy-note-badge"><i class="bi bi-exclamation-triangle-fill"></i> Has allergy note</span>'
            );
        }
    } else {
        $badge.remove();
        delete allergyNotes[cartItemId];
    }
}

/**
 * Clears all items from the cart
 */
function clearCart() {
    if (!userId || cartItems.length === 0) return;
    
    $('#confirmClearCartBtn').prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');
    
    $.ajax({
        url: `${API_BASE_URL}/cart/user/${userId}`,
        method: 'DELETE',
        success: function(response) {
            bootstrap.Modal.getInstance(document.getElementById('clearCartModal')).hide();
            $('#confirmClearCartBtn').prop('disabled', false).text('Clear Cart');
            
            if (response.success) {
                cartItems = [];
                cartData = null;
                foodTruckId = null;
                allergyNotes = {};
                showEmptyCart();
                
                // Reset time slot selection
                selectedSlotId = null;
                selectedSlotInfo = null;
                $('#selectedSlotDisplay').addClass('d-none');
                $('#timeSlotsContainer').html('<p class="text-muted small">Please add items to your cart first</p>');
                $('#truckInfoCard').hide();
                
                showToast('Cart Cleared', 'All items have been removed', 'info');
            }
        },
        error: function(xhr) {
            $('#confirmClearCartBtn').prop('disabled', false).text('Clear Cart');
            const errorMsg = xhr.responseJSON?.error || 'Failed to clear cart';
            showToast('Error', errorMsg, 'danger');
        }
    });
}

// ============================================
// Order Summary
// ============================================

/**
 * Updates the order summary display
 */
function updateOrderSummary() {
    let subtotal = 0;
    let totalItems = 0;
    
    cartItems.forEach(item => {
        const qty = parseInt($(`.cart-item[data-cart-item-id="${item.cart_item_id}"] .quantity-value`).text()) || item.quantity;
        subtotal += parseFloat(item.price) * qty;
        totalItems += qty;
    });
    
    $('#subtotalAmount').text(`$${subtotal.toFixed(2)}`);
    $('#totalItemsCount').text(totalItems);
    $('#totalAmount').text(`$${subtotal.toFixed(2)}`);
    
    updateCheckoutButton();
}

// ============================================
// Time Slot Management
// ============================================

/**
 * Loads available time slots for a given date
 */
function loadTimeSlots(date) {
    if (!foodTruckId) {
        $('#timeSlotsContainer').html('<p class="text-muted small">Please add items to your cart first</p>');
        return;
    }
    
    // Show loading state
    $('#timeSlotsContainer').html(`
        <div class="time-slots-loading">
            <div class="spinner-border spinner-border-sm text-primary"></div>
            <span class="ms-2">Loading available slots...</span>
        </div>
    `);
    
    // Reset selection
    selectedSlotId = null;
    selectedSlotInfo = null;
    $('#selectedSlotDisplay').addClass('d-none');
    updateCheckoutButton();
    
    $.ajax({
        url: `${API_BASE_URL}/time-slots/available`,
        method: 'GET',
        data: {
            food_truck_id: foodTruckId,
            slot_date: date
        },
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                availableSlots = response.data;
                renderTimeSlots(availableSlots);
            } else {
                $('#timeSlotsContainer').html(`
                    <div class="time-slots-empty">
                        <i class="bi bi-calendar-x mb-2" style="font-size: 1.5rem;"></i>
                        <p class="mb-0">No available slots for this date</p>
                        <small class="text-muted">Try selecting a different date</small>
                    </div>
                `);
            }
        },
        error: function(xhr) {
            const errorMsg = xhr.responseJSON?.error || 'Failed to load time slots';
            $('#timeSlotsContainer').html(`
                <div class="alert alert-danger py-2">
                    <small><i class="bi bi-exclamation-circle"></i> ${errorMsg}</small>
                </div>
            `);
        }
    });
}

/**
 * Renders time slots to the DOM
 */
function renderTimeSlots(slots) {
    let html = '<div class="time-slot-grid">';
    
    slots.forEach(slot => {
        // Use correct field names from API: max_orders, current_orders, time_slot_id
        const isFull = slot.current_orders >= slot.max_orders;
        const availableCapacity = slot.max_orders - slot.current_orders;
        const startTime = formatTime(slot.start_time);
        const endTime = formatTime(slot.end_time);
        
        html += `
            <div class="time-slot-btn ${isFull ? 'disabled' : ''}" 
                 data-slot-id="${slot.time_slot_id}"
                 data-start-time="${slot.start_time}"
                 data-end-time="${slot.end_time}"
                 data-slot-date="${slot.slot_date}">
                <span class="slot-time">${startTime} - ${endTime}</span>
                <span class="slot-capacity">
                    ${isFull 
                        ? '<i class="bi bi-x-circle"></i> Full' 
                        : `<i class="bi bi-check-circle"></i> ${availableCapacity} slots left`
                    }
                </span>
            </div>
        `;
    });
    
    html += '</div>';
    $('#timeSlotsContainer').html(html);
}

/**
 * Handles time slot selection
 */
function selectTimeSlot($slotElement) {
    // Remove previous selection
    $('.time-slot-btn').removeClass('selected');
    
    // Select new slot
    $slotElement.addClass('selected');
    
    // Store selection
    selectedSlotId = $slotElement.data('slot-id');
    selectedSlotInfo = {
        time_slot_id: selectedSlotId,
        start_time: $slotElement.data('start-time'),
        end_time: $slotElement.data('end-time'),
        date: $slotElement.data('slot-date') || $('#pickupDate').val()
    };
    
    // Update display
    const startTime = formatTime(selectedSlotInfo.start_time);
    const endTime = formatTime(selectedSlotInfo.end_time);
    const formattedDate = formatDate(selectedSlotInfo.date);
    
    $('#selectedSlotText').html(`<strong>${formattedDate}</strong> at <strong>${startTime} - ${endTime}</strong>`);
    $('#selectedSlotDisplay').removeClass('d-none');
    
    updateCheckoutButton();
}

// ============================================
// Order Placement
// ============================================

/**
 * Validates cart and places the order
 */
function placeOrder() {
    // Prevent double-submission
    if (isProcessingOrder) return;
    
    // Validation
    if (!validateOrder()) return;
    
    isProcessingOrder = true;
    
    // Update button state
    $('#placeOrderBtn')
        .prop('disabled', true)
        .addClass('btn-processing')
        .html('<span class="spinner-border spinner-border-sm me-2"></span> Processing...');
    
    // Build items array with current quantities
    const orderItems = cartItems.map(item => {
        const currentQty = parseInt($(`.cart-item[data-cart-item-id="${item.cart_item_id}"] .quantity-value`).text()) || item.quantity;
        const allergyNote = allergyNotes[item.cart_item_id] || '';
        
        return {
            menu_item_id: item.menu_item_id,
            quantity: currentQty,
            special_instructions: allergyNote
        };
    });
    
    // Build allergy notes array (for items that have notes)
    const orderAllergyNotes = [];
    cartItems.forEach(item => {
        const note = allergyNotes[item.cart_item_id];
        if (note && note.trim() !== '') {
            orderAllergyNotes.push({
                allergy_type: 'custom',
                severity: 'moderate',
                notes: note
            });
        }
    });
    
    // Validate customer ID exists
    if (!customerId) {
        showToast('Error', 'Customer profile not found. Please try logging in again.', 'danger');
        isProcessingOrder = false;
        $('#placeOrderBtn').prop('disabled', false).removeClass('btn-processing').html('<i class="bi bi-check-circle"></i> Place Order');
        return;
    }
    
    // Prepare order payload matching backend API structure
    const orderPayload = {
        customer_id: customerId,  // Use actual customer_id from customers table
        food_truck_id: foodTruckId,
        time_slot_id: selectedSlotId,
        items: orderItems,
        special_instructions: orderAllergyNotes.map(n => n.notes).join('; '),
        payment_method: 'cash', // Default to cash (no payment integration per SRS)
        allergy_notes: orderAllergyNotes.length > 0 ? orderAllergyNotes : undefined
    };
    
    $.ajax({
        url: `${API_BASE_URL}/orders`,
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(orderPayload),
        success: function(response) {
            isProcessingOrder = false;
            
            if (response.success && response.data) {
                // Show confirmation modal
                showOrderConfirmation(response.data);
                
                // Clear cart on backend
                clearCartAfterOrder();
                
                // Clear cart state locally
                cartItems = [];
                cartData = null;
                foodTruckId = null;
                allergyNotes = {};
                showEmptyCart();
                
                // Reset time slot selection
                selectedSlotId = null;
                selectedSlotInfo = null;
                $('#selectedSlotDisplay').addClass('d-none');
                $('#timeSlotsContainer').html('<p class="text-muted small">Please select a date first</p>');
                $('#truckInfoCard').hide();
            }
        },
        error: function(xhr) {
            isProcessingOrder = false;
            
            // Reset button
            $('#placeOrderBtn')
                .prop('disabled', false)
                .removeClass('btn-processing')
                .html('<i class="bi bi-check-circle"></i> Place Order');
            
            const errorMsg = xhr.responseJSON?.error || 'Failed to place order. Please try again.';
            showToast('Order Failed', errorMsg, 'danger');
            
            // Handle specific errors
            if (xhr.status === 400 && errorMsg.includes('Time slot')) {
                // Slot not available - reload slots
                const date = $('#pickupDate').val();
                loadTimeSlots(date);
                showValidationMessage('The selected time slot is no longer available. Please choose another.');
            }
        }
    });
}

/**
 * Clears the cart on the backend after successful order
 */
function clearCartAfterOrder() {
    $.ajax({
        url: `${API_BASE_URL}/cart/user/${userId}`,
        method: 'DELETE',
        error: function(xhr) {
            console.error('Failed to clear cart after order:', xhr);
        }
    });
}

/**
 * Validates the order before submission
 */
function validateOrder() {
    // Check cart has items
    if (!cartItems || cartItems.length === 0) {
        showValidationMessage('Your cart is empty');
        return false;
    }
    
    // Check time slot selected
    if (!selectedSlotId) {
        showValidationMessage('Please select a pickup time slot');
        return false;
    }
    
    // Check for unavailable items
    const unavailableItems = cartItems.filter(item => !item.is_available);
    if (unavailableItems.length > 0) {
        showValidationMessage('Some items in your cart are no longer available');
        return false;
    }
    
    hideValidationMessage();
    return true;
}

/**
 * Shows the order confirmation modal
 */
function showOrderConfirmation(orderData) {
    const formattedDate = formatDate(selectedSlotInfo.date);
    const startTime = formatTime(selectedSlotInfo.start_time);
    const endTime = formatTime(selectedSlotInfo.end_time);
    
    // Use order_number if available, otherwise use order_id
    const orderId = orderData.order_number || orderData.order_id;
    $('#confirmOrderId').text(`#${orderId}`);
    $('#confirmPickupTime').text(`${formattedDate} at ${startTime} - ${endTime}`);
    $('#confirmItemCount').text(`${orderData.items?.length || cartItems.length} items`);
    $('#confirmTotal').text(`$${parseFloat(orderData.total_amount || 0).toFixed(2)}`);
    
    new bootstrap.Modal('#orderConfirmationModal').show();
}

// ============================================
// Checkout Button Management
// ============================================

/**
 * Updates the checkout button state based on validation
 */
function updateCheckoutButton() {
    const hasItems = cartItems && cartItems.length > 0;
    const hasSlot = selectedSlotId !== null;
    const canCheckout = hasItems && hasSlot;
    
    $('#placeOrderBtn').prop('disabled', !canCheckout);
    
    // Show appropriate validation message
    if (!hasItems) {
        showValidationMessage('Add items to your cart to continue');
    } else if (!hasSlot) {
        showValidationMessage('Please select a pickup time slot');
    } else {
        hideValidationMessage();
    }
}

/**
 * Shows a validation message
 */
function showValidationMessage(message) {
    $('#validationMessage').text(message);
    $('#checkoutValidation').show();
}

/**
 * Hides the validation message
 */
function hideValidationMessage() {
    $('#checkoutValidation').hide();
}

// ============================================
// Utility Functions
// ============================================

/**
 * Formats time string (HH:MM:SS) to readable format (HH:MM AM/PM)
 */
function formatTime(timeString) {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
}

/**
 * Formats date string (YYYY-MM-DD or ISO) to readable format
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    // Handle both ISO format and YYYY-MM-DD format
    let date;
    if (dateString.includes('T')) {
        // Full ISO string like "2025-12-21T22:00:00.000Z"
        date = new Date(dateString);
    } else {
        // Simple date string like "2025-12-21"
        date = new Date(dateString + 'T00:00:00');
    }
    
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Shows a toast notification
 */
function showToast(title, message, type) {
    const $toast = $('#notificationToast');
    const $header = $toast.find('.toast-header');
    
    // Remove previous type classes
    $header.removeClass('bg-success bg-danger bg-warning bg-info text-white');
    
    // Add type-specific styling
    switch (type) {
        case 'success':
            $header.addClass('bg-success text-white');
            break;
        case 'danger':
            $header.addClass('bg-danger text-white');
            break;
        case 'warning':
            $header.addClass('bg-warning');
            break;
        case 'info':
            $header.addClass('bg-info text-white');
            break;
    }
    
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    
    new bootstrap.Toast(document.getElementById('notificationToast')).show();
}
