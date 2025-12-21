/**
 * Browse Trucks Page - Customer View
 * Displays all available food trucks with search and filter functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    init();
});

// ============================================
// State
// ============================================
let allTrucks = [];
let filteredTrucks = [];
let cuisineTypes = new Set();

// ============================================
// Initialization
// ============================================
async function init() {
    // Check authentication
    const user = API.getUser();
    if (!user) {
        window.location.href = '/login';
        return;
    }
    
    // Setup user info from localStorage
    setupUserInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load trucks
    await loadTrucks();
}

function setupUserInfo() {
    const user = API.getUser();
    const navUsername = document.getElementById('navUsername');
    
    if (user && navUsername) {
        navUsername.textContent = user.first_name || 'Customer';
    }
}

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchTrucks');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterTrucks, 300));
    }
    
    // Cuisine filter
    const cuisineFilter = document.getElementById('cuisineFilter');
    if (cuisineFilter) {
        cuisineFilter.addEventListener('change', filterTrucks);
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', filterTrucks);
    }
    
    // Refresh button
    const refreshBtn = document.getElementById('refreshTrucksBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadTrucks);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => API.logout());
    }
}

// ============================================
// Data Loading
// ============================================
async function loadTrucks() {
    const trucksGrid = document.getElementById('trucksGrid');
    const noTrucksMessage = document.getElementById('noTrucksMessage');
    
    // Show loading state
    UI.loading(trucksGrid);
    if (noTrucksMessage) noTrucksMessage.style.display = 'none';
    
    try {
        const response = await API.trucks.getAll({ active: 'true' });
        
        if (response.success && response.data) {
            allTrucks = response.data;
            
            // Extract unique cuisine types for filter
            cuisineTypes.clear();
            allTrucks.forEach(truck => {
                if (truck.cuisine_type) {
                    cuisineTypes.add(truck.cuisine_type);
                }
            });
            
            // Populate cuisine filter
            populateCuisineFilter();
            
            // Apply initial filter
            filterTrucks();
        } else {
            showNoTrucks();
        }
    } catch (error) {
        console.error('Error loading trucks:', error);
        UI.showError('Failed to load food trucks. Please try again.');
        showNoTrucks();
    }
}

function populateCuisineFilter() {
    const cuisineFilter = document.getElementById('cuisineFilter');
    if (!cuisineFilter) return;
    
    // Keep "All Cuisines" option and clear the rest
    cuisineFilter.innerHTML = '<option value="">All Cuisines</option>';
    
    // Add cuisine options
    cuisineTypes.forEach(cuisine => {
        const option = document.createElement('option');
        option.value = cuisine;
        option.textContent = cuisine;
        cuisineFilter.appendChild(option);
    });
}

// ============================================
// Filtering
// ============================================
function filterTrucks() {
    const searchTerm = document.getElementById('searchTrucks')?.value.toLowerCase() || '';
    const cuisineFilter = document.getElementById('cuisineFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    filteredTrucks = allTrucks.filter(truck => {
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
    
    renderTrucks();
}

// ============================================
// Rendering
// ============================================
function renderTrucks() {
    const trucksGrid = document.getElementById('trucksGrid');
    const noTrucksMessage = document.getElementById('noTrucksMessage');
    const trucksCount = document.getElementById('trucksCount');
    
    if (!trucksGrid) return;
    
    // Update count
    if (trucksCount) {
        trucksCount.textContent = `${filteredTrucks.length} truck${filteredTrucks.length !== 1 ? 's' : ''} found`;
    }
    
    // Handle empty state
    if (filteredTrucks.length === 0) {
        trucksGrid.innerHTML = '';
        if (noTrucksMessage) noTrucksMessage.style.display = 'block';
        return;
    }
    
    if (noTrucksMessage) noTrucksMessage.style.display = 'none';
    
    // Render truck cards
    trucksGrid.innerHTML = filteredTrucks.map(truck => createTruckCard(truck)).join('');
}

function createTruckCard(truck) {
    const isOpen = truck.is_active;
    const statusClass = isOpen ? 'bg-success' : 'bg-secondary';
    const statusText = isOpen ? 'Open' : 'Closed';
    
    return `
        <div class="col-md-6 col-lg-4 mb-4">
            <div class="card h-100 shadow-sm truck-card ${!isOpen ? 'opacity-75' : ''}">
                <div class="card-img-container position-relative">
                    ${truck.image_url 
                        ? `<img src="${truck.image_url}" alt="${truck.name}" class="card-img-top" style="height: 180px; object-fit: cover;">`
                        : `<div class="card-img-placeholder d-flex align-items-center justify-content-center bg-light" style="height: 180px;">
                               <i class="bi bi-truck" style="font-size: 4rem; color: #dee2e6;"></i>
                           </div>`
                    }
                    <span class="position-absolute top-0 end-0 m-2 badge ${statusClass}">
                        <i class="bi bi-circle-fill me-1" style="font-size: 0.5rem;"></i>${statusText}
                    </span>
                </div>
                <div class="card-body">
                    <h5 class="card-title mb-2">${escapeHtml(truck.name)}</h5>
                    ${truck.cuisine_type 
                        ? `<p class="text-muted small mb-2"><i class="bi bi-tag me-1"></i>${escapeHtml(truck.cuisine_type)}</p>` 
                        : ''
                    }
                    <p class="card-text text-muted small" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; min-height: 40px;">
                        ${truck.description ? escapeHtml(truck.description) : 'Delicious food awaits!'}
                    </p>
                    ${truck.rating 
                        ? `<p class="mb-2">
                               <span class="text-warning">
                                   ${generateStars(truck.rating)}
                               </span>
                               <small class="text-muted">(${truck.rating})</small>
                           </p>` 
                        : ''
                    }
                </div>
                <div class="card-footer bg-white border-0 pt-0">
                    <a href="/customer/menu/${truck.food_truck_id}" class="btn btn-primary w-100 ${!isOpen ? 'disabled' : ''}">
                        <i class="bi bi-list-ul me-1"></i>View Menu
                    </a>
                </div>
            </div>
        </div>
    `;
}

function showNoTrucks() {
    const trucksGrid = document.getElementById('trucksGrid');
    const noTrucksMessage = document.getElementById('noTrucksMessage');
    
    if (trucksGrid) trucksGrid.innerHTML = '';
    if (noTrucksMessage) noTrucksMessage.style.display = 'block';
}

// ============================================
// Utility Functions
// ============================================
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    let stars = '';
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="bi bi-star-fill"></i>';
    }
    if (hasHalfStar) {
        stars += '<i class="bi bi-star-half"></i>';
    }
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="bi bi-star"></i>';
    }
    return stars;
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
