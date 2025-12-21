/**
 * Truck Orders Page JavaScript
 * Displays and manages orders for truck owners
 */

let truckId = null;
let allOrders = [];
let currentStatus = 'all';
let currentOrderId = null;

$(document).ready(function() {
    // Check authentication
    const user = API.getUser();
    if (!user || user.user_type !== 'owner') {
        window.location.href = '/';
        return;
    }
    
    // Update time
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    // Load truck and orders
    loadTruckAndOrders();
    
    // Event handlers
    $('#statusTabs .nav-link').on('click', function(e) {
        e.preventDefault();
        currentStatus = $(this).data('status');
        $('#statusTabs .nav-link').removeClass('active');
        $(this).addClass('active');
        filterOrders();
    });
    
    $('#refreshBtn').on('click', loadOrders);
    
    $(document).on('click', '.view-order-btn', function() {
        viewOrderDetails($(this).data('order-id'));
    });
    
    $(document).on('click', '.update-status-btn', function() {
        openStatusModal($(this).data('order-id'), $(this).data('current-status'));
    });
    
    $('#confirmStatusBtn').on('click', updateOrderStatus);
    
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
    
    // Auto-refresh
    setInterval(loadOrders, 30000);
});

function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    $('#currentTime').text(dateStr + ' ' + timeStr);
}

function loadTruckAndOrders() {
    $.ajax({
        url: '/api/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                truckId = response.data[0].food_truck_id;
                loadOrders();
            }
        }
    });
}

function loadOrders() {
    $('#ordersTableBody').html('<tr><td colspan="7" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>');
    
    $.ajax({
        url: '/api/orders?food_truck_id=' + truckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                allOrders = response.data;
                filterOrders();
            } else {
                $('#ordersTableBody').html('<tr><td colspan="7" class="text-center py-5">No orders found</td></tr>');
            }
        },
        error: function() {
            $('#ordersTableBody').html('<tr><td colspan="7" class="text-center py-5 text-danger">Failed to load orders</td></tr>');
        }
    });
}

function filterOrders() {
    let filtered = allOrders;
    
    if (currentStatus !== 'all') {
        filtered = allOrders.filter(order => order.order_status === currentStatus);
    }
    
    renderOrders(filtered);
}

function renderOrders(orders) {
    if (!orders || orders.length === 0) {
        $('#ordersTableBody').html('<tr><td colspan="7" class="text-center py-5">No orders found</td></tr>');
        return;
    }
    
    let html = '';
    orders.forEach(function(order) {
        const statusClass = getStatusClass(order.order_status);
        const statusLabel = formatStatus(order.order_status);
        const pickupTime = order.start_time ? formatTime(order.start_time) + ' - ' + formatTime(order.end_time) : '-';
        
        html += `
            <tr>
                <td><strong>#${order.order_number || order.order_id}</strong></td>
                <td>${escapeHtml(order.customer_name || 'Customer')}</td>
                <td><span class="badge bg-secondary">${order.item_count || '-'} items</span></td>
                <td><strong>$${parseFloat(order.total_amount || 0).toFixed(2)}</strong></td>
                <td><small>${order.slot_date || '-'}<br>${pickupTime}</small></td>
                <td><span class="badge ${statusClass}">${statusLabel}</span></td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary view-order-btn" data-order-id="${order.order_id}" title="View Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn btn-outline-secondary update-status-btn" data-order-id="${order.order_id}" data-current-status="${order.order_status}" title="Update Status">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    $('#ordersTableBody').html(html);
}

function viewOrderDetails(orderId) {
    $.ajax({
        url: '/api/orders/' + orderId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                renderOrderDetails(response.data);
                new bootstrap.Modal('#orderDetailsModal').show();
            }
        },
        error: function() {
            showToast('Error', 'Failed to load order details', 'danger');
        }
    });
}

function renderOrderDetails(order) {
    const statusClass = getStatusClass(order.order_status);
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(function(item) {
            const subtotal = (parseFloat(item.price) * item.quantity).toFixed(2);
            itemsHtml += `
                <tr>
                    <td>${escapeHtml(item.name)}</td>
                    <td class="text-center">${item.quantity}</td>
                    <td class="text-end">$${parseFloat(item.price).toFixed(2)}</td>
                    <td class="text-end">$${subtotal}</td>
                </tr>
            `;
        });
    }
    
    const html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h5 class="mb-0">Order #${order.order_number || order.order_id}</h5>
            <span class="badge ${statusClass}">${formatStatus(order.order_status)}</span>
        </div>
        <div class="row mb-3">
            <div class="col-md-6">
                <p class="mb-1"><strong>Customer:</strong> ${escapeHtml(order.customer_name || 'Customer')}</p>
                <p class="mb-1"><strong>Date:</strong> ${formatDate(order.created_at)}</p>
            </div>
            <div class="col-md-6">
                <p class="mb-1"><strong>Pickup:</strong> ${order.slot_date || '-'}</p>
                <p class="mb-1"><strong>Time:</strong> ${order.start_time ? formatTime(order.start_time) + ' - ' + formatTime(order.end_time) : '-'}</p>
            </div>
        </div>
        <hr>
        <h6>Order Items</h6>
        <table class="table table-sm">
            <thead>
                <tr><th>Item</th><th class="text-center">Qty</th><th class="text-end">Price</th><th class="text-end">Subtotal</th></tr>
            </thead>
            <tbody>${itemsHtml || '<tr><td colspan="4" class="text-center text-muted">No items</td></tr>'}</tbody>
            <tfoot>
                <tr class="table-light">
                    <td colspan="3" class="text-end"><strong>Total:</strong></td>
                    <td class="text-end"><strong>$${parseFloat(order.total_amount || 0).toFixed(2)}</strong></td>
                </tr>
            </tfoot>
        </table>
        ${order.special_instructions ? `<p class="mt-3"><strong>Special Instructions:</strong><br>${escapeHtml(order.special_instructions)}</p>` : ''}
    `;
    
    $('#orderDetailsBody').html(html);
}

function openStatusModal(orderId, currentStatus) {
    currentOrderId = orderId;
    $('#updateOrderId').text('#' + orderId);
    $('#newStatusSelect').val(currentStatus);
    new bootstrap.Modal('#statusUpdateModal').show();
}

function updateOrderStatus() {
    const newStatus = $('#newStatusSelect').val();
    
    $.ajax({
        url: '/api/orders/' + currentOrderId + '/status',
        method: 'PATCH',
        contentType: 'application/json',
        data: JSON.stringify({ status: newStatus, changed_by: 'truck_owner' }),
        success: function(response) {
            if (response.success) {
                bootstrap.Modal.getInstance(document.getElementById('statusUpdateModal')).hide();
                showToast('Success', 'Order status updated to ' + formatStatus(newStatus), 'success');
                loadOrders();
            }
        },
        error: function() {
            showToast('Error', 'Failed to update status', 'danger');
        }
    });
}

function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'bg-warning text-dark';
        case 'preparing': return 'bg-primary';
        case 'ready': return 'bg-success';
        case 'completed': case 'picked_up': return 'bg-secondary';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function formatStatus(status) {
    const labels = { pending: 'Pending', preparing: 'Preparing', ready: 'Ready', picked_up: 'Completed', completed: 'Completed', cancelled: 'Cancelled' };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    return (hour % 12 || 12) + ':' + minutes + ' ' + ampm;
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
