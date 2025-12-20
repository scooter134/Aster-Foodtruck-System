const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/favorites - Get favorites for a customer
router.get('/', async (req, res) => {
    try {
        const { customer_id, favorite_type } = req.query;

        if (!customer_id) {
            return res.status(400).json({ success: false, error: 'customer_id is required' });
        }

        let query = 'SELECT * FROM favorites WHERE customer_id = $1';
        const params = [customer_id];

        if (favorite_type) {
            params.push(favorite_type);
            query += ` AND favorite_type = $${params.length}`;
        }

        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/favorites - Add a favorite (food truck or menu item)
router.post('/', async (req, res) => {
    try {
        const { customer_id, favorite_type, food_truck_id, menu_item_id } = req.body;

        if (!customer_id || !favorite_type) {
            return res.status(400).json({ 
                success: false, 
                error: 'customer_id and favorite_type are required' 
            });
        }

        if (favorite_type === 'FOOD_TRUCK' && !food_truck_id) {
            return res.status(400).json({ success: false, error: 'food_truck_id is required for FOOD_TRUCK favorites' });
        }

        if (favorite_type === 'MENU_ITEM' && !menu_item_id) {
            return res.status(400).json({ success: false, error: 'menu_item_id is required for MENU_ITEM favorites' });
        }

        const result = await pool.query(
            `INSERT INTO favorites (customer_id, favorite_type, food_truck_id, menu_item_id)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [customer_id, favorite_type, food_truck_id || null, menu_item_id || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating favorite:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid foreign key (customer_id, food_truck_id, or menu_item_id)' });
        }
        if (error.code === '23514') {
            return res.status(400).json({ success: false, error: 'Invalid favorite_type or target combination' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/favorites/:id - Remove a favorite
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM favorites WHERE favorite_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Favorite not found' });
        }

        res.json({ success: true, message: 'Favorite removed', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting favorite:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
