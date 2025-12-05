const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/food-trucks - Get all food trucks
router.get('/', async (req, res) => {
    try {
        const { owner_id, cuisine_type, active } = req.query;
        let query = `
            SELECT ft.*, o.business_name, u.first_name as owner_first_name, u.last_name as owner_last_name
            FROM food_trucks ft
            JOIN owners o ON ft.owner_id = o.owner_id
            JOIN users u ON o.user_id = u.user_id
            WHERE 1=1
        `;
        const params = [];

        if (owner_id) {
            params.push(owner_id);
            query += ` AND ft.owner_id = $${params.length}`;
        }
        if (cuisine_type) {
            params.push(cuisine_type);
            query += ` AND ft.cuisine_type = $${params.length}`;
        }
        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND ft.is_active = $${params.length}`;
        }

        query += ' ORDER BY ft.name';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching food trucks:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/food-trucks/:id - Get single food truck with details
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get food truck info
        const truckResult = await pool.query(`
            SELECT ft.*, o.business_name, u.first_name as owner_first_name, u.last_name as owner_last_name
            FROM food_trucks ft
            JOIN owners o ON ft.owner_id = o.owner_id
            JOIN users u ON o.user_id = u.user_id
            WHERE ft.food_truck_id = $1
        `, [id]);

        if (truckResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Food truck not found' });
        }

        const foodTruck = truckResult.rows[0];

        // Get menu items count
        const menuCount = await pool.query(
            'SELECT COUNT(*) FROM menu_items WHERE food_truck_id = $1',
            [id]
        );
        foodTruck.menu_items_count = parseInt(menuCount.rows[0].count);

        // Get workers count
        const workersCount = await pool.query(
            'SELECT COUNT(*) FROM workers WHERE food_truck_id = $1 AND is_active = true',
            [id]
        );
        foodTruck.workers_count = parseInt(workersCount.rows[0].count);

        res.json({ success: true, data: foodTruck });
    } catch (error) {
        console.error('Error fetching food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/food-trucks/:id/menu - Get food truck's menu
router.get('/:id/menu', async (req, res) => {
    try {
        const { id } = req.params;
        const { category, available } = req.query;

        let query = 'SELECT * FROM menu_items WHERE food_truck_id = $1';
        const params = [id];

        if (category) {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }
        if (available !== undefined) {
            params.push(available === 'true');
            query += ` AND is_available = $${params.length}`;
        }

        query += ' ORDER BY category, name';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching menu:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/food-trucks/:id/workers - Get food truck's workers
router.get('/:id/workers', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(`
            SELECT w.*, u.email, u.first_name, u.last_name, u.phone
            FROM workers w
            JOIN users u ON w.user_id = u.user_id
            WHERE w.food_truck_id = $1 AND w.is_active = true
            ORDER BY w.role, u.last_name
        `, [id]);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching workers:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/food-trucks/:id/time-slots - Get food truck's time slots
router.get('/:id/time-slots', async (req, res) => {
    try {
        const { id } = req.params;
        const { slot_date, available } = req.query;

        let query = 'SELECT * FROM time_slots WHERE food_truck_id = $1';
        const params = [id];

        if (slot_date) {
            params.push(slot_date);
            query += ` AND slot_date = $${params.length}`;
        } else {
            query += ' AND slot_date >= CURRENT_DATE';
        }

        if (available === 'true') {
            query += ' AND current_orders < max_orders AND is_active = true';
        }

        query += ' ORDER BY slot_date, start_time';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching time slots:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/food-trucks - Create new food truck
router.post('/', async (req, res) => {
    try {
        const { owner_id, name, description, cuisine_type, license_number } = req.body;

        if (!owner_id || !name) {
            return res.status(400).json({
                success: false,
                error: 'owner_id and name are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO food_trucks (owner_id, name, description, cuisine_type, license_number)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [owner_id, name, description, cuisine_type, license_number]
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
        const { name, description, cuisine_type, license_number, is_active } = req.body;

        const result = await pool.query(
            `UPDATE food_trucks 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 cuisine_type = COALESCE($3, cuisine_type),
                 license_number = COALESCE($4, license_number),
                 is_active = COALESCE($5, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE food_truck_id = $6
             RETURNING *`,
            [name, description, cuisine_type, license_number, is_active, id]
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
