/**
 * Add Menu Item - React Application
 * Functional component for creating new menu items with validation
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

// ============================================
// React Components
// ============================================

/**
 * Image Upload Placeholder Component
 * Displays a placeholder for image upload functionality
 */
function ImageUploadPlaceholder({ imageUrl, onUrlChange }) {
    const [previewError, setPreviewError] = React.useState(false);

    // Handle image URL change
    const handleUrlChange = (e) => {
        setPreviewError(false);
        onUrlChange(e.target.value);
    };

    return (
        <div className="image-upload-placeholder">
            <div className="preview-box mb-3">
                {imageUrl && !previewError ? (
                    <img 
                        src={imageUrl} 
                        alt="Preview" 
                        className="img-fluid rounded"
                        onError={() => setPreviewError(true)}
                    />
                ) : (
                    <div className="placeholder-content">
                        <i className="bi bi-image"></i>
                        <span>Image Preview</span>
                        <small className="text-muted d-block mt-2">
                            Enter URL below or upload coming soon
                        </small>
                    </div>
                )}
            </div>
            
            <div className="mb-3">
                <label className="form-label">Image URL (Placeholder)</label>
                <input
                    type="text"
                    className="form-control"
                    value={imageUrl}
                    onChange={handleUrlChange}
                    placeholder="https://example.com/image.jpg"
                />
                <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Image upload feature placeholder - enter URL or leave empty
                </small>
            </div>

            {/* Upload Button Placeholder (non-functional) */}
            <div className="upload-placeholder">
                <button type="button" className="btn btn-outline-secondary w-100" disabled>
                    <i className="bi bi-cloud-upload me-2"></i>
                    Upload Image (Coming Soon)
                </button>
            </div>
        </div>
    );
}

/**
 * Form Field Component - Reusable input field with validation display
 */
