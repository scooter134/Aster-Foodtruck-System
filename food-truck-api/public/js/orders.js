/**
 * Food Truck Order Management - Frontend JavaScript
 * Uses jQuery for AJAX API requests
 */

const API_BASE_URL = '/api';
let currentPage = 1;
const pageSize = 20;
let currentStatus = 'all';
let currentFoodTruckId = null;
let allOrders = [];
let selectedOrders = [];
let currentOrderId = null;
let pendingStatusUpdate = null;

// ============================================
// Initialization
// ============================================
$(document).ready(function() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    loadFoodTrucks();
    loadOrders();
    loadOrderStats();
    bindEventHandlers();
    setInterval(function() { loadOrders(); loadOrderStats(); }, 30000);
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
    $('#statusTabs .nav-link').on('click', function(e) {
        e.preventDefault();
        filterByStatus($(this).data('status'));
    });
    
    $('#foodTruckSelector').on('change', function() {
        currentFoodTruckId = $(this).val() || null;
        currentPage = 1;
        loadOrders();
        loadOrderStats();
    });
    
    $('#refreshBtn').on('click', function() {
        loadOrders();
        loadOrderStats();
        showToast('Refreshed', 'Orders updated successfully');
    });
    
    $('#selectAllOrders').on('change', function() {
        $('.order-checkbox').prop('checked', $(this).prop('checked'));
        updateSelectedOrders();
    });
    
    $(document).on('change', '.order-checkbox', updateSelectedOrders);
    
    $('#bulkUpdateBtn').on('click', function() {
        $('#bulkCount').text(selectedOrders.length);
        new bootstrap.Modal('#bulkUpdateModal').show();
    });
    
    $('#applyBulkUpdateBtn').on('click', function() {
        const newStatus = $('#bulkStatusSelect').val();
        if (newStatus) bulkUpdateStatus(newStatus);
    });
    
    $(document).on('click', '.order-number, .view-order-btn', function() {
        viewOrderDetails($(this).data('order-id'));
    });
    
    $(document).on('click', '.status-update-item', function(e) {
        e.preventDefault();
        prepareStatusUpdate($(this).closest('.dropdown').data('order-id'), $(this).data('status'));
    });
    
    $('#modalStatusDropdown').on('click', '.dropdown-item', function(e) {
        e.preventDefault();
        prepareStatusUpdate(currentOrderId, $(this).data('status'));
    });
    
    $('#confirmStatusBtn').on('click', confirmStatusUpdate);
}

function updateSelectedOrders() {
    selectedOrders = [];
    $('.order-checkbox:checked').each(function() { selectedOrders.push(parseInt($(this).val())); });
    $('#bulkUpdateBtn').prop('disabled', selectedOrders.length === 0);
}

function filterByStatus(status) {
    currentStatus = status;
    currentPage = 1;
    $('#statusTabs .nav-link').removeClass('active');
    $('#statusTabs .nav-link[data-status="' + status + '"]').addClass('active');
    loadOrders();
}

// ============================================
// API Functions
// ============================================
function loadFoodTrucks() {
    $.ajax({
        url: API_BASE_URL + '/food-trucks',
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const selector = $('#foodTruckSelector');
                selector.empty().append('<option value="">All Food Trucks</option>');
                response.data.forEach(function(truck) {
                    selector.append('<option value="' + truck.food_truck_id + '">' + truck.name + '</option>');
                });
            }
        }
    });
}

function loadOrders() {
    let url = API_BASE_URL + '/orders?limit=' + pageSize + '&offset=' + ((currentPage - 1) * pageSize);
    if (currentFoodTruckId) url += '&food_truck_id=' + currentFoodTruckId;
    if (currentStatus !== 'all') url += '&status=' + currentStatus;
    
    $('#ordersTableBody').html('<tr><td colspan="9" class="text-center py-5"><div class="spinner-border text-primary"></div></td></tr>');
    
    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            if (response.success) {
                allOrders = response.data;
                renderOrdersTable(response.data);
                renderPagination(response.pagination);
            }
        },
        error: function() {
            $('#ordersTableBody').html('<tr><td colspan="9" class="text-center py-5"><div class="empty-state"><i class="bi bi-exclamation-circle"></i><h5>Error loading orders</h5></div></td></tr>');
        }
    });
}

