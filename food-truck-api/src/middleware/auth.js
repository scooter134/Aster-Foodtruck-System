const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ success: false, error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Check if user has required role
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        if (!roles.includes(req.user.user_type)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        next();
    };
};

// Check if user is owner
const requireOwner = requireRole('owner');

// Check if user is owner or worker
const requireStaff = requireRole('owner', 'worker');

// Check if user is the resource owner or admin
const requireSelfOrAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required' });
    }
    
    const requestedUserId = parseInt(req.params.id);
    if (req.user.user_id !== requestedUserId && req.user.user_type !== 'owner') {
        return res.status(403).json({ success: false, error: 'Access denied' });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireRole,
    requireOwner,
    requireStaff,
    requireSelfOrAdmin
};
