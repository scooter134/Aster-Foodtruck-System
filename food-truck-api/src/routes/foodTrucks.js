const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================
// FOOD TRUCKS ENDPOINTS
// ============================================

// GET /api/food-trucks - Get all food trucks (with filters)
router.get('/', async (req, res) => {
    try {
        const { owner_id, location, active } = req.query;
        let query = 'SELECT * FROM food_trucks WHERE 1=1';
        const params = [];

        if (owner_id) {
            params.push(owner_id);
            query += ` AND owner_id = $${params.length}`;
        }
        if (location) {
            params.push(`%${location}%`);
            query += ` AND location_description ILIKE $${params.length}`;
        }
        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND is_active = $${params.length}`;
        }

        query += ' ORDER BY name';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching food trucks:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/food-trucks/active - Get active food trucks
router.get('/active', async (req, res) => {
    try {
        const { owner_id, location } = req.query;
        let query = 'SELECT * FROM food_trucks WHERE is_active = true';
        const params = [];

        if (owner_id) {
            params.push(owner_id);
            query += ` AND owner_id = $${params.length}`;
        }
        if (location) {
            params.push(`%${location}%`);
            query += ` AND location_description ILIKE $${params.length}`;
        }

        query += ' ORDER BY name';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching active food trucks:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/food-trucks/:id - Get single food truck
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM food_trucks WHERE food_truck_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Food truck not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/food-trucks - Create new food truck
router.post('/', async (req, res) => {
    try {
        const { owner_id, name, description, location_description, is_active } = req.body;

        if (!owner_id || !name) {
            return res.status(400).json({ 
                success: false, 
                error: 'owner_id and name are required' 
            });
        }

        const result = await pool.query(
            `INSERT INTO food_trucks 
             (owner_id, name, description, location_description, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [owner_id, name, description, location_description, is_active ?? true]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating food truck:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid owner_id' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/food-trucks/:id - Update food truck
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, location_description, is_active } = req.body;

        const result = await pool.query(
            `UPDATE food_trucks 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 location_description = COALESCE($3, location_description),
                 is_active = COALESCE($4, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE food_truck_id = $5
             RETURNING *`,
            [name, description, location_description, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Food truck not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/food-trucks/:id - Delete food truck
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM food_trucks WHERE food_truck_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Food truck not found' });
        }

        res.json({ success: true, message: 'Food truck deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
