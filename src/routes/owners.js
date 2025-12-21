const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/owners - Get all owners
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT o.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM owners o
            JOIN users u ON o.user_id = u.user_id
            ORDER BY o.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching owners:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/owners/user/:userId - Get owner by user ID (MUST be before /:id)
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const result = await pool.query(`
            SELECT o.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM owners o
            JOIN users u ON o.user_id = u.user_id
            WHERE o.user_id = $1
        `, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Owner not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching owner:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/owners/:id - Get single owner with their food trucks
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get owner info
        const ownerResult = await pool.query(`
            SELECT o.*, u.email, u.first_name, u.last_name, u.phone, u.is_active
            FROM owners o
            JOIN users u ON o.user_id = u.user_id
            WHERE o.owner_id = $1
        `, [id]);

        if (ownerResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Owner not found' });
        }

        // Get owner's food trucks
        const trucksResult = await pool.query(
            'SELECT * FROM food_trucks WHERE owner_id = $1 ORDER BY name',
            [id]
        );

        const owner = ownerResult.rows[0];
        owner.food_trucks = trucksResult.rows;

        res.json({ success: true, data: owner });
    } catch (error) {
        console.error('Error fetching owner:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/owners/:id - Update owner
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { business_name, tax_id } = req.body;

        const result = await pool.query(
            `UPDATE owners 
             SET business_name = COALESCE($1, business_name),
                 tax_id = COALESCE($2, tax_id),
                 updated_at = CURRENT_TIMESTAMP
             WHERE owner_id = $3
             RETURNING *`,
            [business_name, tax_id, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Owner not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating owner:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/owners/:id - Delete owner
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM owners WHERE owner_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Owner not found' });
        }

        res.json({ success: true, message: 'Owner deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting owner:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
