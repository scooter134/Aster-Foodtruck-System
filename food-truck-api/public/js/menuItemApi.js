/**
 * Menu Item API Helper Functions
 * jQuery-based AJAX calls for menu item operations
 * 
 * API Endpoints (existing backend):
 * - GET    /api/menu-items           - Fetch all menu items
 * - GET    /api/menu-items/:id       - Fetch single item details
 * - POST   /api/menu-items           - Create new menu item
 * - PUT    /api/menu-items/:id       - Update menu item
 * - DELETE /api/menu-items/:id       - Delete menu item
 * 
 * Also supports alternative endpoints if backend provides:
 * - GET    /api/v1/menuItem/view           - Fetch all menu items
 * - GET    /api/v1/menuItem/view/:itemId   - Fetch single item details
 * - POST   /api/v1/menuItem/new            - Create new menu item
 * - PUT    /api/v1/menuItem/edit/:itemId   - Update menu item
 * - DELETE /api/v1/menuItem/delete/:itemId - Delete menu item
 */

const MenuItemAPI = (function() {
    'use strict';

    // Base URL for API endpoints - using existing backend routes
    const BASE_URL = '/api/menu-items';

    /**
     * Fetch all menu items
     * @returns {Promise} - Resolves with menu items array
     */
    function fetchAll() {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: `${BASE_URL}`,
                method: 'GET',
                dataType: 'json',
                success: function(response) {
                    // Normalize response - handle different response formats
                    if (response.success && response.data) {
                        resolve(response.data);
                    } else if (Array.isArray(response)) {
                        resolve(response);
                    } else if (response.menuItems) {
                        resolve(response.menuItems);
                    } else {
                        resolve(response.data || []);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Failed to fetch menu items:', error);
                    reject({
                        status: xhr.status,
                        message: xhr.responseJSON?.message || 'Failed to fetch menu items',
                        error: error
                    });
                }
            });
        });
    }

    /**
     * Fetch single menu item by ID
     * @param {number|string} itemId - Menu item ID
     * @returns {Promise} - Resolves with menu item object
     */
    function fetchById(itemId) {
        return new Promise((resolve, reject) => {
            if (!itemId) {
                reject({ message: 'Item ID is required' });
                return;
            }

            $.ajax({
                url: `${BASE_URL}/${itemId}`,
                method: 'GET',
                dataType: 'json',
                success: function(response) {
                    if (response.success && response.data) {
                        resolve(response.data);
                    } else if (response.menuItem) {
                        resolve(response.menuItem);
                    } else {
                        resolve(response.data || response);
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Failed to fetch menu item:', error);
                    reject({
                        status: xhr.status,
                        message: xhr.responseJSON?.message || 'Failed to fetch menu item',
                        error: error
                    });
                }
            });
        });
    }

    /**
     * Create a new menu item
     * @param {Object} itemData - Menu item data
     * @param {string} itemData.name - Item name (required)
     * @param {string} itemData.category - Item category (required)
     * @param {number} itemData.price - Item price (required)
     * @param {string} itemData.description - Item description
     * @param {string} itemData.imageUrl - Image URL placeholder
     * @param {boolean} itemData.isAvailable - Availability status
     * @returns {Promise} - Resolves with created item
     */
    function create(itemData) {
        return new Promise((resolve, reject) => {
            // Validate required fields
            const validationError = validateItemData(itemData, true);
            if (validationError) {
                reject({ message: validationError });
                return;
            }

            $.ajax({
                url: `${BASE_URL}`,
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(itemData),
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        resolve(response.data || response);
                    } else {
                        reject({ message: response.message || 'Failed to create item' });
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Failed to create menu item:', error);
                    reject({
                        status: xhr.status,
                        message: xhr.responseJSON?.message || 'Failed to create menu item',
                        error: error
                    });
                }
            });
        });
    }

    /**
     * Update an existing menu item
     * @param {number|string} itemId - Menu item ID
     * @param {Object} itemData - Updated menu item data
     * @returns {Promise} - Resolves with updated item
     */
    function update(itemId, itemData) {
        return new Promise((resolve, reject) => {
            if (!itemId) {
                reject({ message: 'Item ID is required' });
                return;
            }

            // Validate data (not requiring all fields for update)
            const validationError = validateItemData(itemData, false);
            if (validationError) {
                reject({ message: validationError });
                return;
            }

            $.ajax({
                url: `${BASE_URL}/${itemId}`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(itemData),
                dataType: 'json',
                success: function(response) {
                    if (response.success) {
                        resolve(response.data || response);
                    } else {
                        reject({ message: response.message || 'Failed to update item' });
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Failed to update menu item:', error);
                    reject({
                        status: xhr.status,
                        message: xhr.responseJSON?.message || 'Failed to update menu item',
                        error: error
                    });
                }
            });
        });
    }

    /**
     * Delete a menu item
     * @param {number|string} itemId - Menu item ID
     * @returns {Promise} - Resolves on success
     */
    function remove(itemId) {
        return new Promise((resolve, reject) => {
            if (!itemId) {
                reject({ message: 'Item ID is required' });
                return;
            }

            $.ajax({
                url: `${BASE_URL}/${itemId}`,
                method: 'DELETE',
                dataType: 'json',
                success: function(response) {
                    if (response.success !== false) {
                        resolve(response);
                    } else {
                        reject({ message: response.message || 'Failed to delete item' });
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Failed to delete menu item:', error);
                    reject({
                        status: xhr.status,
                        message: xhr.responseJSON?.message || 'Failed to delete menu item',
                        error: error
                    });
                }
            });
        });
    }

    /**
     * Bulk update prices for multiple items
     * @param {Array} itemIds - Array of item IDs to update
     * @param {Object} priceUpdate - Price update configuration
     * @param {string} priceUpdate.type - 'percentage' or 'fixed'
     * @param {number} priceUpdate.value - Update value
     * @returns {Promise} - Resolves with updated items
     */
    function bulkUpdatePrices(itemIds, priceUpdate) {
        return new Promise((resolve, reject) => {
            if (!itemIds || itemIds.length === 0) {
                reject({ message: 'No items selected for update' });
                return;
            }

            if (!priceUpdate || !priceUpdate.type || priceUpdate.value === undefined) {
                reject({ message: 'Invalid price update configuration' });
                return;
            }

            // Process bulk updates sequentially to handle API constraints
            const updatePromises = itemIds.map(itemId => {
                return fetchById(itemId).then(item => {
                    // Get current price (handle both camelCase and snake_case)
                    const currentPrice = parseFloat(item.price) || 0;
                    let newPrice;
                    if (priceUpdate.type === 'percentage') {
                        // Calculate percentage change
                        newPrice = currentPrice * (1 + priceUpdate.value / 100);
                    } else {
                        // Fixed price change
                        newPrice = currentPrice + priceUpdate.value;
                    }
                    // Ensure price is not negative
                    newPrice = Math.max(0, parseFloat(newPrice.toFixed(2)));
                    return update(itemId, { price: newPrice });
                });
            });

            Promise.all(updatePromises)
                .then(results => resolve(results))
                .catch(error => reject(error));
        });
    }

    /**
     * Validate menu item data
     * @param {Object} data - Item data to validate
     * @param {boolean} requireAll - Whether all required fields must be present
     * @returns {string|null} - Error message or null if valid
     */
    function validateItemData(data, requireAll) {
        if (!data || typeof data !== 'object') {
            return 'Invalid item data';
        }

        if (requireAll) {
            if (!data.name || data.name.trim() === '') {
                return 'Name is required';
            }
            if (!data.category || data.category.trim() === '') {
                return 'Category is required';
            }
            if (data.price === undefined || data.price === null || data.price === '') {
                return 'Price is required';
            }
        }

        // Validate price if provided
        if (data.price !== undefined && data.price !== null && data.price !== '') {
            const price = parseFloat(data.price);
            if (isNaN(price)) {
                return 'Price must be a valid number';
            }
            if (price < 0) {
                return 'Price cannot be negative';
            }
        }

        return null;
    }

    /**
     * Get mock analytics data for an item
     * In a real implementation, this would call an analytics API
     * @param {number|string} itemId - Menu item ID
     * @returns {Promise} - Resolves with analytics data
     */
    function getItemAnalytics(itemId) {
        return new Promise((resolve) => {
            // Mock analytics data - in production, replace with actual API call
            // Example: GET /api/v1/menuItem/analytics/:itemId
            const mockAnalytics = {
                itemId: itemId,
                timesOrdered: Math.floor(Math.random() * 500) + 10,
                totalRevenue: parseFloat((Math.random() * 5000 + 100).toFixed(2)),
                lastOrdered: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
                averageRating: parseFloat((Math.random() * 2 + 3).toFixed(1))
            };
            
            // Simulate API delay
            setTimeout(() => resolve(mockAnalytics), 200);
        });
    }

    // Public API
    return {
        fetchAll: fetchAll,
        fetchById: fetchById,
        create: create,
        update: update,
        remove: remove,
        bulkUpdatePrices: bulkUpdatePrices,
        getItemAnalytics: getItemAnalytics,
        validateItemData: validateItemData
    };
})();

