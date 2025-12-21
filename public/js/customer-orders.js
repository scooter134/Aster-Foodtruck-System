/**
 * Customer Orders - Frontend JavaScript
 * Handles order listing, details, tracking, filtering, and "Order Again" functionality
 */

// ============================================
// Configuration & State
// ============================================

const API_BASE_URL = '/api';
let userId = null;
let customerId = null;
let orders = [];
let filteredOrders = [];
let currentOrderDetails = null;
let currentPage = 1;
const ordersPerPage = 10;
let pollingInterval = null;
let previousReadyOrders = new Set();

// Status progression for tracking
const STATUS_ORDER = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up'];
const STATUS_LABELS = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    preparing: 'Preparing',
    ready: 'Ready for Pickup',
    picked_up: 'Completed',
    cancelled: 'Cancelled',
    refunded: 'Refunded'
};

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
    
    // Get customer ID from user ID
    getCustomerId().then(() => {
        loadOrders();
        startPolling();
    });
    
    bindEventHandlers();
    
    // Setup logout handler
    $('#logoutBtn, .logout-btn').on('click', function() {
        API.logout();
    });
});

/**
 * Gets customer ID from user ID
 */
async function getCustomerId() {
    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/customers/user/${userId}`,
            method: 'GET'
        });
        
        if (response.success && response.data) {
            customerId = response.data.customer_id;
        }
    } catch (error) {
        console.error('Error fetching customer:', error);
        // Fallback: use userId as customerId for demo purposes
        customerId = userId;
    }
}

/**
 * Binds all event handlers
 */
function bindEventHandlers() {
    // Refresh button
    $('#refreshOrdersBtn').on('click', function() {
        const $btn = $(this);
        $btn.prop('disabled', true).html('<span class="spinner-border spinner-border-sm"></span>');
        
        loadOrders().finally(() => {
            $btn.prop('disabled', false).html('<i class="bi bi-arrow-clockwise"></i> Refresh');
        });
    });
    
    // Search input with debounce
    let searchTimeout;
    $('#searchOrders').on('input', function() {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            filterAndRenderOrders();
        }, 300);
    });
    
    // Status filter
    $('#statusFilter').on('change', function() {
        currentPage = 1;
        filterAndRenderOrders();
    });
    
    // Sort order
    $('#sortOrder').on('change', function() {
        filterAndRenderOrders();
    });
    
    // View order details
    $(document).on('click', '.view-order-btn, .order-number', function() {
        const orderId = $(this).data('order-id');
        viewOrderDetails(orderId);
    });
    
    // Order Again button
    $('#orderAgainBtn').on('click', function() {
        orderAgain();
    });
    
    // Quick Order Again from card
    $(document).on('click', '.quick-order-again-btn', function(e) {
        e.stopPropagation();
        const orderId = $(this).data('order-id');
        quickOrderAgain(orderId);
    });
}

// ============================================
// Data Loading
// ============================================

/**
 * Loads orders from API
 */
async function loadOrders() {
    showLoading(true);
    
    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/customers/${customerId}/orders`,
            method: 'GET',
            data: { limit: 100 }
        });
        
        showLoading(false);
        
        if (response.success && response.data) {
            orders = response.data;
            
            // Check for newly ready orders
            checkForReadyOrders();
            
            if (orders.length > 0) {
                filterAndRenderOrders();
                checkActiveOrders();
            } else {
                showEmptyState();
            }
        } else {
            showEmptyState();
        }
    } catch (error) {
        showLoading(false);
        console.error('Error loading orders:', error);
        
        if (error.status === 404) {
            showEmptyState();
        } else {
            showToast('Error', 'Failed to load orders. Please try again.', 'danger');
        }
    }
}

/**
 * Fetches detailed order information
 */
async function fetchOrderDetails(orderId) {
    try {
        const response = await $.ajax({
            url: `${API_BASE_URL}/orders/${orderId}`,
            method: 'GET'
        });
        
        if (response.success && response.data) {
            return response.data;
        }
        return null;
    } catch (error) {
        console.error('Error fetching order details:', error);
        return null;
    }
}

// ============================================
// Filtering & Sorting
// ============================================

