/**
 * Owner Dashboard Page JavaScript
 * Displays truck owner dashboard with stats and quick actions
 */

let truckId = null;
let truckData = null;

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
    
    // Load data
    loadTruckInfo();
    
    // Event handlers
    $('#orderAvailabilityToggle').on('change', function() {
        updateAvailability($(this).prop('checked'));
    });
    
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
    
    // Auto-refresh
    setInterval(refreshDashboard, 60000);
});

function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    $('#currentTime').text(dateStr + ' ' + timeStr);
}

function loadTruckInfo() {
    $.ajax({
        url: '/api/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                // Get owner's truck (first one for now)
                truckData = response.data[0];
                truckId = truckData.food_truck_id;
                renderTruckInfo();
                loadStats();
                loadRecentOrders();
            } else {
                $('#truckName').text('No truck found');
            }
        }
    });
}

function renderTruckInfo() {
    $('#truckName').text(truckData.name || 'My Food Truck');
    $('#truckCuisine span').text(truckData.cuisine_type || 'Food Truck');
    
    if (truckData.image_url) {
        $('#truckLogo').html(`<img src="${truckData.image_url}" alt="${truckData.name}" style="width:60px;height:60px;object-fit:cover;border-radius:10px;">`);
    }
    
    updateStatusUI(truckData.is_active);
    $('#orderAvailabilityToggle').prop('checked', truckData.is_active);
}

function updateStatusUI(isActive) {
    const badge = $('#truckStatusBadge');
    const statusText = $('#availabilityStatus');
    
    if (isActive) {
        badge.removeClass('status-inactive').addClass('status-active');
        badge.html('<i class="bi bi-circle-fill"></i> <span>Open</span>');
        statusText.text('Accepting Orders').removeClass('text-danger').addClass('text-success');
    } else {
        badge.removeClass('status-active').addClass('status-inactive');
        badge.html('<i class="bi bi-circle-fill"></i> <span>Closed</span>');
        statusText.text('Not Accepting Orders').removeClass('text-success').addClass('text-danger');
    }
}

function loadStats() {
    // Menu items count
    $.ajax({
        url: '/api/menu-items?food_truck_id=' + truckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                $('#totalMenuItems').text(response.data.length);
            }
        }
    });
    
    // Order stats
    $.ajax({
        url: '/api/orders/stats/summary?food_truck_id=' + truckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                $('#pendingOrdersCount').text(response.data.pending_orders || 0);
                $('#completedOrdersCount').text(response.data.completed_orders || 0);
            }
        }
    });
}

function loadRecentOrders() {
    $.ajax({
        url: '/api/orders?food_truck_id=' + truckId + '&limit=5',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data && response.data.length > 0) {
                renderRecentOrders(response.data);
            } else {
                $('#recentOrdersBody').html('<tr><td colspan="5" class="text-center py-4 text-muted">No recent orders</td></tr>');
            }
        },
        error: function() {
            $('#recentOrdersBody').html('<tr><td colspan="5" class="text-center py-4 text-muted">Failed to load orders</td></tr>');
        }
    });
}

function renderRecentOrders(orders) {
    let html = '';
    
    orders.forEach(function(order) {
        const statusClass = getStatusClass(order.order_status);
        const timeAgo = getTimeAgo(order.created_at);
        
        html += `
            <tr>
                <td><a href="/truckOrders?id=${order.order_id}">#${order.order_number || order.order_id}</a></td>
                <td>${escapeHtml(order.customer_name || 'Customer')}</td>
                <td><span class="badge ${statusClass}">${formatStatus(order.order_status)}</span></td>
                <td>$${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                <td><small class="text-muted">${timeAgo}</small></td>
            </tr>
        `;
    });
    
    $('#recentOrdersBody').html(html);
}

function updateAvailability(isActive) {
    $.ajax({
        url: '/api/food-trucks/' + truckId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ is_active: isActive }),
        success: function(response) {
            if (response.success) {
                updateStatusUI(isActive);
                showToast('Success', isActive ? 'Now accepting orders' : 'Orders paused', 'success');
            }
        },
        error: function() {
            $('#orderAvailabilityToggle').prop('checked', !isActive);
            showToast('Error', 'Failed to update status', 'danger');
        }
    });
}

function refreshDashboard() {
    loadStats();
    loadRecentOrders();
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

function getTimeAgo(dateStr) {
    if (!dateStr) return '-';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return mins + ' min ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + ' hr ago';
    return Math.floor(hours / 24) + ' days ago';
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
