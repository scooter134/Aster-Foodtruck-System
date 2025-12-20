$(document).ready(function() {
    // State
    let allTrucks = [];
    let filteredTrucks = [];

    // Initialize
    loadTrucks();

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

    // Search input handler
    $('#searchTrucks').on('input', function() {
        filterTrucks();
    });

    // Cuisine filter handler
    $('#cuisineFilter').on('change', function() {
        filterTrucks();
    });

    // Status filter handler
    $('#statusFilter').on('change', function() {
        filterTrucks();
    });

    // Refresh button handler
    $('#refreshTrucksBtn').on('click', function() {
        loadTrucks();
    });

    // Load all trucks from API
    function loadTrucks() {
        $('#trucksGrid').html(`
            <div class="col-12 text-center py-5">
                <div class="spinner-border text-primary"></div>
                <p class="mt-2 text-muted">Loading food trucks...</p>
            </div>
        `);
        $('#noTrucksMessage').hide();

        $.ajax({
            url: '/api/food-trucks',
            method: 'GET',
            success: function(response) {
                if (response.success && response.data) {
                    allTrucks = response.data;
                    filteredTrucks = [...allTrucks];
                    
                    // Populate cuisine filter
                    populateCuisineFilter(allTrucks);
                    
                    // Render trucks
                    renderTrucks(filteredTrucks);
                } else {
                    showNoTrucks();
                }
            },
            error: function(xhr, status, error) {
                console.error('Error loading trucks:', error);
                showNoTrucks();
                showToast('Error', 'Failed to load food trucks. Please try again.', 'error');
            }
        });
    }

    // Populate cuisine filter dropdown
    function populateCuisineFilter(trucks) {
        const cuisines = [...new Set(trucks.map(t => t.cuisine_type).filter(c => c))];
        const select = $('#cuisineFilter');
        
        // Keep first option (All Cuisines)
        select.find('option:not(:first)').remove();
        
        cuisines.sort().forEach(function(cuisine) {
            select.append(`<option value="${cuisine}">${cuisine}</option>`);
        });
    }

    // Filter trucks based on search and filters
    function filterTrucks() {
        const searchTerm = $('#searchTrucks').val().toLowerCase().trim();
        const cuisineFilter = $('#cuisineFilter').val();
        const statusFilter = $('#statusFilter').val();

        filteredTrucks = allTrucks.filter(function(truck) {
            // Search filter
            const matchesSearch = !searchTerm || 
                truck.name.toLowerCase().includes(searchTerm) ||
                (truck.description && truck.description.toLowerCase().includes(searchTerm)) ||
                (truck.cuisine_type && truck.cuisine_type.toLowerCase().includes(searchTerm));

            // Cuisine filter
            const matchesCuisine = !cuisineFilter || truck.cuisine_type === cuisineFilter;

            // Status filter
            let matchesStatus = true;
            if (statusFilter === 'open') {
                matchesStatus = truck.is_active === true;
            } else if (statusFilter === 'closed') {
                matchesStatus = truck.is_active === false;
            }

            return matchesSearch && matchesCuisine && matchesStatus;
        });

        renderTrucks(filteredTrucks);
    }

    // Render trucks grid
    function renderTrucks(trucks) {
        const container = $('#trucksGrid');
        container.empty();

        if (trucks.length === 0) {
            showNoTrucks();
            return;
        }

        $('#noTrucksMessage').hide();
        $('#trucksCount').text(`${trucks.length} truck${trucks.length !== 1 ? 's' : ''} found`);

        trucks.forEach(function(truck) {
            const statusClass = truck.is_active ? 'status-open' : 'status-closed';
            const statusText = truck.is_active ? 'Open' : 'Closed';
            const statusBadgeClass = truck.is_active ? 'bg-success' : 'bg-danger';
            const buttonClass = truck.is_active ? 'btn-primary' : 'btn-outline-secondary';

            const truckCard = `
                <div class="col-lg-4 col-md-6 mb-4">
                    <div class="card truck-card h-100 shadow-sm ${!truck.is_active ? 'truck-closed' : ''}">
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
                            <p class="card-text text-muted small mb-2">
                                <i class="bi bi-tag"></i> ${truck.cuisine_type || 'Various Cuisine'}
                            </p>
                            <p class="card-text truck-description">${truck.description || 'Delicious food awaits!'}</p>
                            ${truck.rating ? `
                                <div class="truck-rating mb-2">
                                    <i class="bi bi-star-fill text-warning"></i>
                                    <span>${truck.rating.toFixed(1)}</span>
                                </div>
                            ` : ''}
                        </div>
                        <div class="card-footer bg-white border-0 pb-3">
                            <a href="/customer/menu/${truck.food_truck_id}" class="btn ${buttonClass} w-100">
                                <i class="bi bi-list-ul"></i> View Menu
                            </a>
                        </div>
                    </div>
                </div>
            `;
            container.append(truckCard);
        });
    }

    // Show no trucks message
    function showNoTrucks() {
        $('#trucksGrid').empty();
        $('#trucksCount').text('0 trucks found');
        $('#noTrucksMessage').show();
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