/**
 * Filters and sorts orders based on current criteria
 */
function filterAndRenderOrders() {
    const searchTerm = $('#searchOrders').val().toLowerCase().trim();
    const statusFilter = $('#statusFilter').val();
    const sortOrder = $('#sortOrder').val();
    
    // Filter orders
    filteredOrders = orders.filter(order => {
        // Status filter
        if (statusFilter !== 'all' && order.order_status !== statusFilter) {
            return false;
        }
        
        // Search filter
        if (searchTerm) {
            const orderNum = (order.order_number || order.order_id.toString()).toLowerCase();
            const truckName = (order.food_truck_name || '').toLowerCase();
            
            if (!orderNum.includes(searchTerm) && !truckName.includes(searchTerm)) {
                return false;
            }
        }
        
        return true;
    });
    
    // Sort orders
    filteredOrders.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    
    // Render
    if (filteredOrders.length > 0) {
        renderOrders();
    } else if (orders.length > 0) {
        showNoResults();
    } else {
        showEmptyState();
    }
}

// ============================================
// Rendering
// ============================================

/**
 * Renders the orders list
 */
function renderOrders() {
    const startIdx = (currentPage - 1) * ordersPerPage;
    const endIdx = startIdx + ordersPerPage;
    const pageOrders = filteredOrders.slice(startIdx, endIdx);
    
    let html = '';
    
    pageOrders.forEach(order => {
        html += renderOrderCard(order);
    });
    
    $('#ordersContainer').html(html).show();
    $('#ordersEmpty').hide();
    
    renderPagination();
}

/**
 * Renders a single order card
 */
