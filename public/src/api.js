/**
 * Centralized API Client for Food Truck System
 * Handles all API calls with authentication, error handling, and response parsing
 */

const API = {
    BASE_URL: '/api',
    
    // ============================================
    // Auth Token Management
    // ============================================
    getToken() {
        return localStorage.getItem('authToken');
    },
    
    setToken(token) {
        localStorage.setItem('authToken', token);
    },
    
    removeToken() {
        localStorage.removeItem('authToken');
    },
    
    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },
    
    setUser(user) {
        localStorage.setItem('user', JSON.stringify(user));
    },
    
    removeUser() {
        localStorage.removeItem('user');
    },
    
    isAuthenticated() {
        return !!this.getToken();
    },
    
    logout() {
        this.removeToken();
        this.removeUser();
        window.location.href = '/login';
    },
    
    // ============================================
    // HTTP Request Helper
    // ============================================
    async request(endpoint, options = {}) {
        const url = `${this.BASE_URL}${endpoint}`;
        const token = this.getToken();
        
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` }),
                ...options.headers
            },
            ...options
        };
        
        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }
        
        try {
            const response = await fetch(url, config);
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.logout();
                }
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }
            
            return data;
        } catch (error) {
            console.error(`API Error [${endpoint}]:`, error);
            throw error;
        }
    },
    
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    },
    
    post(endpoint, body) {
        return this.request(endpoint, { method: 'POST', body });
    },
    
    put(endpoint, body) {
        return this.request(endpoint, { method: 'PUT', body });
    },
    
    patch(endpoint, body) {
        return this.request(endpoint, { method: 'PATCH', body });
    },
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    
    // ============================================
    // Auth Endpoints
    // ============================================
    auth: {
        async login(email, password) {
            const response = await API.post('/users/login', { email, password });
            if (response.success && response.data) {
                API.setToken(response.data.token);
                API.setUser(response.data.user);
            }
            return response;
        },
        
        async register(userData) {
            const response = await API.post('/users/register', userData);
            if (response.success && response.data) {
                API.setToken(response.data.token);
                API.setUser(response.data.user);
            }
            return response;
        },
        
        logout() {
            API.logout();
        }
    },
    
    // ============================================
    // User Endpoints
    // ============================================
    users: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/users${query ? '?' + query : ''}`);
        },
        
        getById(id) {
            return API.get(`/users/${id}`);
        },
        
        update(id, data) {
            return API.put(`/users/${id}`, data);
        },
        
        changePassword(id, currentPassword, newPassword) {
            return API.patch(`/users/${id}/change-password`, {
                current_password: currentPassword,
                new_password: newPassword
            });
        }
    },
    
    // ============================================
    // Food Trucks Endpoints
    // ============================================
    trucks: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/food-trucks${query ? '?' + query : ''}`);
        },
        
        getById(id) {
            return API.get(`/food-trucks/${id}`);
        },
        
        getMenu(truckId, params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/food-trucks/${truckId}/menu${query ? '?' + query : ''}`);
        },
        
        getTimeSlots(truckId, params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/food-trucks/${truckId}/time-slots${query ? '?' + query : ''}`);
        },
        
        create(data) {
            return API.post('/food-trucks', data);
        },
        
        update(id, data) {
            return API.put(`/food-trucks/${id}`, data);
        },
        
        delete(id) {
            return API.delete(`/food-trucks/${id}`);
        },

        getMyTruck() {
            const user = API.getUser();
            if (!user) return Promise.reject(new Error('Not authenticated'));
            return API.get(`/food-trucks?owner_id=${user.user_id}`);
        }
    },
    
    // ============================================
    // Menu Items Endpoints
    // ============================================
    menuItems: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/menu-items${query ? '?' + query : ''}`);
        },
        
        getById(id) {
            return API.get(`/menu-items/${id}`);
        },
        
        create(data) {
            return API.post('/menu-items', data);
        },
        
        update(id, data) {
            return API.put(`/menu-items/${id}`, data);
        },
        
        delete(id) {
            return API.delete(`/menu-items/${id}`);
        }
    },
    
    // ============================================
    // Cart Endpoints
    // ============================================
    cart: {
        get(userId) {
            return API.get(`/cart/${userId}`);
        },
        
        addItem(userId, menuItemId, quantity = 1, allergyNote = '') {
            return API.post('/cart', {
                user_id: userId,
                menu_item_id: menuItemId,
                quantity,
                allergy_note: allergyNote
            });
        },
        
        updateQuantity(cartItemId, quantity) {
            return API.put(`/cart/${cartItemId}`, { quantity });
        },
        
        removeItem(cartItemId) {
            return API.delete(`/cart/${cartItemId}`);
        },
        
        clear(userId) {
            return API.delete(`/cart/user/${userId}`);
        }
    },
    
    // ============================================
    // Orders Endpoints
    // ============================================
    orders: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/orders${query ? '?' + query : ''}`);
        },
        
        getById(id) {
            return API.get(`/orders/${id}`);
        },
        
        getByNumber(orderNumber) {
            return API.get(`/orders/number/${orderNumber}`);
        },
        
        getMyOrders(customerId) {
            return API.get(`/orders?customer_id=${customerId}`);
        },
        
        getTruckOrders(truckId, params = {}) {
            const query = new URLSearchParams({ food_truck_id: truckId, ...params }).toString();
            return API.get(`/orders?${query}`);
        },
        
        getStats(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/orders/stats/summary${query ? '?' + query : ''}`);
        },
        
        create(orderData) {
            return API.post('/orders', orderData);
        },
        
        updateStatus(orderId, status, reason = null) {
            const body = { order_status: status };
            if (reason) body.cancellation_reason = reason;
            return API.patch(`/orders/${orderId}/status`, body);
        }
    },
    
    // ============================================
    // Time Slots Endpoints
    // ============================================
    timeSlots: {
        getAll(params = {}) {
            const query = new URLSearchParams(params).toString();
            return API.get(`/time-slots${query ? '?' + query : ''}`);
        },
        
        getById(id) {
            return API.get(`/time-slots/${id}`);
        },
        
        create(data) {
            return API.post('/time-slots', data);
        },
        
        update(id, data) {
            return API.put(`/time-slots/${id}`, data);
        },
        
        delete(id) {
            return API.delete(`/time-slots/${id}`);
        }
    },
    
    // ============================================
    // Favorites Endpoints
    // ============================================
    favorites: {
        getAll(customerId) {
            return API.get(`/favorites?customer_id=${customerId}`);
        },
        
        add(customerId, menuItemId) {
            return API.post('/favorites', { customer_id: customerId, menu_item_id: menuItemId });
        },
        
        remove(favoriteId) {
            return API.delete(`/favorites/${favoriteId}`);
        }
    },
    
    // ============================================
    // Customers Endpoints
    // ============================================
    customers: {
        getByUserId(userId) {
            return API.get(`/customers/user/${userId}`);
        }
    }
};