// Example API Request/Response Payloads:
/*
 * GET /api/v1/menuItem/view
 * Response:
 * {
 *   "success": true,
 *   "data": [
 *     {
 *       "id": 1,
 *       "name": "Classic Burger",
 *       "category": "Main",
 *       "description": "Juicy beef patty with fresh toppings",
 *       "price": 12.99,
 *       "isAvailable": true,
 *       "imageUrl": "placeholder.jpg"
 *     }
 *   ]
 * }
 *
 * GET /api/v1/menuItem/view/1
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": 1,
 *     "name": "Classic Burger",
 *     "category": "Main",
 *     "description": "Juicy beef patty with fresh toppings",
 *     "price": 12.99,
 *     "isAvailable": true,
 *     "imageUrl": "placeholder.jpg"
 *   }
 * }
 *
 * POST /api/v1/menuItem/new
 * Request:
 * {
 *   "name": "New Item",
 *   "category": "Main",
 *   "description": "Description here",
 *   "price": 9.99,
 *   "isAvailable": true,
 *   "imageUrl": "placeholder.jpg"
 * }
 * Response:
 * {
 *   "success": true,
 *   "data": { ...created item }
 * }
 *
 * PUT /api/v1/menuItem/edit/1
 * Request:
 * {
 *   "name": "Updated Name",
 *   "price": 14.99
 * }
 * Response:
 * {
 *   "success": true,
 *   "data": { ...updated item }
 * }
 *
 * DELETE /api/v1/menuItem/delete/1
 * Response:
 * {
 *   "success": true,
 *   "message": "Item deleted successfully"
 * }
 */
