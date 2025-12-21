/**
 * My Orders Page JavaScript
 * Displays customer's order history
 */

let orders = [];
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
    
    // Load orders
    loadOrders();
    
    // Event handlers
    $('#refreshBtn').on('click', loadOrders);
    
    $(document).on('click', '.view-details-btn', function() {
        const orderId = $(this).data('order-id');
        viewOrderDetails(orderId);
    });
    
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
});

function loadOrders() {
    $('#loadingState').show();
    $('#emptyState').hide();
    $('#ordersList').hide();
    
    $.ajax({
        url: '/api/orders?customer_id=' + userId,
        method: 'GET',
        success: function(response) {
            $('#loadingState').hide();
            
            if (response.success && response.data && response.data.length > 0) {
                orders = response.data;
                renderOrders();
                $('#ordersList').show();
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

function renderOrders() {
    let html = '';
    
    orders.forEach(function(order) {
        const statusClass = getStatusClass(order.order_status);
        const statusLabel = formatStatus(order.order_status);
        const orderDate = formatDate(order.created_at);
        const total = parseFloat(order.total_amount || 0).toFixed(2);
        
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-2">
                            <h6 class="mb-0">#${order.order_number || order.order_id}</h6>
                            <small class="text-muted">${orderDate}</small>
                        </div>
                        <div class="col-md-3">
                            <i class="bi bi-truck text-primary me-2"></i>
                            ${escapeHtml(order.food_truck_name || 'Food Truck')}
                        </div>
                        <div class="col-md-2">
                            <span class="badge ${statusClass}">${statusLabel}</span>
                        </div>
                        <div class="col-md-2">
                            <strong>$${total}</strong>
                        </div>
                        <div class="col-md-3 text-end">
                            <button class="btn btn-outline-primary btn-sm view-details-btn" data-order-id="${order.order_id}">
                                <i class="bi bi-eye"></i> View Details
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#ordersList').html(html);
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
    const statusLabel = formatStatus(order.order_status);
    
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
        <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h5 class="mb-0">Order #${order.order_number || order.order_id}</h5>
                <span class="badge ${statusClass}">${statusLabel}</span>
            </div>
            <p class="text-muted mb-1"><i class="bi bi-calendar"></i> ${formatDate(order.created_at)}</p>
            <p class="text-muted mb-0"><i class="bi bi-truck"></i> ${escapeHtml(order.food_truck_name || 'Food Truck')}</p>
        </div>
        <hr>
        <h6>Order Items</h6>
        <table class="table table-sm">
            <thead>
                <tr>
                    <th>Item</th>
                    <th class="text-center">Qty</th>
                    <th class="text-end">Price</th>
                    <th class="text-end">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml || '<tr><td colspan="4" class="text-center text-muted">No items</td></tr>'}
            </tbody>
            <tfoot>
                <tr class="table-light">
                    <td colspan="3" class="text-end"><strong>Total:</strong></td>
                    <td class="text-end"><strong>$${parseFloat(order.total_amount || 0).toFixed(2)}</strong></td>
                </tr>
            </tfoot>
        </table>
    `;
    
    $('#orderDetailsBody').html(html);
}

function getStatusClass(status) {
    switch(status) {
        case 'pending': return 'bg-warning text-dark';
        case 'confirmed': return 'bg-info text-white';
        case 'preparing': return 'bg-primary';
        case 'ready': return 'bg-success';
        case 'picked_up':
        case 'completed': return 'bg-secondary';
        case 'cancelled': return 'bg-danger';
        default: return 'bg-secondary';
    }
}

function formatStatus(status) {
    const labels = {
        pending: 'Pending',
        confirmed: 'Confirmed',
        preparing: 'Preparing',
        ready: 'Ready',
        picked_up: 'Completed',
        completed: 'Completed',
        cancelled: 'Cancelled'
    };
    return labels[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
    
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    new bootstrap.Toast(document.getElementById('notificationToast')).show();
}
