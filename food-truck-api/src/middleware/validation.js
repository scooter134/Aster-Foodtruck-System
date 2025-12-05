/**
 * Validation Middleware
 * Common validation functions for request data
 */

// Validate required fields in request body
const validateRequired = (fields) => {
    return (req, res, next) => {
        const missing = fields.filter(field => {
            const value = req.body[field];
            return value === undefined || value === null || value === '';
        });

        if (missing.length > 0) {
            return res.status(400).json({
                success: false,
                error: `Missing required fields: ${missing.join(', ')}`
            });
        }
        next();
    };
};

// Validate numeric ID parameter
const validateIdParam = (paramName = 'id') => {
    return (req, res, next) => {
        const id = req.params[paramName];
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                error: `Invalid ${paramName} parameter`
            });
        }
        req.params[paramName] = parseInt(id);
        next();
    };
};

// Validate email format
const validateEmail = (req, res, next) => {
    const { email } = req.body;
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid email format'
            });
        }
    }
    next();
};

// Validate password strength
const validatePassword = (req, res, next) => {
    const { password } = req.body;
    if (password) {
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }
    }
    next();
};

// Validate user type
const validateUserType = (req, res, next) => {
    const { user_type } = req.body;
    const validTypes = ['customer', 'owner', 'worker'];
    
    if (user_type && !validTypes.includes(user_type)) {
        return res.status(400).json({
            success: false,
            error: `Invalid user_type. Must be one of: ${validTypes.join(', ')}`
        });
    }
    next();
};

// Validate order status
const validateOrderStatus = (req, res, next) => {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled', 'refunded'];
    
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
    }
    next();
};

// Validate payment status
const validatePaymentStatus = (req, res, next) => {
    const { payment_status } = req.body;
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
    
    if (payment_status && !validStatuses.includes(payment_status)) {
        return res.status(400).json({
            success: false,
            error: `Invalid payment_status. Must be one of: ${validStatuses.join(', ')}`
        });
    }
    next();
};

// Validate date format (YYYY-MM-DD)
const validateDate = (fieldName) => {
    return (req, res, next) => {
        const date = req.body[fieldName] || req.query[fieldName];
        if (date) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid ${fieldName} format. Use YYYY-MM-DD`
                });
            }
        }
        next();
    };
};

// Validate time format (HH:MM or HH:MM:SS)
const validateTime = (fieldName) => {
    return (req, res, next) => {
        const time = req.body[fieldName];
        if (time) {
            const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
            if (!timeRegex.test(time)) {
                return res.status(400).json({
                    success: false,
                    error: `Invalid ${fieldName} format. Use HH:MM or HH:MM:SS`
                });
            }
        }
        next();
    };
};

// Validate positive number
const validatePositiveNumber = (fieldName) => {
    return (req, res, next) => {
        const value = req.body[fieldName];
        if (value !== undefined && value !== null) {
            const num = parseFloat(value);
            if (isNaN(num) || num < 0) {
                return res.status(400).json({
                    success: false,
                    error: `${fieldName} must be a positive number`
                });
            }
        }
        next();
    };
};

// Validate array is not empty
const validateNonEmptyArray = (fieldName) => {
    return (req, res, next) => {
        const arr = req.body[fieldName];
        if (arr !== undefined) {
            if (!Array.isArray(arr) || arr.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: `${fieldName} must be a non-empty array`
                });
            }
        }
        next();
    };
};

// Validate day of week (0-6)
const validateDayOfWeek = (req, res, next) => {
    const { day_of_week } = req.body;
    if (day_of_week !== undefined) {
        const day = parseInt(day_of_week);
        if (isNaN(day) || day < 0 || day > 6) {
            return res.status(400).json({
                success: false,
                error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)'
            });
        }
    }
    next();
};

// Sanitize string input (trim whitespace)
const sanitizeStrings = (fields) => {
    return (req, res, next) => {
        fields.forEach(field => {
            if (req.body[field] && typeof req.body[field] === 'string') {
                req.body[field] = req.body[field].trim();
            }
        });
        next();
    };
};

module.exports = {
    validateRequired,
    validateIdParam,
    validateEmail,
    validatePassword,
    validateUserType,
    validateOrderStatus,
    validatePaymentStatus,
    validateDate,
    validateTime,
    validatePositiveNumber,
    validateNonEmptyArray,
    validateDayOfWeek,
    sanitizeStrings
};
