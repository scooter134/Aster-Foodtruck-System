$(document).ready(function() {
    // Initialize
    loadFeaturedTrucks();
    loadCartCount();

    // Logout button handler
    $('#logoutBtn').on('click', function() {
        // Clear any stored user data
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('cart');
        
        showToast('Success', 'You have been logged out successfully.');
        
        // Redirect to home/login page
        setTimeout(function() {
            window.location.href = '/';
        }, 1000);
    });

    // Load featured trucks (first 3 active trucks)
    function loadFeaturedTrucks() {
        $.ajax({
            url: '/api/food-trucks?active=true',
            method: 'GET',
            success: function(response) {
                if (response.success && response.data && response.data.length > 0) {
                    renderFeaturedTrucks(response.data.slice(0, 3));
                } else {
                    renderNoTrucks();
                }
            },
            error: function(xhr, status, error) {
                console.error('Error loading trucks:', error);
                renderNoTrucks();
            }
        });
    }

    // Render featured trucks
    function renderFeaturedTrucks(trucks) {
        const container = $('#featuredTrucksContainer');
        container.empty();

        trucks.forEach(function(truck) {
            const statusClass = truck.is_active ? 'status-open' : 'status-closed';
            const statusText = truck.is_active ? 'Open' : 'Closed';
            const statusBadgeClass = truck.is_active ? 'bg-success' : 'bg-danger';

            const truckCard = `
                <div class="col-md-4 mb-3">
                    <div class="card truck-card h-100 shadow-sm">
                        <div class="card-img-container">
                            ${truck.image_url 
                                ? `<img src="${truck.image_url}" alt="${truck.name}" class="card-img-top">`
                                : `<div class="card-img-placeholder"><i class="bi bi-truck"></i></div>`
                            }
                            <span class="badge ${statusBadgeClass} truck-status-overlay">
                                <i class="bi bi-circle-fill"></i> ${statusText}
                            </span>
                        </div>
                        <div class="card-body">
                            <h5 class="card-title">${truck.name}</h5>
                            <p class="card-text text-muted small">
                                <i class="bi bi-tag"></i> ${truck.cuisine_type || 'Various'}
                            </p>
                            <p class="card-text truck-description">${truck.description || 'Delicious food awaits!'}</p>
                        </div>
                        <div class="card-footer bg-white border-0 pb-3">
                            <a href="/customer/menu/${truck.food_truck_id}" class="btn btn-primary w-100">
                                <i class="bi bi-list-ul"></i> View Menu
                            </a>
                        </div>
                    </div>
                </div>
            `;
            container.append(truckCard);
        });
    }

    // Render no trucks message
    function renderNoTrucks() {
        const container = $('#featuredTrucksContainer');
        container.html(`
            <div class="col-12 text-center py-4">
                <i class="bi bi-shop-window text-muted" style="font-size: 3rem;"></i>
                <p class="mt-2 text-muted">No food trucks available at the moment.</p>
                <a href="/customer/browse-trucks" class="btn btn-outline-primary">
                    <i class="bi bi-arrow-clockwise"></i> Browse All Trucks
                </a>
            </div>
        `);
    }

    // Load cart count
    function loadCartCount() {
        const userId = $('#userId').val() || 1;
        
        $.ajax({
            url: `/api/cart/${userId}`,
            method: 'GET',
            success: function(response) {
                if (response.success && response.data && response.data.items) {
                    const count = response.data.items.length;
                    if (count > 0) {
                        $('#cartBadge').text(count).show();
                    } else {
                        $('#cartBadge').hide();
                    }
                }
            },
            error: function() {
                // Silently fail - cart badge will remain hidden
                $('#cartBadge').hide();
            }
        });
    }

    // Show toast notification
    function showToast(title, message, type = 'info') {
        const toast = $('#notificationToast');
        const toastHeader = toast.find('.toast-header');
        
        // Set title and message
        $('#toastTitle').text(title);
        $('#toastMessage').text(message);
        
        // Set header color based on type
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
