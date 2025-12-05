const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/customers - Get all customers (admin)
router.get('/', async (req, res) => {
    try {
        const { active, search, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT customer_id, first_name, last_name, email, phone, 
                   is_verified, is_active, created_at, updated_at 
            FROM customers WHERE 1=1
        `;
        const params = [];

        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND is_active = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR email ILIKE $${params.length})`;
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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
            `SELECT customer_id, first_name, last_name, email, phone, 
                    is_verified, is_active, created_at, updated_at 
             FROM customers WHERE customer_id = $1`,
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

// POST /api/customers - Create new customer (registration)
router.post('/', async (req, res) => {
    try {
        const { first_name, last_name, email, phone, password_hash } = req.body;

        if (!first_name || !last_name || !email || !password_hash) {
            return res.status(400).json({ 
                success: false, 
                error: 'first_name, last_name, email, and password_hash are required' 
            });
        }

        const result = await pool.query(
            `INSERT INTO customers 
             (first_name, last_name, email, phone, password_hash)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING customer_id, first_name, last_name, email, phone, is_verified, is_active, created_at`,
            [first_name, last_name, email, phone, password_hash]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating customer:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { first_name, last_name, phone } = req.body;

        const result = await pool.query(
            `UPDATE customers 
             SET first_name = COALESCE($1, first_name),
                 last_name = COALESCE($2, last_name),
                 phone = COALESCE($3, phone),
                 updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $4
             RETURNING customer_id, first_name, last_name, email, phone, is_verified, is_active, updated_at`,
            [first_name, last_name, phone, id]
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

// PATCH /api/customers/:id/verify - Verify customer email
router.patch('/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE customers 
             SET is_verified = true, updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $1
             RETURNING customer_id, first_name, last_name, email, is_verified`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error verifying customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/customers/:id/deactivate - Deactivate customer
router.patch('/:id/deactivate', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE customers 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP
             WHERE customer_id = $1
             RETURNING customer_id, first_name, last_name, email, is_active`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Customer not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error deactivating customer:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/customers/:id - Delete customer (hard delete - use with caution)
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
                error: 'Cannot delete customer with existing orders. Use deactivate instead.' 
            });
        }

        const result = await pool.query(
            'DELETE FROM customers WHERE customer_id = $1 RETURNING customer_id, first_name, last_name, email',
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
