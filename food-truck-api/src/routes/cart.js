const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/cart/:userId - Get user's cart with menu item details
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const result = await pool.query(
            `SELECT 
                ci.cart_item_id,
                ci.user_id,
                ci.quantity,
                ci.added_at,
                mi.menu_item_id,
                mi.name,
                mi.description,
                mi.price,
                mi.category,
                mi.image_url,
                mi.food_truck_id,
                (mi.price * ci.quantity) AS line_total
             FROM cart_items ci
             JOIN menu_items mi ON ci.menu_item_id = mi.menu_item_id
             WHERE ci.user_id = $1
             ORDER BY ci.added_at DESC`,
            [userId]
        );

        const total = result.rows.reduce((sum, item) => sum + parseFloat(item.line_total), 0);

        res.json({ 
            success: true, 
            data: {
                items: result.rows,
                total: total.toFixed(2),
                item_count: result.rows.length
            }
        });
    } catch (error) {
        console.error('Error fetching cart:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/cart - Add item to cart
router.post('/', async (req, res) => {
    try {
        const { user_id, menu_item_id, quantity } = req.body;

        if (!user_id || !menu_item_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'user_id and menu_item_id are required' 
            });
        }

        // Upsert: insert or update quantity if already exists
        const result = await pool.query(
            `INSERT INTO cart_items (user_id, menu_item_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, menu_item_id) 
             DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity,
                           added_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [user_id, menu_item_id, quantity ?? 1]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error adding to cart:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid user_id or menu_item_id' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/cart/:cartItemId - Update cart item quantity
router.put('/:cartItemId', async (req, res) => {
    try {
        const { cartItemId } = req.params;
        const { quantity } = req.body;

        if (!quantity || quantity < 1) {
            return res.status(400).json({ success: false, error: 'Quantity must be at least 1' });
        }

        const result = await pool.query(
            `UPDATE cart_items 
             SET quantity = $1
             WHERE cart_item_id = $2
             RETURNING *`,
            [quantity, cartItemId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cart item not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating cart item:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/cart/:cartItemId - Remove item from cart
router.delete('/:cartItemId', async (req, res) => {
    try {
        const { cartItemId } = req.params;

        const result = await pool.query(
            'DELETE FROM cart_items WHERE cart_item_id = $1 RETURNING *',
            [cartItemId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Cart item not found' });
        }

        res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        console.error('Error removing from cart:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/cart/user/:userId - Clear entire cart
router.delete('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        await pool.query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        console.error('Error clearing cart:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
