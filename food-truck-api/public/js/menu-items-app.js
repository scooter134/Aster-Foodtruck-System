/**
 * Menu Items Management - React Application
 * Functional components for managing menu items with table view,
 * modals, filtering, bulk actions, and analytics preview
 */

// ============================================
// Utility Functions
// ============================================

/**
 * Show toast notification using Bootstrap
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} type - 'success', 'danger', 'warning'
 */
function showToast(title, message, type = 'success') {
    $('#toastTitle').text(title);
    $('#toastMessage').text(message);
    
    const toastEl = document.getElementById('notificationToast');
    const toastHeader = toastEl.querySelector('.toast-header');
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

/**
 * Format price for display
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
function formatPrice(price) {
    return '$' + parseFloat(price || 0).toFixed(2);
}

// ============================================
// React Components
// ============================================

/**
 * Loading Spinner Component
 */
function LoadingSpinner({ message = 'Loading...' }) {
    return (
        <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2 text-muted">{message}</p>
        </div>
    );
}

/**
 * Empty State Component
 */
function EmptyState({ title, message, icon = 'bi-inbox' }) {
    return (
        <div className="empty-state">
            <i className={`bi ${icon}`}></i>
            <h5>{title}</h5>
            <p>{message}</p>
        </div>
    );
}

/**
 * Filter Bar Component - Search and filter controls
 */
function FilterBar({ 
    searchTerm, 
    onSearchChange, 
    categoryFilter, 
    onCategoryChange, 
    statusFilter, 
    onStatusChange, 
    categories 
}) {
    return (
        <div className="filter-bar card mb-4">
            <div className="card-body">
                <div className="row g-3 align-items-center">
                    {/* Search Input */}
                    <div className="col-md-4">
                        <div className="input-group">
                            <span className="input-group-text">
                                <i className="bi bi-search"></i>
                            </span>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by name..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                            />
                            {searchTerm && (
                                <button 
                                    className="btn btn-outline-secondary" 
                                    type="button"
                                    onClick={() => onSearchChange('')}
                                >
                                    <i className="bi bi-x"></i>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Category Filter */}
                    <div className="col-md-3">
                        <select 
                            className="form-select"
                            value={categoryFilter}
                            onChange={(e) => onCategoryChange(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {/* Status Filter */}
                    <div className="col-md-3">
                        <select 
                            className="form-select"
                            value={statusFilter}
                            onChange={(e) => onStatusChange(e.target.value)}
                        >
                            <option value="all">All Status</option>
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                        </select>
                    </div>

                    {/* Add New Button */}
                    <div className="col-md-2 text-end">
                        <a href="/menu-items/add" className="btn btn-primary w-100">
                            <i className="bi bi-plus-circle me-1"></i> Add New
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Bulk Actions Bar Component
 */
function BulkActionsBar({ 
    selectedCount, 
    onBulkPriceUpdate, 
    onClearSelection 
}) {
    const [showPriceModal, setShowPriceModal] = React.useState(false);
    const [updateType, setUpdateType] = React.useState('percentage');
    const [updateValue, setUpdateValue] = React.useState('');

    // Handle bulk price update submission
    const handlePriceUpdate = () => {
        const value = parseFloat(updateValue);
        if (isNaN(value)) {
            showToast('Error', 'Please enter a valid number', 'danger');
            return;
        }
        onBulkPriceUpdate(updateType, value);
        setShowPriceModal(false);
        setUpdateValue('');
    };

    if (selectedCount === 0) return null;

    return (
        <>
            <div className="bulk-actions-bar alert alert-info d-flex align-items-center justify-content-between mb-3">
                <span>
                    <i className="bi bi-check-circle me-2"></i>
                    <strong>{selectedCount}</strong> item{selectedCount !== 1 ? 's' : ''} selected
                </span>
                <div className="btn-group">
                    <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowPriceModal(true)}
                    >
                        <i className="bi bi-currency-dollar me-1"></i>
                        Bulk Price Update
                    </button>
                    <button 
                        className="btn btn-sm btn-outline-secondary"
                        onClick={onClearSelection}
                    >
                        <i className="bi bi-x me-1"></i>
                        Clear Selection
                    </button>
                </div>
            </div>

            {/* Bulk Price Update Modal */}
            {showPriceModal && (
                <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="bi bi-currency-dollar me-2"></i>
                                    Bulk Price Update
                                </h5>
                                <button 
                                    type="button" 
                                    className="btn-close" 
                                    onClick={() => setShowPriceModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p className="text-muted mb-3">
                                    Updating prices for <strong>{selectedCount}</strong> selected item{selectedCount !== 1 ? 's' : ''}
                                </p>
                                
                                <div className="mb-3">
                                    <label className="form-label">Update Type</label>
                                    <div className="btn-group w-100" role="group">
                                        <input 
                                            type="radio" 
                                            className="btn-check" 
                                            id="typePercentage" 
                                            checked={updateType === 'percentage'}
                                            onChange={() => setUpdateType('percentage')}
                                        />
                                        <label className="btn btn-outline-primary" htmlFor="typePercentage">
                                            Percentage (%)
                                        </label>
                                        <input 
                                            type="radio" 
                                            className="btn-check" 
                                            id="typeFixed"
                                            checked={updateType === 'fixed'}
                                            onChange={() => setUpdateType('fixed')}
                                        />
                                        <label className="btn btn-outline-primary" htmlFor="typeFixed">
                                            Fixed Amount ($)
                                        </label>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label">
                                        {updateType === 'percentage' ? 'Percentage Change' : 'Amount to Add/Subtract'}
                                    </label>
                                    <div className="input-group">
                                        <span className="input-group-text">
                                            {updateType === 'percentage' ? '%' : '$'}
                                        </span>
                                        <input
                                            type="number"
                                            className="form-control"
                                            placeholder={updateType === 'percentage' ? 'e.g., 10 or -5' : 'e.g., 2.00 or -1.50'}
                                            value={updateValue}
                                            onChange={(e) => setUpdateValue(e.target.value)}
                                            step="0.01"
                                        />
                                    </div>
                                    <small className="text-muted">
                                        Use positive values to increase, negative to decrease
                                    </small>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn btn-secondary"
                                    onClick={() => setShowPriceModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-primary"
                                    onClick={handlePriceUpdate}
                                >
                                    <i className="bi bi-check-lg me-1"></i>
                                    Apply Update
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

/**
 * Analytics Preview Component - Shows item statistics
 */
function AnalyticsPreview({ analytics, onClose }) {
    if (!analytics) return null;

    return (
        <div className="analytics-preview card border-info mb-3">
            <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                <span><i className="bi bi-graph-up me-2"></i>Item Analytics</span>
                <button className="btn btn-sm btn-light" onClick={onClose}>
                    <i className="bi bi-x"></i>
                </button>
            </div>
            <div className="card-body">
                <div className="row text-center">
                    <div className="col-6">
                        <div className="analytics-stat">
                            <h4 className="text-primary mb-0">{analytics.timesOrdered}</h4>
                            <small className="text-muted">Times Ordered</small>
                        </div>
                    </div>
                    <div className="col-6">
                        <div className="analytics-stat">
                            <h4 className="text-success mb-0">{formatPrice(analytics.totalRevenue)}</h4>
                            <small className="text-muted">Total Revenue</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * View Details Modal Component - Read-only item view
 */
function ViewDetailsModal({ item, analytics, onClose }) {
    if (!item) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="bi bi-eye me-2"></i>
                            Item Details
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="row">
                            {/* Image Placeholder */}
                            <div className="col-md-4 mb-3">
                                <div className="item-image-placeholder">
                                    {item.imageUrl ? (
                                        <img src={item.imageUrl} alt={item.name} className="img-fluid rounded" />
                                    ) : (
                                        <div className="placeholder-box">
                                            <i className="bi bi-image"></i>
                                            <span>No Image</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Item Details */}
                            <div className="col-md-8">
                                <h4>{item.name}</h4>
                                <p className="text-muted">{item.description || 'No description available'}</p>
                                
                                <div className="row mb-3">
                                    <div className="col-6">
                                        <strong>Category:</strong>
                                        <span className="badge bg-secondary ms-2">{item.category}</span>
                                    </div>
                                    <div className="col-6">
                                        <strong>Status:</strong>
                                        <span className={`badge ms-2 ${item.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                                            {item.isAvailable ? 'Available' : 'Unavailable'}
                                        </span>
                                    </div>
                                </div>
                                
                                <div className="mb-3">
                                    <strong>Price:</strong>
                                    <span className="h4 text-success ms-2">{formatPrice(item.price)}</span>
                                </div>

                                <div className="mb-3">
                                    <strong>Item ID:</strong>
                                    <span className="text-muted ms-2">#{item.id}</span>
                                </div>

                                {/* Analytics Preview */}
                                {analytics && (
                                    <div className="analytics-inline mt-4 p-3 bg-light rounded">
                                        <h6><i className="bi bi-bar-chart me-2"></i>Analytics Preview</h6>
                                        <div className="row">
                                            <div className="col-6">
                                                <small className="text-muted d-block">Times Ordered</small>
                                                <strong className="text-primary">{analytics.timesOrdered}</strong>
                                            </div>
                                            <div className="col-6">
                                                <small className="text-muted d-block">Total Revenue</small>
                                                <strong className="text-success">{formatPrice(analytics.totalRevenue)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Edit Item Modal Component - Form for editing items
 */
function EditItemModal({ item, categories, onSave, onClose, isLoading }) {
    const [formData, setFormData] = React.useState({
        name: item?.name || '',
        category: item?.category || '',
        description: item?.description || '',
        price: item?.price || '',
        isAvailable: item?.isAvailable ?? true,
        imageUrl: item?.imageUrl || ''
    });
    const [errors, setErrors] = React.useState({});
    const [newCategory, setNewCategory] = React.useState('');
    const [showNewCategory, setShowNewCategory] = React.useState(false);

    // Update form when item changes
    React.useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || '',
                category: item.category || '',
                description: item.description || '',
                price: item.price || '',
                isAvailable: item.isAvailable ?? true,
                imageUrl: item.imageUrl || ''
            });
        }
    }, [item]);

    // Handle form field changes
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when field is modified
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    // Validate form data
    const validateForm = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.category && !newCategory.trim()) {
            newErrors.category = 'Category is required';
        }

        if (!formData.price && formData.price !== 0) {
            newErrors.price = 'Price is required';
        } else if (isNaN(parseFloat(formData.price))) {
            newErrors.price = 'Price must be a valid number';
        } else if (parseFloat(formData.price) < 0) {
            newErrors.price = 'Price cannot be negative';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        const dataToSave = {
            ...formData,
            category: newCategory.trim() || formData.category,
            price: parseFloat(formData.price)
        };

        onSave(dataToSave);
    };

    if (!item) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            <i className="bi bi-pencil me-2"></i>
                            Edit Menu Item
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose} disabled={isLoading}></button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body">
                            {/* Name */}
                            <div className="mb-3">
                                <label className="form-label">Name *</label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                    value={formData.name}
                                    onChange={(e) => handleChange('name', e.target.value)}
                                    placeholder="Item name"
                                />
                                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                            </div>

                            {/* Category */}
                            <div className="mb-3">
                                <label className="form-label">Category *</label>
                                {!showNewCategory ? (
                                    <div className="d-flex gap-2">
                                        <select
                                            className={`form-select ${errors.category ? 'is-invalid' : ''}`}
                                            value={formData.category}
                                            onChange={(e) => handleChange('category', e.target.value)}
                                        >
                                            <option value="">Select category...</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <button 
                                            type="button" 
                                            className="btn btn-outline-secondary"
                                            onClick={() => setShowNewCategory(true)}
                                            title="Add new category"
                                        >
                                            <i className="bi bi-plus"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="d-flex gap-2">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="New category name"
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                        />
                                        <button 
                                            type="button" 
                                            className="btn btn-outline-secondary"
                                            onClick={() => {
                                                setShowNewCategory(false);
                                                setNewCategory('');
                                            }}
                                        >
                                            <i className="bi bi-x"></i>
                                        </button>
                                    </div>
                                )}
                                {errors.category && <div className="text-danger small mt-1">{errors.category}</div>}
                            </div>

                            {/* Description */}
                            <div className="mb-3">
                                <label className="form-label">Description</label>
                                <textarea
                                    className="form-control"
                                    rows="2"
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    placeholder="Item description..."
                                />
                            </div>

                            {/* Price */}
                            <div className="mb-3">
                                <label className="form-label">Price *</label>
                                <div className="input-group">
                                    <span className="input-group-text">$</span>
                                    <input
                                        type="number"
                                        className={`form-control ${errors.price ? 'is-invalid' : ''}`}
                                        value={formData.price}
                                        onChange={(e) => handleChange('price', e.target.value)}
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                    />
                                    {errors.price && <div className="invalid-feedback">{errors.price}</div>}
                                </div>
                            </div>

                            {/* Image URL Placeholder */}
                            <div className="mb-3">
                                <label className="form-label">Image URL (Placeholder)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={formData.imageUrl}
                                    onChange={(e) => handleChange('imageUrl', e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                />
                                <small className="text-muted">Image upload placeholder - enter URL or leave empty</small>
                            </div>

                            {/* Availability */}
                            <div className="form-check form-switch">
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    id="editAvailable"
                                    checked={formData.isAvailable}
                                    onChange={(e) => handleChange('isAvailable', e.target.checked)}
                                />
                                <label className="form-check-label" htmlFor="editAvailable">
                                    Available for ordering
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isLoading}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-1"></span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <i className="bi bi-check-lg me-1"></i>
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

/**
 * Delete Confirmation Modal Component
 */
function DeleteConfirmModal({ item, onConfirm, onCancel, isLoading }) {
    if (!item) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header bg-danger text-white">
                        <h5 className="modal-title">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            Confirm Delete
                        </h5>
                        <button type="button" className="btn-close btn-close-white" onClick={onCancel} disabled={isLoading}></button>
                    </div>
                    <div className="modal-body">
                        <p>Are you sure you want to delete this menu item?</p>
                        <div className="alert alert-secondary">
                            <strong>{item.name}</strong>
                            <br />
                            <small className="text-muted">
                                {item.category} - {formatPrice(item.price)}
                            </small>
                        </div>
                        <p className="text-danger small mb-0">
                            <i className="bi bi-info-circle me-1"></i>
                            This action cannot be undone.
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-trash me-1"></i>
                                    Delete Item
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Menu Items Table Component
 */
function MenuItemsTable({ 
    items, 
    selectedItems, 
    onSelectItem, 
    onSelectAll, 
    onView, 
    onEdit, 
    onDelete,
    onShowAnalytics 
}) {
    const allSelected = items.length > 0 && selectedItems.length === items.length;
    const someSelected = selectedItems.length > 0 && selectedItems.length < items.length;

    return (
        <div className="table-responsive">
            <table className="table table-hover menu-items-table">
                <thead className="table-light">
                    <tr>
                        <th width="40">
                            <input
                                type="checkbox"
                                className="form-check-input"
                                checked={allSelected}
                                ref={el => { if (el) el.indeterminate = someSelected; }}
                                onChange={(e) => onSelectAll(e.target.checked)}
                            />
                        </th>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Description</th>
                        <th>Price</th>
                        <th>Status</th>
                        <th width="200">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map(item => (
                        <tr key={item.id} className={!item.isAvailable ? 'table-secondary' : ''}>
                            <td>
                                <input
                                    type="checkbox"
                                    className="form-check-input"
                                    checked={selectedItems.includes(item.id)}
                                    onChange={() => onSelectItem(item.id)}
                                />
                            </td>
                            <td>
                                <span className="text-muted">#{item.id}</span>
                            </td>
                            <td>
                                <strong>{item.name}</strong>
                            </td>
                            <td>
                                <span className="badge bg-secondary">{item.category}</span>
                            </td>
                            <td>
                                <span className="description-cell" title={item.description}>
                                    {item.description ? 
                                        (item.description.length > 50 ? 
                                            item.description.substring(0, 50) + '...' : 
                                            item.description) : 
                                        <span className="text-muted">-</span>
                                    }
                                </span>
                            </td>
                            <td>
                                <span className="price-cell">{formatPrice(item.price)}</span>
                            </td>
                            <td>
                                <span className={`badge ${item.isAvailable ? 'bg-success' : 'bg-danger'}`}>
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                            </td>
                            <td>
                                <div className="btn-group btn-group-sm">
                                    <button 
                                        className="btn btn-outline-info" 
                                        onClick={() => onView(item)}
                                        title="View Details"
                                    >
                                        <i className="bi bi-eye"></i>
                                    </button>
                                    <button 
                                        className="btn btn-outline-primary" 
                                        onClick={() => onEdit(item)}
                                        title="Edit Item"
                                    >
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    <button 
                                        className="btn btn-outline-secondary" 
                                        onClick={() => onShowAnalytics(item)}
                                        title="View Analytics"
                                    >
                                        <i className="bi bi-graph-up"></i>
                                    </button>
                                    <button 
                                        className="btn btn-outline-danger" 
                                        onClick={() => onDelete(item)}
                                        title="Delete Item"
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Main Menu Items App Component
 */
function MenuItemsApp() {
    // State management
    const [menuItems, setMenuItems] = React.useState([]);
    const [filteredItems, setFilteredItems] = React.useState([]);
    const [categories, setCategories] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);

    // Filter states
    const [searchTerm, setSearchTerm] = React.useState('');
    const [categoryFilter, setCategoryFilter] = React.useState('all');
    const [statusFilter, setStatusFilter] = React.useState('all');

    // Selection state for bulk actions
    const [selectedItems, setSelectedItems] = React.useState([]);

    // Modal states
    const [viewItem, setViewItem] = React.useState(null);
    const [editItem, setEditItem] = React.useState(null);
    const [deleteItem, setDeleteItem] = React.useState(null);
    const [analyticsItem, setAnalyticsItem] = React.useState(null);
    const [analytics, setAnalytics] = React.useState(null);
    const [modalLoading, setModalLoading] = React.useState(false);

    // Load menu items on mount
    React.useEffect(() => {
        loadMenuItems();
    }, []);

    // Apply filters when dependencies change
    React.useEffect(() => {
        applyFilters();
    }, [menuItems, searchTerm, categoryFilter, statusFilter]);

    // Extract unique categories from items
    React.useEffect(() => {
        const uniqueCategories = [...new Set(menuItems.map(item => item.category).filter(Boolean))];
        setCategories(uniqueCategories.sort());
    }, [menuItems]);

    /**
     * Load all menu items from API
     */
    const loadMenuItems = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const items = await MenuItemAPI.fetchAll();
            // Normalize item properties
            const normalizedItems = items.map(item => ({
                id: item.id || item.menu_item_id || item.itemId,
                name: item.name,
                category: item.category,
                description: item.description,
                price: parseFloat(item.price) || 0,
                isAvailable: item.isAvailable ?? item.is_available ?? true,
                imageUrl: item.imageUrl || item.image_url || ''
            }));
            setMenuItems(normalizedItems);
        } catch (err) {
            setError(err.message || 'Failed to load menu items');
            showToast('Error', err.message || 'Failed to load menu items', 'danger');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Apply client-side filters to menu items
     */
    const applyFilters = () => {
        let result = [...menuItems];

        // Filter by search term (name)
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(item => 
                item.name.toLowerCase().includes(term)
            );
        }

        // Filter by category
        if (categoryFilter !== 'all') {
            result = result.filter(item => item.category === categoryFilter);
        }

        // Filter by status
        if (statusFilter !== 'all') {
            const isAvailable = statusFilter === 'available';
            result = result.filter(item => item.isAvailable === isAvailable);
        }

        setFilteredItems(result);
    };

    /**
     * Handle single item selection toggle
     */
    const handleSelectItem = (itemId) => {
        setSelectedItems(prev => {
            if (prev.includes(itemId)) {
                return prev.filter(id => id !== itemId);
            }
            return [...prev, itemId];
        });
    };

    /**
     * Handle select/deselect all items
     */
    const handleSelectAll = (checked) => {
        if (checked) {
            setSelectedItems(filteredItems.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    /**
     * Clear all selections
     */
    const clearSelection = () => {
        setSelectedItems([]);
    };

    /**
     * View item details
     */
    const handleView = async (item) => {
        setViewItem(item);
        // Load analytics for the item
        try {
            const analyticsData = await MenuItemAPI.getItemAnalytics(item.id);
            setAnalytics(analyticsData);
        } catch (err) {
            console.error('Failed to load analytics:', err);
        }
    };

    /**
     * Open edit modal
     */
    const handleEdit = (item) => {
        setEditItem(item);
    };

    /**
     * Save edited item
     */
    const handleSaveEdit = async (formData) => {
        setModalLoading(true);
        try {
            // Convert to backend field names
            const backendData = {
                name: formData.name,
                category: formData.category,
                description: formData.description,
                price: formData.price,
                is_available: formData.isAvailable,
                image_url: formData.imageUrl || null
            };
            await MenuItemAPI.update(editItem.id, backendData);
            showToast('Success', 'Menu item updated successfully');
            setEditItem(null);
            await loadMenuItems();
        } catch (err) {
            showToast('Error', err.message || 'Failed to update item', 'danger');
        } finally {
            setModalLoading(false);
        }
    };

    /**
     * Open delete confirmation
     */
    const handleDelete = (item) => {
        setDeleteItem(item);
    };

    /**
     * Confirm and execute delete
     */
    const handleConfirmDelete = async () => {
        setModalLoading(true);
        try {
            await MenuItemAPI.remove(deleteItem.id);
            showToast('Success', 'Menu item deleted successfully');
            setDeleteItem(null);
            setSelectedItems(prev => prev.filter(id => id !== deleteItem.id));
            await loadMenuItems();
        } catch (err) {
            showToast('Error', err.message || 'Failed to delete item', 'danger');
        } finally {
            setModalLoading(false);
        }
    };

    /**
     * Show analytics for item
     */
    const handleShowAnalytics = async (item) => {
        setAnalyticsItem(item);
        try {
            const analyticsData = await MenuItemAPI.getItemAnalytics(item.id);
            setAnalytics(analyticsData);
        } catch (err) {
            showToast('Error', 'Failed to load analytics', 'danger');
        }
    };

    /**
     * Handle bulk price update
     */
    const handleBulkPriceUpdate = async (type, value) => {
        if (!confirm(`Are you sure you want to update prices for ${selectedItems.length} item(s)?`)) {
            return;
        }

        setLoading(true);
        try {
            await MenuItemAPI.bulkUpdatePrices(selectedItems, { type, value });
            showToast('Success', `Prices updated for ${selectedItems.length} item(s)`);
            clearSelection();
            await loadMenuItems();
        } catch (err) {
            showToast('Error', err.message || 'Failed to update prices', 'danger');
        } finally {
            setLoading(false);
        }
    };

    // Render loading state
    if (loading && menuItems.length === 0) {
        return (
            <div className="container-fluid mt-4">
                <LoadingSpinner message="Loading menu items..." />
            </div>
        );
    }

    // Render error state
    if (error && menuItems.length === 0) {
        return (
            <div className="container-fluid mt-4">
                <div className="alert alert-danger">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                    <button className="btn btn-sm btn-outline-danger ms-3" onClick={loadMenuItems}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid mt-4">
            {/* Page Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>
                    <i className="bi bi-list-ul me-2"></i>
                    Menu Items Management
                </h2>
                <button className="btn btn-outline-secondary" onClick={loadMenuItems} disabled={loading}>
                    <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                    {loading ? ' Refreshing...' : ' Refresh'}
                </button>
            </div>

            {/* Filter Bar */}
            <FilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                categoryFilter={categoryFilter}
                onCategoryChange={setCategoryFilter}
                statusFilter={statusFilter}
                onStatusChange={setStatusFilter}
                categories={categories}
            />

            {/* Analytics Preview (when viewing) */}
            {analyticsItem && analytics && (
                <div className="mb-3">
                    <div className="card border-info">
                        <div className="card-header bg-info text-white d-flex justify-content-between align-items-center">
                            <span>
                                <i className="bi bi-graph-up me-2"></i>
                                Analytics: {analyticsItem.name}
                            </span>
                            <button 
                                className="btn btn-sm btn-light" 
                                onClick={() => { setAnalyticsItem(null); setAnalytics(null); }}
                            >
                                <i className="bi bi-x"></i>
                            </button>
                        </div>
                        <div className="card-body">
                            <div className="row text-center">
                                <div className="col-md-3">
                                    <h4 className="text-primary mb-0">{analytics.timesOrdered}</h4>
                                    <small className="text-muted">Times Ordered</small>
                                </div>
                                <div className="col-md-3">
                                    <h4 className="text-success mb-0">{formatPrice(analytics.totalRevenue)}</h4>
                                    <small className="text-muted">Total Revenue</small>
                                </div>
                                <div className="col-md-3">
                                    <h4 className="text-warning mb-0">{analytics.averageRating}</h4>
                                    <small className="text-muted">Avg Rating</small>
                                </div>
                                <div className="col-md-3">
                                    <h6 className="text-muted mb-0">
                                        {new Date(analytics.lastOrdered).toLocaleDateString()}
                                    </h6>
                                    <small className="text-muted">Last Ordered</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Actions Bar */}
            <BulkActionsBar
                selectedCount={selectedItems.length}
                onBulkPriceUpdate={handleBulkPriceUpdate}
                onClearSelection={clearSelection}
            />

            {/* Items Table or Empty State */}
            <div className="card">
                <div className="card-body p-0">
                    {filteredItems.length === 0 ? (
                        <EmptyState
                            title="No menu items found"
                            message={menuItems.length === 0 
                                ? "Add your first menu item to get started" 
                                : "Try adjusting your filters"}
                            icon="bi-list-ul"
                        />
                    ) : (
                        <MenuItemsTable
                            items={filteredItems}
                            selectedItems={selectedItems}
                            onSelectItem={handleSelectItem}
                            onSelectAll={handleSelectAll}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onShowAnalytics={handleShowAnalytics}
                        />
                    )}
                </div>
                {filteredItems.length > 0 && (
                    <div className="card-footer bg-light">
                        <small className="text-muted">
                            Showing {filteredItems.length} of {menuItems.length} items
                            {selectedItems.length > 0 && ` • ${selectedItems.length} selected`}
                        </small>
                    </div>
                )}
            </div>

            {/* Modals */}
            {viewItem && (
                <ViewDetailsModal
                    item={viewItem}
                    analytics={analytics}
                    onClose={() => { setViewItem(null); setAnalytics(null); }}
                />
            )}

            {editItem && (
                <EditItemModal
                    item={editItem}
                    categories={categories}
                    onSave={handleSaveEdit}
                    onClose={() => setEditItem(null)}
                    isLoading={modalLoading}
                />
            )}

            {deleteItem && (
                <DeleteConfirmModal
                    item={deleteItem}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteItem(null)}
                    isLoading={modalLoading}
                />
            )}
        </div>
    );
}

// ============================================
// Initialize React App
// ============================================
const root = ReactDOM.createRoot(document.getElementById('menu-items-app'));
root.render(<MenuItemsApp />);
