const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/customers - Get all customers
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM customers c
            JOIN users u ON c.user_id = u.user_id
            ORDER BY c.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching customers:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM customers c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.customer_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/customers/user/:userId - Get customer by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT c.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM customers c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { default_address, loyalty_points } = req.body;

        const result = await pool.query(
            `UPDATE customers 
             SET default_address = COALESCE($1, default_address),
                 loyalty_points = COALESCE($2, loyalty_points),
                 updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $3
             RETURNING *`,
            [default_address, loyalty_points, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/customers/:id/add-points - Add loyalty points
router.patch('/:id/add-points', async (req, res) => {
    try {
        const { id } = req.params;
        const { points } = req.body;

        if (!points || points < 0) {
            return res.status(400).json({ success: false, error: 'Valid points value required' });
        }

        const result = await pool.query(
            `UPDATE customers 
             SET loyalty_points = loyalty_points + $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $2
             RETURNING *`,
            [points, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error adding points:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/customers/:id/redeem-points - Redeem loyalty points
router.patch('/:id/redeem-points', async (req, res) => {
    try {
        const { id } = req.params;
        const { points } = req.body;

        if (!points || points < 0) {
            return res.status(400).json({ success: false, error: 'Valid points value required' });
        }

        const result = await pool.query(
            `UPDATE customers 
             SET loyalty_points = loyalty_points - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $2 AND loyalty_points >= $1
             RETURNING *`,
            [points, id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Customer not found or insufficient points' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error redeeming points:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/customers/:id - Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM customers WHERE customer_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, message: 'Customer deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
