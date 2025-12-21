const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SALT_ROUNDS = 10;

// GET /api/users - Get all users (admin only)
router.get('/', async (req, res) => {
    try {
        const { user_type, active } = req.query;
        let query = 'SELECT user_id, email, first_name, last_name, phone, user_type, is_active, created_at FROM users WHERE 1=1';
        const params = [];

        if (user_type) {
            params.push(user_type);
            query += ` AND user_type = $${params.length}`;
        }
        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND is_active = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/users/:id - Get single user
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT user_id, email, first_name, last_name, phone, user_type, is_active, created_at FROM users WHERE user_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/users/register - Register new user
router.post('/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password, first_name, last_name, phone, user_type } = req.body;

        if (!email || !password || !first_name || !last_name || !user_type) {
            return res.status(400).json({
                success: false,
                error: 'email, password, first_name, last_name, and user_type are required'
            });
        }

        if (!['customer', 'owner', 'worker'].includes(user_type)) {
            return res.status(400).json({
                success: false,
                error: 'user_type must be customer, owner, or worker'
            });
        }

        await client.query('BEGIN');

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const userResult = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING user_id, email, first_name, last_name, phone, user_type, is_active, created_at`,
            [email, password_hash, first_name, last_name, phone, user_type]
        );

        const user = userResult.rows[0];

        // Create type-specific record
        if (user_type === 'customer') {
            await client.query(
                'INSERT INTO customers (user_id) VALUES ($1)',
                [user.user_id]
            );
        } else if (user_type === 'owner') {
            await client.query(
                'INSERT INTO owners (user_id) VALUES ($1)',
                [user.user_id]
            );
        }
        // Workers need food_truck_id, so they're added separately

        await client.query('COMMIT');

        // Generate JWT
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, user_type: user.user_type },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({ success: true, data: { user, token } });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error registering user:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// POST /api/users/login - Login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'email and password are required'
            });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }

        // Generate JWT
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, user_type: user.user_type },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Remove password_hash from response
        delete user.password_hash;

        res.json({ success: true, data: { user, token } });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone, is_active } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 phone = COALESCE($3, phone),
                 is_active = COALESCE($4, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $5
             RETURNING user_id, email, first_name, last_name, phone, user_type, is_active, updated_at`,
            [first_name, last_name, phone, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/users/:id/change-password - Change password
router.patch('/:id/change-password', async (req, res) => {
    try {
        const { id } = req.params;
        const { current_password, new_password } = req.body;

        if (!current_password || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'current_password and new_password are required'
            });
        }

        // Get current user
        const userResult = await pool.query(
            'SELECT password_hash FROM users WHERE user_id = $1',
            [id]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, error: 'Current password is incorrect' });
        }

        // Hash new password and update
        const new_password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
        await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
            [new_password_hash, id]
        );

        res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/users/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ success: false, error: 'Email is required' });
        }

        // Check if user exists
        const userResult = await pool.query(
            'SELECT user_id, email, first_name FROM users WHERE email = $1 AND is_active = true',
            [email]
        );

        if (userResult.rows.length === 0) {
            // Don't reveal if email exists for security
            return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
        }

        // Generate reset token (in production, use crypto.randomBytes)
        const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Store reset token in database
        await pool.query(
            'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE user_id = $3',
            [resetToken, resetExpires, userResult.rows[0].user_id]
        );

        // In production, send email with reset link
        // For now, return the token (demo purposes only)
        res.json({ 
            success: true, 
            message: 'Password reset token generated',
            data: { resetToken } // Remove this in production!
        });
    } catch (error) {
        console.error('Error in forgot password:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/users/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
    try {
        const { email, reset_token, new_password } = req.body;

        if (!email || !reset_token || !new_password) {
            return res.status(400).json({
                success: false,
                error: 'email, reset_token, and new_password are required'
            });
        }

        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        // Find user with valid reset token
        const userResult = await pool.query(
            `SELECT user_id FROM users 
             WHERE email = $1 AND reset_token = $2 AND reset_token_expires > NOW() AND is_active = true`,
            [email, reset_token]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid or expired reset token' 
            });
        }

        // Hash new password and update
        const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
        await pool.query(
            `UPDATE users 
             SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $2`,
            [password_hash, userResult.rows[0].user_id]
        );

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/users/:id - Delete user (soft delete by deactivating)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            `UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1 
             RETURNING user_id, email, first_name, last_name, user_type, is_active`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        res.json({ success: true, message: 'User deactivated', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
