/**
 * Food Truck Dashboard - Frontend JavaScript
 * Uses jQuery for AJAX API requests
 */

const API_BASE_URL = '/api';
let currentTruckId = null;
let truckData = null;

// ============================================
// Initialization
// ============================================
$(document).ready(function() {
    // Check if user is authenticated owner
    const user = API.getUser();
    if (!user || user.user_type !== 'owner') {
        window.location.href = '/login';
        return;
    }
    
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    // Load dashboard data
    loadFoodTrucks();
    
    // Bind event handlers
    bindEventHandlers();
    
    // Auto-refresh every 60 seconds
    setInterval(refreshDashboard, 60000);
    
    // Setup logout handler
    $('#logoutBtn, .logout-btn').on('click', function() {
        API.logout();
    });
});

function updateCurrentTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    $('#currentTime').text(dateStr + ' ' + timeStr);
}

// ============================================
// Event Handlers
// ============================================
function bindEventHandlers() {
    // Order availability toggle
    $('#orderAvailabilityToggle').on('change', function() {
        if (!currentTruckId) {
            showToast('Error', 'No food truck loaded. Please refresh the page.', 'danger');
            $(this).prop('checked', !$(this).prop('checked')); // Revert
            return;
        }
        const isActive = $(this).prop('checked');
        updateTruckAvailability(isActive);
    });
}

// ============================================
// API Functions
// ============================================

// Load food trucks for the current owner
function loadFoodTrucks() {
    const user = API.getUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    // First get owner ID from user ID
    $.ajax({
        url: API_BASE_URL + '/owners/user/' + user.user_id,
        method: 'GET',
        success: function(ownerResponse) {
            if (ownerResponse.success && ownerResponse.data) {
                const ownerId = ownerResponse.data.owner_id;
                // Now get food trucks for this owner
                $.ajax({
                    url: API_BASE_URL + '/food-trucks?owner_id=' + ownerId,
                    method: 'GET',
                    success: function(response) {
                        if (response.success && response.data && response.data.length > 0) {
                            currentTruckId = response.data[0].food_truck_id;
                            loadTruckInfo(currentTruckId);
                            loadDashboardStats();
                            loadRecentOrders();
                        } else {
                            showNoTruckMessage();
                        }
                    },
                    error: function() {
                        showToast('Error', 'Failed to load food trucks', 'danger');
                    }
                });
            } else {
                showNoTruckMessage();
            }
        },
        error: function() {
            // Owner record might not exist, try to get any truck for demo
            $.ajax({
                url: API_BASE_URL + '/food-trucks',
                method: 'GET',
                success: function(response) {
                    if (response.success && response.data && response.data.length > 0) {
                        currentTruckId = response.data[0].food_truck_id;
                        loadTruckInfo(currentTruckId);
                        loadDashboardStats();
                        loadRecentOrders();
                    } else {
                        showNoTruckMessage();
                    }
                },
                error: function() {
                    showNoTruckMessage();
                }
            });
        }
    });
}

// Load truck information
function loadTruckInfo(truckId) {
    $.ajax({
        url: API_BASE_URL + '/food-trucks/' + truckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                truckData = response.data;
                renderTruckInfo(response.data);
            }
        },
        error: function() {
            showToast('Error', 'Failed to load truck information', 'danger');
        }
    });
}

// Load dashboard statistics
function loadDashboardStats() {
    // Load menu items count
    loadMenuItemsCount();
    
    // Load order statistics
    loadOrderStats();
}

// Load menu items count
function loadMenuItemsCount() {
    $.ajax({
        url: API_BASE_URL + '/menu-items?food_truck_id=' + currentTruckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                $('#totalMenuItems').text(response.data.length);
            }
        }
    });
}

// Load order statistics
function loadOrderStats() {
    $.ajax({
        url: API_BASE_URL + '/orders/stats/summary?food_truck_id=' + currentTruckId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const stats = response.data;
                $('#pendingOrdersCount').text(stats.pending_orders || 0);
                $('#completedOrdersCount').text(stats.completed_orders || 0);
                $('#todayRevenue').text(formatCurrency(stats.total_revenue || 0));
                
                // Show active orders alert if pending > 0
                const pendingCount = parseInt(stats.pending_orders) || 0;
                if (pendingCount > 0) {
                    $('#activeOrdersCount').text(pendingCount);
                    $('#activeOrdersAlert').show();
                } else {
                    $('#activeOrdersAlert').hide();
                }
            }
        }
    });
}

// Load recent orders (last 5)
function loadRecentOrders() {
    $.ajax({
        url: API_BASE_URL + '/orders?food_truck_id=' + currentTruckId + '&limit=5&offset=0',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                renderRecentOrders(response.data);
            }
        },
        error: function() {
            $('#recentOrdersBody').html('<tr><td colspan="6" class="text-center py-4 text-muted">Failed to load orders</td></tr>');
        }
    });
}