function renderOrderCard(order) {
    const orderNum = order.order_number || `#${order.order_id}`;
    const orderDate = formatDateTime(order.created_at);
    const pickupDate = order.slot_date ? formatDate(order.slot_date) : '';
    const pickupTime = order.start_time ? `${formatTime(order.start_time)} - ${formatTime(order.end_time)}` : '';
    const total = parseFloat(order.total_amount || 0).toFixed(2);
    const status = order.order_status;
    const statusLabel = STATUS_LABELS[status] || status;
    const statusClass = `status-${status}`;
    
    // Generate items preview (we'll show first 3 items)
    const itemsPreview = generateItemsPreview(order);
    
    // Determine if can order again (only completed orders)
    const canOrderAgain = ['picked_up', 'completed'].includes(status);
    
    return `
        <div class="order-card" data-order-id="${order.order_id}">
            <div class="order-card-header">
                <div>
                    <span class="order-number" data-order-id="${order.order_id}">${orderNum}</span>
                    <div class="order-date">${orderDate}</div>
                </div>
                <span class="status-badge ${statusClass}">
                    <i class="bi bi-circle-fill"></i> ${statusLabel}
                </span>
            </div>
            <div class="order-card-body">
                <div class="order-truck-info">
                    <div class="order-truck-logo">
                        <i class="bi bi-truck"></i>
                    </div>
                    <div>
                        <div class="order-truck-name">${order.food_truck_name || 'Food Truck'}</div>
                        <div class="order-truck-details">
                            ${pickupDate ? `<span class="pickup-badge"><i class="bi bi-clock"></i> ${pickupDate} ${pickupTime}</span>` : ''}
                        </div>
                    </div>
                </div>
                ${itemsPreview}
            </div>
            <div class="order-card-footer">
                <div class="order-total">$${total}</div>
                <div class="order-actions">
                    <button class="btn btn-outline-primary btn-sm view-order-btn" data-order-id="${order.order_id}">
                        <i class="bi bi-eye"></i> View Details
                    </button>
                    ${canOrderAgain ? `
                        <button class="btn btn-success btn-sm quick-order-again-btn" data-order-id="${order.order_id}">
                            <i class="bi bi-arrow-repeat"></i> Order Again
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * Generates items preview chips
 */
function generateItemsPreview(order) {
    // For now, show placeholder since items aren't in the list API
    // When viewing details, full items are fetched
    return `
        <div class="order-items-preview">
            <span class="order-item-chip">
                <i class="bi bi-bag"></i> Click to view items
            </span>
        </div>
    `;
}

/**
 * Renders pagination controls
 */
function renderPagination() {
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    
    if (totalPages <= 1) {
        $('#ordersPagination').hide();
        return;
    }
    
    let html = '';
    
    // Previous button
    html += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">
                <i class="bi bi-chevron-left"></i>
            </a>
        </li>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    // Next button
    html += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <i class="bi bi-chevron-right"></i>
            </a>
        </li>
    `;
    
    $('#ordersPagination ul').html(html);
    $('#ordersPagination').show();
    
    // Bind pagination clicks
    $('#ordersPagination a').on('click', function(e) {
        e.preventDefault();
        const page = parseInt($(this).data('page'));
        if (page >= 1 && page <= totalPages) {
            currentPage = page;
            renderOrders();
            $('html, body').animate({ scrollTop: 0 }, 300);
        }
    });
}

// ============================================
// Order Details Modal
// ============================================

/**
 * Views order details in modal
 */
async function viewOrderDetails(orderId) {
    const modal = new bootstrap.Modal('#orderDetailsModal');
    modal.show();
    
    // Show loading in modal
    $('#modalOrderItems').html('<tr><td colspan="4" class="text-center py-3"><div class="spinner-border spinner-border-sm"></div></td></tr>');
    
    const orderDetails = await fetchOrderDetails(orderId);
    
    if (!orderDetails) {
        showToast('Error', 'Failed to load order details', 'danger');
        modal.hide();
        return;
    }
    
    currentOrderDetails = orderDetails;
    renderOrderDetailsModal(orderDetails);
}

/**
 * Renders order details in modal
 */
function renderOrderDetailsModal(order) {
    const orderNum = order.order_number || `#${order.order_id}`;
    const status = order.order_status;
    const statusLabel = STATUS_LABELS[status] || status;
    const statusClass = `status-${status}`;
    
    // Header
    $('#modalOrderNumber').text(orderNum);
    
    // Truck & Pickup Info
    $('#modalTruckName').text(order.food_truck_name || 'Food Truck');
    
    const pickupDate = order.slot_date ? formatDate(order.slot_date) : '-';
    const pickupTime = order.start_time ? `${formatTime(order.start_time)} - ${formatTime(order.end_time)}` : '';
    $('#modalPickupTime').html(`<i class="bi bi-clock"></i> ${pickupDate} ${pickupTime}`);
    
    // Order Date
    $('#modalOrderDate').text(formatDateTime(order.created_at));
    $('#modalOrderStatus').removeClass().addClass(`status-badge ${statusClass}`).html(`<i class="bi bi-circle-fill"></i> ${statusLabel}`);
    
    // Update Progress Tracker
    updateProgressTracker(status);
    
    // Order Items
    renderOrderItems(order.items || []);
    
    // Totals
    $('#modalSubtotal').text(`$${parseFloat(order.subtotal || 0).toFixed(2)}`);
    $('#modalTax').text(`$${parseFloat(order.tax_amount || 0).toFixed(2)}`);
    $('#modalTotal').text(`$${parseFloat(order.total_amount || 0).toFixed(2)}`);
    
    // Special Instructions
    if (order.special_instructions) {
        $('#modalSpecialInstructions').text(order.special_instructions);
        $('#modalSpecialInstructionsSection').show();
    } else {
        $('#modalSpecialInstructionsSection').hide();
    }
    
    // Status History
    renderStatusHistory(order.status_history || []);
    
    // Order Again button visibility
    const canOrderAgain = ['picked_up', 'completed'].includes(status);
    $('#orderAgainBtn').toggle(canOrderAgain);
}

/**
 * Updates the progress tracker visualization
 */
function updateProgressTracker(currentStatus) {
    const $tracker = $('#orderProgressTracker');
    const $steps = $tracker.find('.tracker-step');
    const $lines = $tracker.find('.tracker-line');
    
    // Reset all
    $steps.removeClass('active completed cancelled');
    $lines.removeClass('completed');
    
    // Handle cancelled status
    if (currentStatus === 'cancelled' || currentStatus === 'refunded') {
        $steps.first().addClass('cancelled');
        return;
    }
    
    // Map status to step index
    const statusMap = {
        'pending': 0,
        'confirmed': 0,
        'preparing': 1,
        'ready': 2,
        'picked_up': 3,
        'completed': 3
    };
    
    const currentIdx = statusMap[currentStatus] ?? 0;
    
    $steps.each(function(idx) {
        if (idx < currentIdx) {
            $(this).addClass('completed');
        } else if (idx === currentIdx) {
            $(this).addClass('active');
        }
    });
    
    $lines.each(function(idx) {
        if (idx < currentIdx) {
            $(this).addClass('completed');
        }
    });
}

/**
 * Renders order items in modal
 */
function renderOrderItems(items) {
    if (!items || items.length === 0) {
        $('#modalOrderItems').html('<tr><td colspan="4" class="text-center text-muted py-3">No items found</td></tr>');
        return;
    }
    
    let html = '';
    
    items.forEach(item => {
        const itemName = item.menu_item_name || item.name || 'Menu Item';
        const quantity = item.quantity || 1;
        const unitPrice = parseFloat(item.unit_price || 0).toFixed(2);
        const totalPrice = parseFloat(item.total_price || 0).toFixed(2);
        const note = item.special_instructions;
        
        html += `
            <tr>
                <td>
                    <div class="fw-medium">${itemName}</div>
                    ${note ? `<span class="item-note"><i class="bi bi-chat-left-text"></i> ${note}</span>` : ''}
                </td>
                <td class="text-center">${quantity}</td>
                <td class="text-end">$${unitPrice}</td>
                <td class="text-end">$${totalPrice}</td>
            </tr>
        `;
    });
    
    $('#modalOrderItems').html(html);
}

/**
 * Renders status history timeline
 */
function renderStatusHistory(history) {
    if (!history || history.length === 0) {
        $('#modalStatusHistory').html('<p class="text-muted">No status history available</p>');
        return;
    }
    
    let html = '';
    
    history.forEach(entry => {
        const statusLabel = STATUS_LABELS[entry.new_status] || entry.new_status;
        const time = formatDateTime(entry.created_at);
        const reason = entry.change_reason;
        
        html += `
            <div class="timeline-item">
                <div class="timeline-status">${statusLabel}</div>
                <div class="timeline-time">${time}</div>
                ${reason ? `<div class="timeline-reason">${reason}</div>` : ''}
            </div>
        `;
    });
    
    $('#modalStatusHistory').html(html);
}

// ============================================
// Order Again Functionality
// ============================================

/**
 * Orders again from modal
 */
async function orderAgain() {
    if (!currentOrderDetails || !currentOrderDetails.items) {
        showToast('Error', 'No order details available', 'danger');
        return;
    }
    
    await addItemsToCart(currentOrderDetails.items, currentOrderDetails.food_truck_id);
}

/**
 * Quick order again from card
 */
async function quickOrderAgain(orderId) {
    const order = orders.find(o => o.order_id === orderId);
    if (!order) return;
    
    // Fetch full order details to get items
    const orderDetails = await fetchOrderDetails(orderId);
    
    if (!orderDetails || !orderDetails.items) {
        showToast('Error', 'Failed to load order items', 'danger');
        return;
    }
    
    await addItemsToCart(orderDetails.items, orderDetails.food_truck_id);
}

/**
 * Adds order items to cart
 */
async function addItemsToCart(items, foodTruckId) {
    showToast('Adding to Cart', 'Please wait...', 'info');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const item of items) {
        try {
            await $.ajax({
                url: `${API_BASE_URL}/cart`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({
                    user_id: parseInt(userId),
                    menu_item_id: item.menu_item_id,
                    quantity: item.quantity || 1,
                    food_truck_id: foodTruckId
                })
            });
            successCount++;
        } catch (error) {
            console.error('Error adding item to cart:', error);
            errorCount++;
        }
    }
    
    if (successCount > 0) {
        showToast('Success', `${successCount} item(s) added to cart!`, 'success');
        
        // Close modal if open
        const modalEl = document.getElementById('orderDetailsModal');
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) {
            modal.hide();
        }
        
        // Redirect to cart after short delay
        setTimeout(() => {
            window.location.href = '/customer/cart';
        }, 1500);
    }
    
    if (errorCount > 0) {
        showToast('Warning', `${errorCount} item(s) could not be added`, 'warning');
    }
}

