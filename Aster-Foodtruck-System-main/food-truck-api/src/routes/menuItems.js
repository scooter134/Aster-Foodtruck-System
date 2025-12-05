const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/menu-items - Get all menu items (with optional food_truck_id filter)
router.get('/', async (req, res) => {
    try {
        const { food_truck_id, category, available } = req.query;
        let query = 'SELECT * FROM menu_items WHERE 1=1';
        const params = [];

        if (food_truck_id) {
            params.push(food_truck_id);
            query += ` AND food_truck_id = $${params.length}`;
        }
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
        console.error('Error fetching menu items:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/menu-items/:id - Get single menu item
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM menu_items WHERE menu_item_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching menu item:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/menu-items - Create new menu item
router.post('/', async (req, res) => {
    try {
        const { food_truck_id, name, description, price, category, is_available, image_url } = req.body;

        if (!food_truck_id || !name || price === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: 'food_truck_id, name, and price are required' 
            });
        }

        const result = await pool.query(
            `INSERT INTO menu_items 
             (food_truck_id, name, description, price, category, is_available, image_url)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [food_truck_id, name, description, price, category, is_available ?? true, image_url]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating menu item:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid food_truck_id' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/menu-items/:id - Update menu item
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, is_available, image_url } = req.body;

        const result = await pool.query(
            `UPDATE menu_items 
             SET name = COALESCE($1, name),
                 description = COALESCE($2, description),
                 price = COALESCE($3, price),
                 category = COALESCE($4, category),
                 is_available = COALESCE($5, is_available),
                 image_url = COALESCE($6, image_url),
                 updated_at = CURRENT_TIMESTAMP
             WHERE menu_item_id = $7
             RETURNING *`,
            [name, description, price, category, is_available, image_url, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating menu item:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/menu-items/:id - Delete menu item
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM menu_items WHERE menu_item_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Menu item not found' });
        }

        res.json({ success: true, message: 'Menu item deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting menu item:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