function loadOrderStats() {
    let url = API_BASE_URL + '/orders/stats/summary';
    if (currentFoodTruckId) url += '?food_truck_id=' + currentFoodTruckId;
    
    $.ajax({
        url: url,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                const s = response.data;
                $('#totalOrders').text(s.total_orders || 0);
                $('#pendingOrders').text(s.pending_orders || 0);
                $('#preparingOrders').text(s.preparing_orders || 0);
                $('#readyOrders').text(s.ready_orders || 0);
                $('#completedOrders').text(s.completed_orders || 0);
                $('#totalRevenue').text(formatCurrency(s.total_revenue || 0));
                $('#avgOrderValue').text(formatCurrency(s.average_order_value || 0));
            }
        }
    });
}

function viewOrderDetails(orderId) {
    currentOrderId = orderId;
    $.ajax({
        url: API_BASE_URL + '/orders/' + orderId,
        method: 'GET',
        success: function(response) {
            if (response.success && response.data) {
                renderOrderModal(response.data);
                new bootstrap.Modal('#orderDetailsModal').show();
            }
        },
        error: function() { showToast('Error', 'Failed to load order details', 'danger'); }
    });
}

function updateOrderStatus(orderId, newStatus, reason) {
    $.ajax({
        url: API_BASE_URL + '/orders/' + orderId + '/status',
        method: 'PATCH',
        contentType: 'application/json',
        data: JSON.stringify({ status: newStatus, changed_by: 'truck_owner', change_reason: reason }),
        success: function(response) {
            if (response.success) {
                showToast('Success', 'Order status updated to ' + formatStatus(newStatus));
                loadOrders();
                loadOrderStats();
                bootstrap.Modal.getInstance(document.getElementById('statusConfirmModal'))?.hide();
                bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'))?.hide();
            }
        },
        error: function() { showToast('Error', 'Failed to update order status', 'danger'); }
    });
}

function bulkUpdateStatus(newStatus) {
    let completed = 0;
    selectedOrders.forEach(function(orderId) {
        $.ajax({
            url: API_BASE_URL + '/orders/' + orderId + '/status',
            method: 'PATCH',
            contentType: 'application/json',
            data: JSON.stringify({ status: newStatus, changed_by: 'truck_owner' }),
            success: function() {
                completed++;
                if (completed === selectedOrders.length) {
                    showToast('Success', selectedOrders.length + ' orders updated');
                    selectedOrders = [];
                    $('#selectAllOrders').prop('checked', false);
                    loadOrders();
                    loadOrderStats();
                    bootstrap.Modal.getInstance(document.getElementById('bulkUpdateModal'))?.hide();
                }
            }
        });
    });
}

// ============================================
// UI Rendering
// ============================================
function renderOrdersTable(orders) {
    if (!orders || orders.length === 0) {
        $('#ordersTableBody').html('<tr><td colspan="9" class="text-center py-5"><div class="empty-state"><i class="bi bi-inbox"></i><h5>No orders found</h5></div></td></tr>');
        return;
    }
    
    let html = '';
    orders.forEach(function(order) {
        const pickup = formatPickupTime(order.slot_date, order.start_time, order.end_time);
        const timeClass = getTimeSlotClass(order.slot_date, order.start_time);
        
        html += '<tr data-order-id="' + order.order_id + '">' +
            '<td><input type="checkbox" class="form-check-input order-checkbox" value="' + order.order_id + '"></td>' +
            '<td><span class="order-number" data-order-id="' + order.order_id + '">#' + (order.order_number || order.order_id) + '</span></td>' +
            '<td><div class="customer-name">' + (order.customer_name || 'N/A') + '</div><div class="customer-email">' + (order.customer_email || '') + '</div></td>' +
            '<td><span class="badge bg-secondary">' + (order.item_count || '-') + ' items</span></td>' +
            '<td><span class="order-total">' + formatCurrency(order.total_amount) + '</span></td>' +
            '<td><div class="pickup-time"><span class="time-slot-indicator ' + timeClass + '"></span><span class="pickup-date">' + pickup.date + '</span><span class="pickup-slot">' + pickup.time + '</span></div></td>' +
            '<td><span class="status-badge badge-' + order.order_status + '">' + formatStatus(order.order_status) + '</span></td>' +
            '<td><span class="badge payment-' + order.payment_status + '">' + formatStatus(order.payment_status) + '</span></td>' +
            '<td><button class="btn btn-sm btn-outline-primary btn-action view-order-btn" data-order-id="' + order.order_id + '"><i class="bi bi-eye"></i></button>' +
            '<div class="dropdown d-inline-block" data-order-id="' + order.order_id + '"><button class="btn btn-sm btn-outline-secondary btn-action dropdown-toggle" data-bs-toggle="dropdown"><i class="bi bi-pencil"></i></button>' +
            '<ul class="dropdown-menu">' + getStatusDropdownItems(order.order_status) + '</ul></div></td></tr>';
    });
    $('#ordersTableBody').html(html);
}