function FormField({ 
    label, 
    type = 'text', 
    value, 
    onChange, 
    placeholder, 
    required = false, 
    error,
    helpText,
    inputPrefix,
    inputSuffix,
    children,
    ...props 
}) {
    const inputId = `field-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className="mb-3">
            <label className="form-label" htmlFor={inputId}>
                {label} {required && <span className="text-danger">*</span>}
            </label>
            
            {children ? (
                children
            ) : (
                <div className={inputPrefix || inputSuffix ? 'input-group' : ''}>
                    {inputPrefix && <span className="input-group-text">{inputPrefix}</span>}
                    <input
                        type={type}
                        id={inputId}
                        className={`form-control ${error ? 'is-invalid' : ''}`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        {...props}
                    />
                    {inputSuffix && <span className="input-group-text">{inputSuffix}</span>}
                    {error && <div className="invalid-feedback">{error}</div>}
                </div>
            )}
            
            {helpText && <small className="text-muted">{helpText}</small>}
            {!inputPrefix && !inputSuffix && error && (
                <div className="text-danger small mt-1">{error}</div>
            )}
        </div>
    );
}

/**
 * Category Selector Component - Dropdown with option to add new category
 */
function CategorySelector({ 
    value, 
    onChange, 
    categories, 
    error,
    onNewCategory 
}) {
    const [showNewInput, setShowNewInput] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState('');

    // Handle adding new category
    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            onNewCategory(newCategoryName.trim());
            onChange(newCategoryName.trim());
            setNewCategoryName('');
            setShowNewInput(false);
        }
    };

    // Handle key press in new category input
    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCategory();
        }
    };

    return (
        <div className="mb-3">
            <label className="form-label">
                Category <span className="text-danger">*</span>
            </label>
            
            {!showNewInput ? (
                <div className="d-flex gap-2">
                    <select
                        className={`form-select ${error ? 'is-invalid' : ''}`}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                    >
                        <option value="">Select category...</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <button 
                        type="button" 
                        className="btn btn-outline-primary"
                        onClick={() => setShowNewInput(true)}
                        title="Add new category"
                    >
                        <i className="bi bi-plus-lg"></i>
                    </button>
                </div>
            ) : (
                <div className="d-flex gap-2">
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Enter new category name"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        onKeyPress={handleKeyPress}
                        autoFocus
                    />
                    <button 
                        type="button" 
                        className="btn btn-success"
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim()}
                    >
                        <i className="bi bi-check-lg"></i>
                    </button>
                    <button 
                        type="button" 
                        className="btn btn-outline-secondary"
                        onClick={() => {
                            setShowNewInput(false);
                            setNewCategoryName('');
                        }}
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
            )}
            
            {error && <div className="text-danger small mt-1">{error}</div>}
        </div>
    );
}

/**
 * Main Add Menu Item Form Component
 */
function AddMenuItemForm() {
    // Default categories - will be dynamically populated from existing items
    const defaultCategories = ['Main', 'Sides', 'Drinks', 'Desserts'];

    // Form state
    const [formData, setFormData] = React.useState({
        name: '',
        category: '',
        description: '',
        price: '',
        isAvailable: true,
        imageUrl: ''
    });

    // Categories state (includes defaults + any from existing items)
    const [categories, setCategories] = React.useState(defaultCategories);
    
    // Validation errors
    const [errors, setErrors] = React.useState({});
    
    // Loading state
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    // Success state
    const [submitSuccess, setSubmitSuccess] = React.useState(false);

    // Load existing categories from menu items on mount
    React.useEffect(() => {
        loadExistingCategories();
    }, []);

    /**
     * Load categories from existing menu items
     */
    const loadExistingCategories = async () => {
        try {
            const items = await MenuItemAPI.fetchAll();
            const existingCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
            const allCategories = [...new Set([...defaultCategories, ...existingCategories])];
            setCategories(allCategories.sort());
        } catch (err) {
            console.error('Failed to load categories:', err);
            // Keep default categories on error
        }
    };

    /**
     * Handle form field change
     */
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error when field is modified
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };

    /**
     * Add new category to the list
     */
    const handleNewCategory = (categoryName) => {
        if (!categories.includes(categoryName)) {
            setCategories(prev => [...prev, categoryName].sort());
        }
    };

    /**
     * Validate form data
     * @returns {boolean} True if valid
     */
    const validateForm = () => {
        const newErrors = {};

        // Name validation - required
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (formData.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        // Category validation - required
        if (!formData.category) {
            newErrors.category = 'Please select a category';
        }

        // Price validation - required, numeric, non-negative
        if (!formData.price && formData.price !== 0) {
            newErrors.price = 'Price is required';
        } else {
            const priceValue = parseFloat(formData.price);
            if (isNaN(priceValue)) {
                newErrors.price = 'Price must be a valid number';
            } else if (priceValue < 0) {
                newErrors.price = 'Price cannot be negative';
            } else if (priceValue > 9999.99) {
                newErrors.price = 'Price cannot exceed $9,999.99';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    /**
     * Handle form submission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            showToast('Validation Error', 'Please fix the errors before submitting', 'danger');
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare data for API - using backend field names
            const itemData = {
                food_truck_id: 1, // Default food truck ID (would come from context in real app)
                name: formData.name.trim(),
                category: formData.category,
                description: formData.description.trim(),
                price: parseFloat(formData.price),
                is_available: formData.isAvailable,
                image_url: formData.imageUrl.trim() || null
            };

            // Call API to create item
            await MenuItemAPI.create(itemData);

            // Show success message
            setSubmitSuccess(true);
            showToast('Success', 'Menu item created successfully!', 'success');

            // Redirect to list page after delay
            setTimeout(() => {
                window.location.href = '/menu-items';
            }, 1500);

        } catch (err) {
            showToast('Error', err.message || 'Failed to create menu item', 'danger');
        } finally {
            setIsSubmitting(false);
        }
    };

    /**
     * Reset form to initial state
     */
    const handleReset = () => {
        setFormData({
            name: '',
            category: '',
            description: '',
            price: '',
            isAvailable: true,
            imageUrl: ''
        });
        setErrors({});
    };

    // Success state render
    if (submitSuccess) {
        return (
            <div className="container mt-4">
                <div className="row justify-content-center">
                    <div className="col-md-6">
                        <div className="card text-center">
                            <div className="card-body py-5">
                                <i className="bi bi-check-circle text-success" style={{ fontSize: '4rem' }}></i>
                                <h4 className="mt-3">Menu Item Created!</h4>
                                <p className="text-muted">Redirecting to menu items list...</p>
                                <div className="spinner-border spinner-border-sm text-primary"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-lg-8">
                    {/* Page Header */}
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2>
                            <i className="bi bi-plus-circle me-2"></i>
                            Add New Menu Item
                        </h2>
                        <a href="/menu-items" className="btn btn-outline-secondary">
                            <i className="bi bi-arrow-left me-1"></i>
                            Back to List
                        </a>
                    </div>

                    {/* Main Form Card */}
                    <div className="card shadow-sm">
                        <div className="card-header bg-white">
                            <h5 className="mb-0">
                                <i className="bi bi-info-circle me-2 text-primary"></i>
                                Item Information
                            </h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleSubmit}>
                                <div className="row">
                                    {/* Left Column - Form Fields */}
                                    <div className="col-md-7">
                                        {/* Name Field */}
                                        <FormField
                                            label="Item Name"
                                            value={formData.name}
                                            onChange={(val) => handleChange('name', val)}
                                            placeholder="e.g., Classic Burger"
                                            required
                                            error={errors.name}
                                        />

                                        {/* Category Selector */}
                                        <CategorySelector
                                            value={formData.category}
                                            onChange={(val) => handleChange('category', val)}
                                            categories={categories}
                                            error={errors.category}
                                            onNewCategory={handleNewCategory}
                                        />

                                        {/* Description Field */}
                                        <div className="mb-3">
                                            <label className="form-label">Description</label>
                                            <textarea
                                                className="form-control"
                                                rows="3"
                                                value={formData.description}
                                                onChange={(e) => handleChange('description', e.target.value)}
                                                placeholder="Describe your menu item..."
                                            />
                                            <small className="text-muted">
                                                Optional - provide details about ingredients, preparation, etc.
                                            </small>
                                        </div>

                                        {/* Price Field */}
                                        <FormField
                                            label="Price"
                                            type="number"
                                            value={formData.price}
                                            onChange={(val) => handleChange('price', val)}
                                            placeholder="0.00"
                                            required
                                            error={errors.price}
                                            inputPrefix="$"
                                            step="0.01"
                                            min="0"
                                            max="9999.99"
                                        />

                                        {/* Availability Toggle */}
                                        <div className="mb-3">
                                            <div className="form-check form-switch">
                                                <input
                                                    type="checkbox"
                                                    className="form-check-input"
                                                    id="itemAvailable"
                                                    checked={formData.isAvailable}
                                                    onChange={(e) => handleChange('isAvailable', e.target.checked)}
                                                />
                                                <label className="form-check-label" htmlFor="itemAvailable">
                                                    Available for ordering
                                                </label>
                                            </div>
                                            <small className="text-muted">
                                                {formData.isAvailable 
                                                    ? 'Item will be visible to customers' 
                                                    : 'Item will be hidden from menu'}
                                            </small>
                                        </div>
                                    </div>

                                    {/* Right Column - Image Upload Placeholder */}
                                    <div className="col-md-5">
                                        <ImageUploadPlaceholder
                                            imageUrl={formData.imageUrl}
                                            onUrlChange={(val) => handleChange('imageUrl', val)}
                                        />
                                    </div>
                                </div>

                                <hr className="my-4" />

                                {/* Form Actions */}
                                <div className="d-flex justify-content-between">
                                    <button 
                                        type="button" 
                                        className="btn btn-outline-secondary"
                                        onClick={handleReset}
                                        disabled={isSubmitting}
                                    >
                                        <i className="bi bi-arrow-counterclockwise me-1"></i>
                                        Reset Form
                                    </button>
                                    
                                    <div className="btn-group">
                                        <a href="/menu-items" className="btn btn-secondary">
                                            Cancel
                                        </a>
                                        <button 
                                            type="submit" 
                                            className="btn btn-primary"
                                            disabled={isSubmitting}
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-1"></span>
                                                    Creating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-check-lg me-1"></i>
                                                    Create Menu Item
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Help Card */}
                    <div className="card mt-4 border-info">
                        <div className="card-body">
                            <h6 className="card-title text-info">
                                <i className="bi bi-lightbulb me-2"></i>
                                Tips for Adding Menu Items
                            </h6>
                            <ul className="mb-0 small text-muted">
                                <li>Use clear, descriptive names that customers will easily understand</li>
                                <li>Add detailed descriptions including key ingredients or dietary info</li>
                                <li>Set competitive prices that reflect item value and costs</li>
                                <li>Create new categories as needed to organize your menu effectively</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// Initialize React App
// ============================================
const root = ReactDOM.createRoot(document.getElementById('add-menu-item-app'));
root.render(<AddMenuItemForm />);