// ============================================
// UI Utility Functions
// ============================================
const UI = {
    showToast(title, message, type = 'info') {
        const toast = document.getElementById('notificationToast');
        if (!toast) return;
        
        const toastTitle = document.getElementById('toastTitle');
        const toastMessage = document.getElementById('toastMessage');
        const toastHeader = toast.querySelector('.toast-header');
        
        if (toastTitle) toastTitle.textContent = title;
        if (toastMessage) toastMessage.textContent = message;
        
        // Set color based on type
        if (toastHeader) {
            toastHeader.className = 'toast-header';
            switch (type) {
                case 'success':
                    toastHeader.classList.add('bg-success', 'text-white');
                    break;
                case 'error':
                    toastHeader.classList.add('bg-danger', 'text-white');
                    break;
                case 'warning':
                    toastHeader.classList.add('bg-warning');
                    break;
                default:
                    toastHeader.classList.add('bg-primary', 'text-white');
            }
        }
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    },
    
    showSuccess(message) {
        this.showToast('Success', message, 'success');
    },
    
    showError(message) {
        this.showToast('Error', message, 'error');
    },
    
    showWarning(message) {
        this.showToast('Warning', message, 'warning');
    },
    
    showInfo(message) {
        this.showToast('Info', message, 'info');
    },
    
    formatCurrency(amount) {
        return '$' + parseFloat(amount || 0).toFixed(2);
    },
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    },
    
    formatTime(timeString) {
        if (!timeString) return '-';
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    },
    
    formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    },
    
    getStatusBadgeClass(status) {
        const classes = {
            'pending': 'badge-pending',
            'confirmed': 'badge-confirmed',
            'preparing': 'badge-preparing',
            'ready': 'badge-ready',
            'picked_up': 'badge-picked_up',
            'completed': 'badge-completed',
            'cancelled': 'badge-cancelled'
        };
        return classes[status] || 'bg-secondary';
    },
    
    getStatusLabel(status) {
        const labels = {
            'pending': 'Pending',
            'confirmed': 'Confirmed',
            'preparing': 'Preparing',
            'ready': 'Ready for Pickup',
            'picked_up': 'Completed',
            'completed': 'Completed',
            'cancelled': 'Cancelled'
        };
        return labels[status] || status;
    },
    
    loading(element, show = true) {
        if (!element) return;
        if (show) {
            element.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary"></div>
                    <p class="mt-2 text-muted">Loading...</p>
                </div>
            `;
        }
    },
    
    emptyState(element, icon, title, message, actionHtml = '') {
        if (!element) return;
        element.innerHTML = `
            <div class="empty-state py-5">
                <i class="bi bi-${icon}"></i>
                <h5>${title}</h5>
                <p class="text-muted">${message}</p>
                ${actionHtml}
            </div>
        `;
    },

    confirmDialog(message) {
        return confirm(message);
    }
};

// ============================================
// Auth Guard - Redirect if not authenticated
// ============================================
function requireAuth(allowedRoles = null) {
    if (!API.isAuthenticated()) {
        window.location.href = '/login';
        return false;
    }
    
    if (allowedRoles) {
        const user = API.getUser();
        if (!user || !allowedRoles.includes(user.user_type)) {
            window.location.href = '/login';
            return false;
        }
    }
    
    return true;
}

function redirectIfAuthenticated() {
    if (API.isAuthenticated()) {
        const user = API.getUser();
        if (user && user.user_type === 'owner') {
            window.location.href = '/dashboard';
        } else {
            window.location.href = '/customer/dashboard';
        }
        return true;
    }
    return false;
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, UI, requireAuth, redirectIfAuthenticated };
}
