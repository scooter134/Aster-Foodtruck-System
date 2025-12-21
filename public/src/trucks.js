/**
 * Browse Trucks Page JavaScript
 * Displays available food trucks
 */

$(document).ready(function() {
    // Check authentication
    const user = API.getUser();
    if (!user) {
        window.location.href = '/';
        return;
    }
    
    // Display username
    $('#userName').text(user.first_name || 'Customer');
    
    // Load trucks
    loadTrucks();
    
    // Logout handler
    $('#logoutBtn').on('click', function() {
        API.logout();
    });
});

function loadTrucks() {
    $('#loadingState').show();
    $('#emptyState').hide();
    $('#trucksGrid').empty();
    
    $.ajax({
        url: '/api/food-trucks',
        method: 'GET',
        success: function(response) {
            $('#loadingState').hide();
            
            if (response.success && response.data && response.data.length > 0) {
                renderTrucks(response.data);
            } else {
                $('#emptyState').show();
            }
        },
        error: function() {
            $('#loadingState').hide();
            $('#emptyState').show();
            showToast('Error', 'Failed to load trucks', 'danger');
        }
    });
}

function renderTrucks(trucks) {
    let html = '';
    
    trucks.forEach(function(truck) {
        const statusClass = truck.is_active ? 'bg-success' : 'bg-secondary';
        const statusText = truck.is_active ? 'Open' : 'Closed';
        const btnClass = truck.is_active ? '' : 'disabled';
        
        html += `
            <div class="col-md-4 col-lg-3 mb-4">
                <div class="card h-100 shadow-sm">
                    <div class="position-relative">
                        ${truck.image_url 
                            ? `<img src="${truck.image_url}" class="card-img-top" alt="${escapeHtml(truck.name)}" style="height: 150px; object-fit: cover;">`
                            : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 150px;">
                                   <i class="bi bi-truck" style="font-size: 4rem; color: #dee2e6;"></i>
                               </div>`
                        }
                        <span class="position-absolute top-0 end-0 m-2 badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-body">
                        <h5 class="card-title">${escapeHtml(truck.name)}</h5>
                        ${truck.cuisine_type ? `<p class="text-muted small mb-2"><i class="bi bi-tag"></i> ${escapeHtml(truck.cuisine_type)}</p>` : ''}
                        ${truck.description ? `<p class="card-text small text-muted">${escapeHtml(truck.description).substring(0, 80)}${truck.description.length > 80 ? '...' : ''}</p>` : ''}
                    </div>
                    <div class="card-footer bg-white border-top-0">
                        <a href="/truckMenu/${truck.food_truck_id}" class="btn btn-primary w-100 ${btnClass}">
                            <i class="bi bi-list-ul"></i> View Menu
                        </a>
                    </div>
                </div>
            </div>
        `;
    });
    
    $('#trucksGrid').html(html);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(title, message, type) {
    const $header = $('#notificationToast .toast-header');
    $header.removeClass('bg-success bg-danger bg-warning text-white');
    if (type === 'danger') $header.addClass('bg-danger text-white');
    else if (type === 'success') $header.addClass('bg-success text-white');
    
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    new bootstrap.Toast(document.getElementById('notificationToast')).show();
}
