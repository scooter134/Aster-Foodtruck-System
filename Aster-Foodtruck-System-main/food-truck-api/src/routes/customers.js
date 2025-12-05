const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/customers - Get all customers (admin)
router.get('/', async (req, res) => {
    try {
        const { active, search, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT c.customer_id, c.user_id, c.default_address, c.loyalty_points,
                   u.email, u.first_name, u.last_name, u.phone, u.is_active,
                   c.created_at, c.updated_at
            FROM customers c
            JOIN users u ON c.user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND u.is_active = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (u.first_name ILIKE $${params.length} OR u.last_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
        }

        query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
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
        const result = await pool.query(
            `SELECT c.customer_id, c.user_id, c.default_address, c.loyalty_points,
                    u.email, u.first_name, u.last_name, u.phone, u.is_active,
                    c.created_at, c.updated_at
             FROM customers c
             JOIN users u ON c.user_id = u.user_id
             WHERE c.customer_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/customers/:id/orders - Get customer orders
router.get('/:id/orders', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, limit = 20, offset = 0 } = req.query;

        let query = `
            SELECT o.*, ft.name AS food_truck_name, ts.slot_date, ts.start_time, ts.end_time
            FROM orders o
            JOIN food_trucks ft ON o.food_truck_id = ft.food_truck_id
            JOIN time_slots ts ON o.time_slot_id = ts.time_slot_id
            WHERE o.customer_id = $1
        `;
        const params = [id];

        if (status) {
            params.push(status);
            query += ` AND o.order_status = $${params.length}`;
        }

        query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching customer orders:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/customers/user/:userId - Get customer by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(
            `SELECT c.customer_id, c.user_id, c.default_address, c.loyalty_points,
                    u.email, u.first_name, u.last_name, u.phone, u.is_active,
                    c.created_at, c.updated_at
             FROM customers c
             JOIN users u ON c.user_id = u.user_id
             WHERE c.user_id = $1`,
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/customers/:id - Update customer profile
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { default_address } = req.body;

        const result = await pool.query(
            `UPDATE customers 
             SET default_address = COALESCE($1, default_address),
                 updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $2
             RETURNING *`,
            [default_address, id]
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

        if (!points || points <= 0) {
            return res.status(400).json({ success: false, error: 'Valid points amount required' });
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

        if (!points || points <= 0) {
            return res.status(400).json({ success: false, error: 'Valid points amount required' });
        }

        // Check if customer has enough points
        const customerCheck = await pool.query(
            'SELECT loyalty_points FROM customers WHERE customer_id = $1',
            [id]
        );

        if (customerCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        if (customerCheck.rows[0].loyalty_points < points) {
            return res.status(400).json({ success: false, error: 'Insufficient loyalty points' });
        }

        const result = await pool.query(
            `UPDATE customers 
             SET loyalty_points = loyalty_points - $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $2
             RETURNING *`,
            [points, id]
        );

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error redeeming points:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/customers/:id - Delete customer (cascades to user)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Check if customer has orders
        const orderCheck = await pool.query(
            'SELECT COUNT(*) FROM orders WHERE customer_id = $1',
            [id]
        );
        
        if (parseInt(orderCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete customer with existing orders. Deactivate the user instead.' 
            });
        }

        // Get user_id before deleting
        const customerResult = await pool.query(
            'SELECT user_id FROM customers WHERE customer_id = $1',
            [id]
        );

        if (customerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        // Delete from users (cascades to customers due to FK)
        await pool.query('DELETE FROM users WHERE user_id = $1', [customerResult.rows[0].user_id]);

        res.json({ success: true, message: 'Customer deleted' });
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
