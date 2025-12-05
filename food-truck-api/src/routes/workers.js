const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// GET /api/workers - Get all workers (with optional food_truck_id filter)
router.get('/', async (req, res) => {
    try {
        const { food_truck_id, active } = req.query;
        let query = `
            SELECT w.*, u.email, u.first_name, u.last_name, u.phone, u.is_active as user_active,
                   ft.name as food_truck_name
            FROM workers w
            JOIN users u ON w.user_id = u.user_id
            JOIN food_trucks ft ON w.food_truck_id = ft.food_truck_id
            WHERE 1=1
        `;
        const params = [];

        if (food_truck_id) {
            params.push(food_truck_id);
            query += ` AND w.food_truck_id = $${params.length}`;
        }
        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND w.is_active = $${params.length}`;
        }

        query += ' ORDER BY w.created_at DESC';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/workers/:id - Get single worker
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT w.*, u.email, u.first_name, u.last_name, u.phone, u.is_active as user_active,
                   ft.name as food_truck_name
            FROM workers w
            JOIN users u ON w.user_id = u.user_id
            JOIN food_trucks ft ON w.food_truck_id = ft.food_truck_id
            WHERE w.worker_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching worker:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/workers/user/:userId - Get worker by user ID
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT w.*, u.email, u.first_name, u.last_name, u.phone, u.is_active as user_active,
                   ft.name as food_truck_name
            FROM workers w
            JOIN users u ON w.user_id = u.user_id
            JOIN food_trucks ft ON w.food_truck_id = ft.food_truck_id
            WHERE w.user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching worker:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/workers - Create new worker (with user account)
router.post('/', async (req, res) => {
    const client = await pool.connect();
    try {
        const { email, password, first_name, last_name, phone, food_truck_id, role } = req.body;

        if (!email || !password || !first_name || !last_name || !food_truck_id) {
            return res.status(400).json({
                success: false,
                error: 'email, password, first_name, last_name, and food_truck_id are required'
            });
        }

        await client.query('BEGIN');

        // Hash password
        const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const userResult = await client.query(
            `INSERT INTO users (email, password_hash, first_name, last_name, phone, user_type)
             VALUES ($1, $2, $3, $4, $5, 'worker')
             RETURNING user_id`,
            [email, password_hash, first_name, last_name, phone]
        );

        // Create worker
        const workerResult = await client.query(
            `INSERT INTO workers (user_id, food_truck_id, role)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userResult.rows[0].user_id, food_truck_id, role || 'staff']
        );

        await client.query('COMMIT');

        // Fetch complete worker data
        const result = await pool.query(`
            SELECT w.*, u.email, u.first_name, u.last_name, u.phone, u.is_active as user_active,
                   ft.name as food_truck_name
            FROM workers w
            JOIN users u ON w.user_id = u.user_id
            JOIN food_trucks ft ON w.food_truck_id = ft.food_truck_id
            WHERE w.worker_id = $1
        `, [workerResult.rows[0].worker_id]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating worker:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, error: 'Email already exists' });
        }
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid food_truck_id' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// PUT /api/workers/:id - Update worker
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { food_truck_id, role, is_active } = req.body;

        const result = await pool.query(
            `UPDATE workers 
             SET food_truck_id = COALESCE($1, food_truck_id),
                 role = COALESCE($2, role),
                 is_active = COALESCE($3, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE worker_id = $4
             RETURNING *`,
            [food_truck_id, role, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating worker:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid food_truck_id' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/workers/:id/transfer - Transfer worker to different food truck
router.patch('/:id/transfer', async (req, res) => {
    try {
        const { id } = req.params;
        const { food_truck_id } = req.body;

        if (!food_truck_id) {
            return res.status(400).json({ success: false, error: 'food_truck_id is required' });
        }

        const result = await pool.query(
            `UPDATE workers 
             SET food_truck_id = $1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE worker_id = $2
             RETURNING *`,
            [food_truck_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error transferring worker:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid food_truck_id' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/workers/:id - Delete worker
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM workers WHERE worker_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Worker not found' });
        }

        res.json({ success: true, message: 'Worker deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting worker:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