function getStatusDropdownItems(currentStatus) {
    const flow = { pending: ['confirmed','cancelled'], confirmed: ['preparing','cancelled'], preparing: ['ready','cancelled'], ready: ['picked_up','cancelled'], picked_up: [], cancelled: [] };
    const icons = { confirmed: 'check-circle', preparing: 'fire', ready: 'bell', picked_up: 'bag-check', cancelled: 'x-circle' };
    const available = flow[currentStatus] || [];
    if (available.length === 0) return '<li><span class="dropdown-item text-muted">No actions</span></li>';
    return available.map(function(s) {
        return '<li><a class="dropdown-item status-update-item' + (s === 'cancelled' ? ' text-danger' : '') + '" href="#" data-status="' + s + '"><i class="bi bi-' + (icons[s] || 'arrow-right') + '"></i> ' + formatStatus(s) + '</a></li>';
    }).join('');
}

function renderPagination(pagination) {
    if (!pagination) return;
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    const current = pagination.offset / pagination.limit + 1;
    $('#paginationInfo').text('Showing ' + (pagination.offset + 1) + '-' + Math.min(pagination.offset + pagination.limit, pagination.total) + ' of ' + pagination.total + ' orders');
    if (totalPages <= 1) { $('#pagination').empty(); return; }
    
    let html = '<li class="page-item' + (current === 1 ? ' disabled' : '') + '"><a class="page-link" href="#" data-page="' + (current - 1) + '"><i class="bi bi-chevron-left"></i></a></li>';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
            html += '<li class="page-item' + (i === current ? ' active' : '') + '"><a class="page-link" href="#" data-page="' + i + '">' + i + '</a></li>';
        } else if (i === current - 3 || i === current + 3) {
            html += '<li class="page-item disabled"><span class="page-link">...</span></li>';
        }
    }
    html += '<li class="page-item' + (current === totalPages ? ' disabled' : '') + '"><a class="page-link" href="#" data-page="' + (current + 1) + '"><i class="bi bi-chevron-right"></i></a></li>';
    $('#pagination').html(html);
    $('#pagination .page-link').on('click', function(e) { e.preventDefault(); const p = $(this).data('page'); if (p && p !== currentPage) { currentPage = p; loadOrders(); } });
}

