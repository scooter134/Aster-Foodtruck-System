$(document).ready(function() {
    // State
    let allOrders = [];
    let filteredOrders = [];
    let currentFilter = 'all';

    // Initialize
    loadOrders();

    // Logout button handler
    $('#logoutBtn').on('click', function() {
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('cart');
        
        showToast('Success', 'You have been logged out successfully.');
        
        setTimeout(function() {
            window.location.href = '/';
        }, 1000);
    });

    // Filter tabs handler
    $('#orderFilterTabs .nav-link').on('click', function(e) {
        e.preventDefault();
        $('#orderFilterTabs .nav-link').removeClass('active');
        $(this).addClass('active');
        
        currentFilter = $(this).data('status');
        filterOrders();
    });

    // Refresh button handler
    $('#refreshOrdersBtn').on('click', function() {
        loadOrders();
    });

    // Load orders from API
    function loadOrders() {
        const userId = $('#userId').val() || 1;
        
        $('#ordersContainer').html(`
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2 text-muted">Loading your orders...</p>
            </div>
        `);
        $('#noOrdersMessage').hide();

        $.ajax({
            url: `/api/orders?customer_id=${userId}`,
            method: 'GET',
            success: function(response) {
                if (response.success && response.data && response.data.length > 0) {
                    allOrders = response.data;
                    filteredOrders = [...allOrders];
                    filterOrders();
                } else {
                    showNoOrders();
                }
            },
            error: function(xhr, status, error) {
                console.error('Error loading orders:', error);
                showNoOrders();
                showToast('Error', 'Failed to load orders. Please try again.', 'error');
            }
        });
    }

    // Filter orders based on selected tab
    function filterOrders() {
        if (currentFilter === 'all') {
            filteredOrders = [...allOrders];
        } else if (currentFilter === 'active') {
            filteredOrders = allOrders.filter(o => 
                ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
            );
        } else if (currentFilter === 'completed') {
            filteredOrders = allOrders.filter(o => 
                ['picked_up', 'completed'].includes(o.status)
            );
        } else if (currentFilter === 'cancelled') {
            filteredOrders = allOrders.filter(o => o.status === 'cancelled');
        }

        renderOrders(filteredOrders);
    }

    // Render orders list
    function renderOrders(orders) {
        const container = $('#ordersContainer');
        container.empty();

        if (orders.length === 0) {
            showNoOrders();
            return;
        }

        $('#noOrdersMessage').hide();
        $('#ordersCount').text(`${orders.length} order${orders.length !== 1 ? 's' : ''}`);

        orders.forEach(function(order) {
            const statusInfo = getStatusInfo(order.status);
            const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            const pickupDate = order.pickup_date ? new Date(order.pickup_date).toLocaleDateString('en-US', {
                weekday: 'short', month: 'short', day: 'numeric'
            }) : 'N/A';
            const pickupTime = order.pickup_time || 'N/A';
            const itemCount = order.items ? order.items.length : 0;

            const orderCard = `
                <div class="col-12 mb-3">
                    <div class="card order-card shadow-sm">
                        <div class="card-body">
                            <div class="row align-items-center">
                                <div class="col-md-2">
                                    <div class="order-id">
                                        <span class="text-muted small">Order</span>
                                        <h5 class="mb-0">#${order.order_id}</h5>
                                    </div>
                                </div>
                                <div class="col-md-3">
                                    <div class="order-truck">
                                        <span class="text-muted small">Food Truck</span>
                                        <p class="mb-0 fw-bold">${order.truck_name || 'Food Truck'}</p>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="order-pickup">
                                        <span class="text-muted small">Pickup</span>
                                        <p class="mb-0">${pickupDate}</p>
                                        <small class="text-muted">${pickupTime}</small>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="order-status">
                                        <span class="badge ${statusInfo.badgeClass} status-badge">
                                            <i class="bi ${statusInfo.icon}"></i> ${statusInfo.text}
                                        </span>
                                    </div>
                                </div>
                                <div class="col-md-2">
                                    <div class="order-total text-md-end">
                                        <span class="text-muted small">${itemCount} item${itemCount !== 1 ? 's' : ''}</span>
                                        <h5 class="mb-0 text-success">$${parseFloat(order.total_amount || 0).toFixed(2)}</h5>
                                    </div>
                                </div>
                                <div class="col-md-1 text-end">
                                    <button class="btn btn-outline-primary btn-sm view-order-btn" data-order-id="${order.order_id}">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            container.append(orderCard);
        });

        // Bind view order button click
        $('.view-order-btn').on('click', function() {
            const orderId = $(this).data('order-id');
            showOrderDetails(orderId);
        });
    }

    // Show order details modal
    function showOrderDetails(orderId) {
        const order = allOrders.find(o => o.order_id === orderId);
        if (!order) return;

        // Populate modal
        $('#modalOrderId').text(`#${order.order_id}`);
        $('#modalOrderDate').text(new Date(order.created_at).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }));
        
        const statusInfo = getStatusInfo(order.status);
        $('#modalOrderStatus').html(`<span class="badge ${statusInfo.badgeClass}">${statusInfo.text}</span>`);
        
        $('#modalTruckName').text(order.truck_name || 'Food Truck');
        $('#modalPickupDate').text(order.pickup_date ? new Date(order.pickup_date).toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
        }) : 'N/A');
        $('#modalPickupTime').text(order.pickup_time || 'N/A');

        // Order items
        const itemsBody = $('#modalOrderItems');
        itemsBody.empty();
        
        if (order.items && order.items.length > 0) {
            order.items.forEach(function(item) {
                const itemTotal = (parseFloat(item.price) * parseInt(item.quantity)).toFixed(2);
                itemsBody.append(`
                    <tr>
                        <td>${item.name || item.item_name}</td>
                        <td class="text-center">${item.quantity}</td>
                        <td class="text-end">$${parseFloat(item.price).toFixed(2)}</td>
                        <td class="text-end">$${itemTotal}</td>
                    </tr>
                `);
            });
        } else {
            itemsBody.append('<tr><td colspan="4" class="text-center text-muted">No items</td></tr>');
        }

        $('#modalOrderTotal').text(`$${parseFloat(order.total_amount || 0).toFixed(2)}`);

        // Special instructions
        if (order.special_instructions) {
            $('#modalSpecialInstructions').text(order.special_instructions);
            $('#modalSpecialInstructionsSection').show();
        } else {
            $('#modalSpecialInstructionsSection').hide();
        }

        // Order status progress
        renderStatusProgress(order.status);

        // Show modal
        const modal = new bootstrap.Modal($('#orderDetailsModal')[0]);
        modal.show();
    }

    // Render status progress
    function renderStatusProgress(currentStatus) {
        const statuses = [
            { key: 'pending', label: 'Pending', icon: 'bi-clock' },
            { key: 'confirmed', label: 'Confirmed', icon: 'bi-check-circle' },
            { key: 'preparing', label: 'Preparing', icon: 'bi-fire' },
            { key: 'ready', label: 'Ready', icon: 'bi-bell' },
            { key: 'picked_up', label: 'Completed', icon: 'bi-bag-check' }
        ];

        const statusOrder = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'completed'];
        const currentIndex = statusOrder.indexOf(currentStatus);
        const isCancelled = currentStatus === 'cancelled';

        const container = $('#orderStatusProgress');
        container.empty();

        if (isCancelled) {
            container.html(`
                <div class="text-center py-3">
                    <span class="badge bg-danger fs-6">
                        <i class="bi bi-x-circle"></i> Order Cancelled
                    </span>
                </div>
            `);
            return;
        }

        let progressHtml = '<div class="d-flex justify-content-between align-items-center">';
        
        statuses.forEach(function(status, index) {
            const isCompleted = currentIndex >= statusOrder.indexOf(status.key);
            const isCurrent = currentStatus === status.key;
            
            let stepClass = 'step-pending';
            if (isCompleted) stepClass = 'step-completed';
            if (isCurrent) stepClass = 'step-current';

            progressHtml += `
                <div class="status-step ${stepClass}">
                    <div class="step-icon-wrapper">
                        <i class="bi ${status.icon}"></i>
                    </div>
                    <span class="step-label">${status.label}</span>
                </div>
            `;

            if (index < statuses.length - 1) {
                const lineClass = currentIndex > statusOrder.indexOf(status.key) ? 'line-completed' : 'line-pending';
                progressHtml += `<div class="step-line ${lineClass}"></div>`;
            }
        });

        progressHtml += '</div>';
        container.html(progressHtml);
    }

    // Get status info (badge class, icon, text)
    function getStatusInfo(status) {
        const statusMap = {
            'pending': { badgeClass: 'bg-warning text-dark', icon: 'bi-clock', text: 'Pending' },
            'confirmed': { badgeClass: 'bg-info', icon: 'bi-check-circle', text: 'Confirmed' },
            'preparing': { badgeClass: 'bg-orange', icon: 'bi-fire', text: 'Preparing' },
            'ready': { badgeClass: 'bg-success', icon: 'bi-bell', text: 'Ready for Pickup' },
            'picked_up': { badgeClass: 'bg-primary', icon: 'bi-bag-check', text: 'Completed' },
            'completed': { badgeClass: 'bg-primary', icon: 'bi-bag-check', text: 'Completed' },
            'cancelled': { badgeClass: 'bg-danger', icon: 'bi-x-circle', text: 'Cancelled' }
        };

        return statusMap[status] || { badgeClass: 'bg-secondary', icon: 'bi-question-circle', text: status };
    }

    // Show no orders message
    function showNoOrders() {
        $('#ordersContainer').empty();
        $('#ordersCount').text('0 orders');
        $('#noOrdersMessage').show();
    }

    // Show toast notification
    function showToast(title, message, type = 'info') {
        const toast = $('#notificationToast');
        const toastHeader = toast.find('.toast-header');
        
        $('#toastTitle').text(title);
        $('#toastMessage').text(message);
        
        toastHeader.removeClass('bg-success bg-danger bg-warning bg-info text-white');
        if (type === 'success') {
            toastHeader.addClass('bg-success text-white');
        } else if (type === 'error') {
            toastHeader.addClass('bg-danger text-white');
        } else if (type === 'warning') {
            toastHeader.addClass('bg-warning');
        } else {
            toastHeader.addClass('bg-primary text-white');
        }
        
        const bsToast = new bootstrap.Toast(toast[0]);
        bsToast.show();
    }
});
