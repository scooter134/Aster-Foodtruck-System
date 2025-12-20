const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/notifications - Get notifications for a user
router.get('/', async (req, res) => {
    try {
        const { user_id, is_read } = req.query;

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'user_id is required' });
        }

        let query = 'SELECT * FROM notifications WHERE user_id = $1';
        const params = [user_id];

        if (is_read !== undefined) {
            params.push(is_read === 'true');
            query += ` AND is_read = $${params.length}`;
        }

        query += ' ORDER BY sent_at DESC';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/notifications - Create a notification
router.post('/', async (req, res) => {
    try {
        const { user_id, type, title, body, order_id, food_truck_id, menu_item_id } = req.body;

        if (!user_id || !type || !title || !body) {
            return res.status(400).json({ 
                success: false, 
                error: 'user_id, type, title, and body are required' 
            });
        }

        const result = await pool.query(
            `INSERT INTO notifications 
             (user_id, type, title, body, order_id, food_truck_id, menu_item_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [user_id, type, title, body, order_id || null, food_truck_id || null, menu_item_id || null]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating notification:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid foreign key (user_id, food_truck_id, menu_item_id, or order_id)' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE notifications
             SET is_read = true,
                 read_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE notification_id = $1
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM notifications WHERE notification_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Notification not found' });
        }

        res.json({ success: true, message: 'Notification deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
