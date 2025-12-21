/**
 * Customer Dashboard Page
 * Main landing page for customers with quick actions and featured trucks
 */

document.addEventListener('DOMContentLoaded', function() {
    init();
});

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
    
    // Setup user info
    setupUserInfo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load data
    await Promise.all([
        loadFeaturedTrucks(),
        loadCartCount()
    ]);
}

function setupUserInfo() {
    const user = API.getUser();
    const navUsername = document.getElementById('navUsername');
    const welcomeUsername = document.getElementById('welcomeUsername');
    
    if (user) {
        const displayName = user.first_name || 'Customer';
        if (navUsername) navUsername.textContent = displayName;
        if (welcomeUsername) welcomeUsername.textContent = displayName;
    }
}

function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => API.logout());
    }
}

// ============================================
// Load Featured Trucks
// ============================================
async function loadFeaturedTrucks() {
    const container = document.getElementById('featuredTrucksContainer');
    if (!container) return;
    
    try {
        const response = await API.trucks.getAll({ active: 'true' });
        
        if (response.success && response.data && response.data.length > 0) {
            // Show up to 3 featured trucks
            const featuredTrucks = response.data.slice(0, 3);
            renderFeaturedTrucks(container, featuredTrucks);
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-4">
                    <p class="text-muted mb-0">No food trucks available at the moment.</p>
                    <a href="/customer/browse-trucks" class="btn btn-outline-primary btn-sm mt-2">
                        <i class="bi bi-arrow-clockwise"></i> Check Again
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading featured trucks:', error);
        container.innerHTML = `
            <div class="col-12 text-center py-4">
                <p class="text-muted mb-0">Unable to load trucks. Please try again later.</p>
            </div>
        `;
    }
}

function renderFeaturedTrucks(container, trucks) {
    container.innerHTML = trucks.map(truck => `
        <div class="col-md-4 mb-3">
            <div class="card h-100 shadow-sm">
                <div class="position-relative">
                    ${truck.image_url 
                        ? `<img src="${truck.image_url}" class="card-img-top" alt="${escapeHtml(truck.name)}" style="height: 150px; object-fit: cover;">`
                        : `<div class="card-img-top bg-light d-flex align-items-center justify-content-center" style="height: 150px;">
                               <i class="bi bi-truck" style="font-size: 3rem; color: #dee2e6;"></i>
                           </div>`
                    }
                    <span class="position-absolute top-0 end-0 m-2 badge ${truck.is_active ? 'bg-success' : 'bg-secondary'}">
                        ${truck.is_active ? 'Open' : 'Closed'}
                    </span>
                </div>
                <div class="card-body">
                    <h6 class="card-title mb-1">${escapeHtml(truck.name)}</h6>
                    ${truck.cuisine_type 
                        ? `<p class="text-muted small mb-2"><i class="bi bi-tag me-1"></i>${escapeHtml(truck.cuisine_type)}</p>`
                        : ''
                    }
                    <a href="/customer/menu/${truck.food_truck_id}" class="btn btn-outline-primary btn-sm w-100 ${!truck.is_active ? 'disabled' : ''}">
                        View Menu
                    </a>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// Load Cart Count
// ============================================
async function loadCartCount() {
    const cartBadge = document.getElementById('cartBadge');
    if (!cartBadge) return;
    
    const user = API.getUser();
    if (!user) return;
    
    try {
        const response = await API.cart.get(user.user_id);
        
        if (response.success && response.data && response.data.item_count > 0) {
            cartBadge.textContent = response.data.item_count;
            cartBadge.style.display = 'inline-block';
        } else {
            cartBadge.style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading cart count:', error);
        cartBadge.style.display = 'none';
    }
}

// ============================================
// Utility Functions
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