// Update truck availability status
function updateTruckAvailability(isActive) {
    $.ajax({
        url: API_BASE_URL + '/food-trucks/' + currentTruckId,
        method: 'PUT',
        contentType: 'application/json',
        data: JSON.stringify({ is_active: isActive }),
        success: function(response) {
            if (response.success) {
                updateAvailabilityUI(isActive);
                showToast('Success', isActive ? 'Now accepting orders' : 'Orders paused');
            }
        },
        error: function() {
            // Revert toggle on error
            $('#orderAvailabilityToggle').prop('checked', !isActive);
            showToast('Error', 'Failed to update status', 'danger');
        }
    });
}

// Refresh dashboard data
function refreshDashboard() {
    loadDashboardStats();
    loadRecentOrders();
}

// ============================================
// UI Rendering Functions
// ============================================

// Render truck information
function renderTruckInfo(truck) {
    $('#truckName').text(truck.name || 'My Food Truck');
    $('#truckCuisine span').text(truck.cuisine_type || 'Food Truck');
    $('#truckDescription').text(truck.description || 'Delicious food on wheels!');
    
    // Set truck logo
    if (truck.image_url) {
        $('#truckLogo').html('<img src="' + truck.image_url + '" alt="' + truck.name + '" class="truck-logo-img">');
    }
    
    // Set truck status
    const isActive = truck.is_active;
    updateTruckStatusBadge(isActive);
    $('#orderAvailabilityToggle').prop('checked', isActive);
    updateAvailabilityUI(isActive);
}

// Update truck status badge
function updateTruckStatusBadge(isActive) {
    const badge = $('#truckStatusBadge');
    if (isActive) {
        badge.removeClass('status-inactive').addClass('status-active');
        badge.html('<i class="bi bi-circle-fill"></i> <span>Open</span>');
    } else {
        badge.removeClass('status-active').addClass('status-inactive');
        badge.html('<i class="bi bi-circle-fill"></i> <span>Closed</span>');
    }
}

// Update availability UI
function updateAvailabilityUI(isActive) {
    const statusText = $('#availabilityStatus');
    if (isActive) {
        statusText.text('Accepting Orders').removeClass('text-danger').addClass('text-success');
        updateTruckStatusBadge(true);
    } else {
        statusText.text('Not Accepting Orders').removeClass('text-success').addClass('text-danger');
        updateTruckStatusBadge(false);
    }
}

// Render recent orders table
function renderRecentOrders(orders) {
    if (!orders || orders.length === 0) {
        $('#recentOrdersBody').html('<tr><td colspan="6" class="text-center py-4"><div class="empty-state-sm"><i class="bi bi-inbox"></i><p class="mb-0 text-muted">No recent orders</p></div></td></tr>');
        return;
    }
    
    let html = '';
    orders.forEach(function(order) {
        const timeAgo = getTimeAgo(order.created_at);
        
        html += '<tr>' +
            '<td><a href="/orders?id=' + order.order_id + '" class="order-link">#' + (order.order_number || order.order_id) + '</a></td>' +
            '<td>' + (order.customer_name || 'Customer') + '</td>' +
            '<td><span class="badge bg-secondary">' + (order.item_count || '-') + '</span></td>' +
            '<td class="fw-bold text-success">' + formatCurrency(order.total_amount) + '</td>' +
            '<td><span class="status-badge badge-' + order.order_status + '">' + formatStatus(order.order_status) + '</span></td>' +
            '<td><small class="text-muted">' + timeAgo + '</small></td>' +
            '</tr>';
    });
    
    $('#recentOrdersBody').html(html);
}

// Show message when no truck is found
function showNoTruckMessage() {
    $('#truckName').html('No Food Truck Yet <a href="/create-truck" class="btn btn-sm btn-primary ms-2"><i class="bi bi-plus-circle"></i> Create One</a>');
    $('#truckCuisine span').text('-');
    $('#truckDescription').text('Create your food truck to start receiving orders!');
    $('#orderAvailabilityToggle').prop('disabled', true);
    $('#totalMenuItems').text('0');
    $('#pendingOrdersCount').text('0');
    $('#completedOrdersCount').text('0');
    $('#recentOrdersBody').html('<tr><td colspan="5" class="text-center py-4 text-muted">Create a food truck to see orders</td></tr>');
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount) {
    return '$' + (parseFloat(amount) || 0).toFixed(2);
}

function formatStatus(status) {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').replace(/\b\w/g, function(l) { return l.toUpperCase(); });
}

function getTimeAgo(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return diffMins + ' min ago';
    if (diffHours < 24) return diffHours + ' hr ago';
    if (diffDays === 1) return 'Yesterday';
    return diffDays + ' days ago';
}

function showToast(title, message, type) {
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    
    const toastEl = document.getElementById('notificationToast');
    const toastHeader = toastEl.querySelector('.toast-header');
    
    // Reset classes
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'text-white');
    
    if (type === 'danger') {
        toastHeader.classList.add('bg-danger', 'text-white');
    } else if (type === 'warning') {
        toastHeader.classList.add('bg-warning');
    } else {
        toastHeader.classList.add('bg-success', 'text-white');
    }
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