// ============================================
// Active Orders & Notifications
// ============================================

/**
 * Checks for active orders and shows alert
 */
function checkActiveOrders() {
    const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
    const activeOrders = orders.filter(o => activeStatuses.includes(o.order_status));
    
    if (activeOrders.length > 0) {
        const readyOrders = activeOrders.filter(o => o.order_status === 'ready');
        const preparingOrders = activeOrders.filter(o => o.order_status === 'preparing');
        
        let text = '';
        if (readyOrders.length > 0) {
            text = `${readyOrders.length} order(s) ready for pickup!`;
        } else if (preparingOrders.length > 0) {
            text = `${preparingOrders.length} order(s) being prepared.`;
        } else {
            text = `${activeOrders.length} active order(s).`;
        }
        
        $('#activeOrdersText').text(text);
        $('#activeOrdersAlert').show();
    } else {
        $('#activeOrdersAlert').hide();
    }
}

/**
 * Checks for newly ready orders and shows notification
 */
function checkForReadyOrders() {
    const readyOrders = orders.filter(o => o.order_status === 'ready');
    
    readyOrders.forEach(order => {
        if (!previousReadyOrders.has(order.order_id)) {
            // New ready order - show notification
            showReadyNotification(order);
        }
    });
    
    // Update tracked ready orders
    previousReadyOrders = new Set(readyOrders.map(o => o.order_id));
}