function renderOrderModal(order) {
    $('#modalOrderNumber').text('#' + (order.order_number || order.order_id));
    $('#modalCustomerName').text(order.customer_name || 'N/A');
    $('#modalCustomerEmail').text(order.customer_email || 'N/A');
    $('#modalCustomerPhone').text(order.customer_phone || 'N/A');
    $('#modalOrderStatus').html('<span class="status-badge badge-' + order.order_status + '">' + formatStatus(order.order_status) + '</span>');
    $('#modalPickupTime').text(formatPickupTime(order.slot_date, order.start_time, order.end_time).full);
    $('#modalPaymentStatus').html('<span class="badge payment-' + order.payment_status + '">' + formatStatus(order.payment_status) + '</span>');
    
    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        order.items.forEach(function(item) {
            itemsHtml += '<tr><td><strong>' + item.menu_item_name + '</strong></td><td>' + item.quantity + '</td><td>' + formatCurrency(item.unit_price) + '</td><td>' + formatCurrency(item.total_price) + '</td><td>' + (item.special_instructions || '-') + '</td></tr>';
        });
    } else { itemsHtml = '<tr><td colspan="5" class="text-center text-muted">No items</td></tr>'; }
    $('#modalOrderItems').html(itemsHtml);
    $('#modalSubtotal').text(formatCurrency(order.subtotal));
    $('#modalTax').text(formatCurrency(order.tax_amount));
    $('#modalTotal').html('<strong>' + formatCurrency(order.total_amount) + '</strong>');
    
    if (order.special_instructions) { $('#specialInstructionsSection').show(); $('#modalSpecialInstructions').text(order.special_instructions); }
    else { $('#specialInstructionsSection').hide(); }
    
    if (order.allergy_notes && order.allergy_notes.length > 0) {
        $('#allergyNotesSection').show();
        let allergyHtml = '';
        order.allergy_notes.forEach(function(note) {
            allergyHtml += '<div class="allergy-note' + (note.severity === 'severe' ? ' severity-severe' : '') + '"><span class="allergy-type">' + note.allergy_type + '</span> <span class="badge ' + (note.severity === 'severe' ? 'bg-danger' : 'bg-warning text-dark') + '">' + note.severity + '</span>' + (note.notes ? '<p class="mb-0 mt-1">' + note.notes + '</p>' : '') + '</div>';
        });
        $('#modalAllergyNotes').html(allergyHtml);
    } else { $('#allergyNotesSection').hide(); }
    
    if (order.status_history && order.status_history.length > 0) {
        let historyHtml = '';
        order.status_history.forEach(function(entry) {
            historyHtml += '<div class="timeline-item"><div class="timeline-status">' + formatStatus(entry.new_status) + '</div><div class="timeline-time">' + new Date(entry.created_at).toLocaleString() + '</div>' + (entry.change_reason ? '<div class="timeline-reason">' + entry.change_reason + '</div>' : '') + '</div>';
        });
        $('#modalStatusHistory').html(historyHtml);
    } else { $('#modalStatusHistory').html('<p class="text-muted">No history</p>'); }
    
    $('#modalStatusDropdown').html(getStatusDropdownItems(order.order_status));
}

// ============================================
// Status Update Helpers
// ============================================
function prepareStatusUpdate(orderId, newStatus) {
    pendingStatusUpdate = { orderId: orderId, newStatus: newStatus };
    $('#confirmMessage').text('Are you sure you want to update this order to "' + formatStatus(newStatus) + '"?');
    if (newStatus === 'cancelled') { $('#cancelReasonDiv').show(); $('#confirmStatusBtn').removeClass('btn-primary').addClass('btn-danger'); }
    else { $('#cancelReasonDiv').hide(); $('#confirmStatusBtn').removeClass('btn-danger').addClass('btn-primary'); }
    new bootstrap.Modal('#statusConfirmModal').show();
}

function confirmStatusUpdate() {
    if (!pendingStatusUpdate) return;
    const reason = pendingStatusUpdate.newStatus === 'cancelled' ? $('#cancelReason').val() : null;
    updateOrderStatus(pendingStatusUpdate.orderId, pendingStatusUpdate.newStatus, reason);
    pendingStatusUpdate = null;
    $('#cancelReason').val('');
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

function formatPickupTime(date, startTime, endTime) {
    if (!date) return { date: 'N/A', time: '', full: 'N/A' };
    const d = new Date(date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = (startTime || '') + ' - ' + (endTime || '');
    return { date: dateStr, time: timeStr, full: dateStr + ' ' + timeStr };
}

function getTimeSlotClass(date, startTime) {
    if (!date || !startTime) return 'time-slot-later';
    const now = new Date();
    const slotDate = new Date(date);
    const [hours, minutes] = startTime.split(':').map(Number);
    slotDate.setHours(hours, minutes, 0);
    const diff = (slotDate - now) / (1000 * 60);
    if (diff < 30) return 'time-slot-soon';
    if (diff < 60) return 'time-slot-upcoming';
    return 'time-slot-later';
}

function showToast(title, message, type) {
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    const toast = new bootstrap.Toast(document.getElementById('notificationToast'));
    toast.show();
}
