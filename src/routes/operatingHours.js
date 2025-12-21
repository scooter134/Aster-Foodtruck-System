const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/operating-hours - Get all operating hours (with filters)
router.get('/', async (req, res) => {
    try {
        const { food_truck_id, day_of_week, active } = req.query;
        let query = 'SELECT * FROM operating_hours WHERE 1=1';
        const params = [];

        if (food_truck_id) {
            params.push(food_truck_id);
            query += ` AND food_truck_id = $${params.length}`;
        }
        if (day_of_week !== undefined) {
            params.push(day_of_week);
            query += ` AND day_of_week = $${params.length}`;
        }
        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND is_active = $${params.length}`;
        }

        query += ' ORDER BY food_truck_id, day_of_week, open_time';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching operating hours:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/operating-hours/:id - Get single operating hour
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM operating_hours WHERE operating_hour_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Operating hour not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching operating hour:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/operating-hours - Create new operating hour
router.post('/', async (req, res) => {
    try {
        const { food_truck_id, day_of_week, open_time, close_time, is_active } = req.body;

        if (!food_truck_id || day_of_week === undefined || !open_time || !close_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'food_truck_id, day_of_week, open_time, and close_time are required' 
            });
        }

        const result = await pool.query(
            `INSERT INTO operating_hours 
             (food_truck_id, day_of_week, open_time, close_time, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [food_truck_id, day_of_week, open_time, close_time, is_active ?? true]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating operating hour:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid food_truck_id' });
        }
        if (error.code === '23514') {
            return res.status(400).json({ success: false, error: 'Invalid time range or day_of_week' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/operating-hours/:id - Update operating hour
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { day_of_week, open_time, close_time, is_active } = req.body;

        const result = await pool.query(
            `UPDATE operating_hours 
             SET day_of_week = COALESCE($1, day_of_week),
                 open_time = COALESCE($2, open_time),
                 close_time = COALESCE($3, close_time),
                 is_active = COALESCE($4, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE operating_hour_id = $5
             RETURNING *`,
            [day_of_week, open_time, close_time, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Operating hour not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating operating hour:', error);
        if (error.code === '23514') {
            return res.status(400).json({ success: false, error: 'Invalid time range or day_of_week' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/operating-hours/:id - Delete operating hour
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM operating_hours WHERE operating_hour_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Operating hour not found' });
        }

        res.json({ success: true, message: 'Operating hour deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting operating hour:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