/**
 * Shows order ready notification modal
 */
function showReadyNotification(order) {
    const orderNum = order.order_number || `#${order.order_id}`;
    
    $('#readyOrderNumber').text(orderNum);
    $('#readyTruckName').text(order.food_truck_name || 'Food Truck');
    
    const modal = new bootstrap.Modal('#orderReadyModal');
    modal.show();
    
    // Play notification sound if available
    playNotificationSound();
}

/**
 * Plays notification sound
 */
function playNotificationSound() {
    try {
        // Create a simple beep using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
        // Audio not available
    }
}

/**
 * Starts polling for order updates
 */
function startPolling() {
    // Poll every 30 seconds for order updates
    pollingInterval = setInterval(() => {
        loadOrders();
    }, 30000);
}

/**
 * Stops polling
 */
function stopPolling() {
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
}

// Clean up on page unload
$(window).on('beforeunload', function() {
    stopPolling();
});

// ============================================
// UI State Management
// ============================================

/**
 * Shows/hides loading state
 */
function showLoading(show) {
    if (show) {
        $('#ordersLoading').show();
        $('#ordersContainer').hide();
        $('#ordersEmpty').hide();
        $('#ordersPagination').hide();
    } else {
        $('#ordersLoading').hide();
    }
}

/**
 * Shows empty state
 */
function showEmptyState() {
    $('#ordersLoading').hide();
    $('#ordersContainer').hide();
    $('#ordersEmpty').show();
    $('#ordersPagination').hide();
    $('#activeOrdersAlert').hide();
}

/**
 * Shows no results state
 */
function showNoResults() {
    const html = `
        <div class="no-results">
            <i class="bi bi-search"></i>
            <h5>No orders found</h5>
            <p class="text-muted mb-0">Try adjusting your search or filter criteria</p>
        </div>
    `;
    
    $('#ordersContainer').html(html).show();
    $('#ordersEmpty').hide();
    $('#ordersPagination').hide();
}

// ============================================
// Utility Functions
// ============================================

/**
 * Formats date string to readable format
 */
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Formats datetime string to readable format
 */
function formatDateTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const options = { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    return date.toLocaleDateString('en-US', options);
}

/**
 * Formats time string (HH:MM:SS) to readable format
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
 * Shows a toast notification
 */
function showToast(title, message, type) {
    const $toast = $('#notificationToast');
    const $header = $toast.find('.toast-header');
    
    $header.removeClass('bg-success bg-danger bg-warning bg-info text-white');
    
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
