const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================
// GET /api/orders - Get all orders (with filters)
// ============================================
router.get('/', async (req, res) => {
    try {
        const { customer_id, food_truck_id, status, payment_status, from_date, to_date, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT o.*, 
                   u.first_name || ' ' || u.last_name AS customer_name,
                   u.email AS customer_email,
                   ft.name AS food_truck_name,
                   ts.slot_date, ts.start_time, ts.end_time
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            JOIN food_trucks ft ON o.food_truck_id = ft.food_truck_id
            JOIN time_slots ts ON o.time_slot_id = ts.time_slot_id
            WHERE 1=1
        `;
        const params = [];

        if (customer_id) {
            params.push(customer_id);
            query += ` AND o.customer_id = $${params.length}`;
        }
        if (food_truck_id) {
            params.push(food_truck_id);
            query += ` AND o.food_truck_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND o.order_status = $${params.length}`;
        }
        if (payment_status) {
            params.push(payment_status);
            query += ` AND o.payment_status = $${params.length}`;
        }
        if (from_date) {
            params.push(from_date);
            query += ` AND o.created_at >= $${params.length}`;
        }
        if (to_date) {
            params.push(to_date);
            query += ` AND o.created_at <= $${params.length}`;
        }

        query += ` ORDER BY o.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM orders o WHERE 1=1';
        const countParams = [];
        if (customer_id) { countParams.push(customer_id); countQuery += ` AND o.customer_id = $${countParams.length}`; }
        if (food_truck_id) { countParams.push(food_truck_id); countQuery += ` AND o.food_truck_id = $${countParams.length}`; }
        if (status) { countParams.push(status); countQuery += ` AND o.order_status = $${countParams.length}`; }
        if (payment_status) { countParams.push(payment_status); countQuery += ` AND o.payment_status = $${countParams.length}`; }
        
        const countResult = await pool.query(countQuery, countParams);

        res.json({ 
            success: true, 
            data: result.rows,
            pagination: {
                total: parseInt(countResult.rows[0].count),
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// GET /api/orders/stats/summary - Get order statistics
// Note: This MUST be before /:id to prevent route conflicts
// ============================================
router.get('/stats/summary', async (req, res) => {
    try {
        const { food_truck_id, from_date, to_date } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];

        if (food_truck_id) {
            params.push(food_truck_id);
            whereClause += ` AND food_truck_id = $${params.length}`;
        }
        if (from_date) {
            params.push(from_date);
            whereClause += ` AND created_at >= $${params.length}`;
        }
        if (to_date) {
            params.push(to_date);
            whereClause += ` AND created_at <= $${params.length}`;
        }

        const statsResult = await pool.query(`
            SELECT 
                COUNT(*) as total_orders,
                COUNT(*) FILTER (WHERE order_status = 'pending') as pending_orders,
                COUNT(*) FILTER (WHERE order_status = 'confirmed') as confirmed_orders,
                COUNT(*) FILTER (WHERE order_status = 'preparing') as preparing_orders,
                COUNT(*) FILTER (WHERE order_status = 'ready') as ready_orders,
                COUNT(*) FILTER (WHERE order_status = 'picked_up') as completed_orders,
                COUNT(*) FILTER (WHERE order_status = 'cancelled') as cancelled_orders,
                SUM(total_amount) FILTER (WHERE order_status = 'picked_up') as total_revenue,
                AVG(total_amount) FILTER (WHERE order_status = 'picked_up') as average_order_value
            FROM orders
            ${whereClause}
        `, params);

        res.json({ success: true, data: statsResult.rows[0] });
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// GET /api/orders/number/:orderNumber - Get order by order number
// Note: This MUST be before /:id to prevent route conflicts
// ============================================
router.get('/number/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        
        const result = await pool.query(`
            SELECT o.*, 
                   u.first_name || ' ' || u.last_name AS customer_name,
                   ft.name AS food_truck_name,
                   ts.slot_date, ts.start_time, ts.end_time
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            JOIN food_trucks ft ON o.food_truck_id = ft.food_truck_id
            JOIN time_slots ts ON o.time_slot_id = ts.time_slot_id
            WHERE o.order_number = $1
        `, [orderNumber]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching order by number:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// GET /api/orders/:id - Get single order with items
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get order details
        const orderResult = await pool.query(`
            SELECT o.*, 
                   u.first_name || ' ' || u.last_name AS customer_name,
                   u.email AS customer_email,
                   u.phone AS customer_phone,
                   ft.name AS food_truck_name,
                   ts.slot_date, ts.start_time, ts.end_time
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            JOIN food_trucks ft ON o.food_truck_id = ft.food_truck_id
            JOIN time_slots ts ON o.time_slot_id = ts.time_slot_id
            WHERE o.order_id = $1
        `, [id]);

        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        // Get order items
        const itemsResult = await pool.query(`
            SELECT oi.*, mi.name AS menu_item_name, mi.description AS menu_item_description
            FROM order_items oi
            JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
            WHERE oi.order_id = $1
            ORDER BY oi.order_item_id
        `, [id]);

        // Get allergy notes
        const allergyResult = await pool.query(`
            SELECT * FROM allergy_notes WHERE order_id = $1
        `, [id]);

        // Get status history
        const historyResult = await pool.query(`
            SELECT * FROM order_status_history 
            WHERE order_id = $1 
            ORDER BY created_at DESC
        `, [id]);

        res.json({ 
            success: true, 
            data: {
                ...orderResult.rows[0],
                items: itemsResult.rows,
                allergy_notes: allergyResult.rows,
                status_history: historyResult.rows
            }
        });
    } catch (error) {
        console.error('Error fetching order:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// POST /api/orders - Create new order
// ============================================
router.post('/', async (req, res) => {
    const client = await pool.connect();
    
    try {
        const { 
            customer_id, 
            food_truck_id, 
            time_slot_id, 
            items, 
            special_instructions,
            payment_method,
            allergy_notes 
        } = req.body;

        // Validation
        if (!customer_id || !food_truck_id || !time_slot_id || !items || items.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'customer_id, food_truck_id, time_slot_id, and items are required' 
            });
        }

        await client.query('BEGIN');

        // Check time slot availability
        const slotCheck = await client.query(`
            SELECT * FROM time_slots 
            WHERE time_slot_id = $1 
              AND is_active = true 
              AND current_orders < max_orders
        `, [time_slot_id]);

        if (slotCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'Time slot is not available' });
        }

        // Validate all menu items and calculate totals
        const menuItemIds = items.map(i => i.menu_item_id);
        const menuItemsResult = await client.query(`
            SELECT menu_item_id, name, price 
            FROM menu_items 
            WHERE menu_item_id = ANY($1) AND is_available = true
        `, [menuItemIds]);

        if (menuItemsResult.rows.length !== menuItemIds.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, error: 'One or more menu items are invalid or unavailable' });
        }

        // Create price lookup map
        const priceMap = {};
        menuItemsResult.rows.forEach(item => {
            priceMap[item.menu_item_id] = parseFloat(item.price);
        });

        // Calculate subtotal
        let subtotal = 0;
        items.forEach(item => {
            subtotal += priceMap[item.menu_item_id] * item.quantity;
        });

        const taxRate = 0.08; // 8% tax rate
        const taxAmount = Math.round(subtotal * taxRate * 100) / 100;
        const discountAmount = 0;
        const totalAmount = subtotal + taxAmount - discountAmount;

        // Create order
        const orderResult = await client.query(`
            INSERT INTO orders 
            (customer_id, food_truck_id, time_slot_id, subtotal, tax_amount, discount_amount, total_amount, special_instructions, payment_method)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [customer_id, food_truck_id, time_slot_id, subtotal, taxAmount, discountAmount, totalAmount, special_instructions, payment_method]);

        const order = orderResult.rows[0];

        // Insert order items
        for (const item of items) {
            const unitPrice = priceMap[item.menu_item_id];
            const totalPrice = unitPrice * item.quantity;
            
            await client.query(`
                INSERT INTO order_items 
                (order_id, menu_item_id, quantity, unit_price, total_price, special_instructions)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [order.order_id, item.menu_item_id, item.quantity, unitPrice, totalPrice, item.special_instructions]);
        }

        // Insert allergy notes if provided
        if (allergy_notes && allergy_notes.length > 0) {
            for (const note of allergy_notes) {
                await client.query(`
                    INSERT INTO allergy_notes 
                    (order_id, order_item_id, allergy_type, severity, notes)
                    VALUES ($1, $2, $3, $4, $5)
                `, [order.order_id, note.order_item_id || null, note.allergy_type, note.severity || 'moderate', note.notes]);
            }
        }

        // Create initial status history entry
        await client.query(`
            INSERT INTO order_status_history 
            (order_id, previous_status, new_status, changed_by, change_reason)
            VALUES ($1, NULL, 'pending', 'system', 'Order created')
        `, [order.order_id]);

        await client.query('COMMIT');

        // Fetch complete order with items
        const completeOrder = await pool.query(`
            SELECT o.*, 
                   u.first_name || ' ' || u.last_name AS customer_name,
                   ft.name AS food_truck_name
            FROM orders o
            JOIN customers c ON o.customer_id = c.customer_id
            JOIN users u ON c.user_id = u.user_id
            JOIN food_trucks ft ON o.food_truck_id = ft.food_truck_id
            WHERE o.order_id = $1
        `, [order.order_id]);

        res.status(201).json({ success: true, data: completeOrder.rows[0] });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating order:', error);
        
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid customer, food truck, time slot, or menu item reference' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// ============================================
// PATCH /api/orders/:id/status - Update order status
// ============================================
router.patch('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, changed_by, change_reason } = req.body;

        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled', 'refunded'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        // Get current order status
        const currentOrder = await pool.query('SELECT * FROM orders WHERE order_id = $1', [id]);
        if (currentOrder.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const updateFields = ['order_status = $1', 'updated_at = CURRENT_TIMESTAMP'];
        const params = [status];
        let paramIndex = 2;

        // Set additional fields based on status
        if (status === 'ready') {
            updateFields.push(`actual_ready_time = CURRENT_TIMESTAMP`);
        } else if (status === 'picked_up') {
            updateFields.push(`picked_up_at = CURRENT_TIMESTAMP`);
        } else if (status === 'cancelled') {
            updateFields.push(`cancelled_at = CURRENT_TIMESTAMP`);
            if (change_reason) {
                updateFields.push(`cancellation_reason = $${paramIndex}`);
                params.push(change_reason);
                paramIndex++;
            }
        }

        params.push(id);
        const result = await pool.query(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = $${paramIndex} RETURNING *`,
            params
        );

        // Manual status history entry with additional details
        if (changed_by || change_reason) {
            await pool.query(`
                UPDATE order_status_history 
                SET changed_by = $1, change_reason = $2
                WHERE order_id = $3 AND new_status = $4 AND changed_by IS NULL
                ORDER BY created_at DESC LIMIT 1
            `, [changed_by, change_reason, id, status]);
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// PATCH /api/orders/:id/payment - Update payment status
// ============================================
router.patch('/:id/payment', async (req, res) => {
    try {
        const { id } = req.params;
        const { payment_status, payment_method } = req.body;

        const validStatuses = ['pending', 'completed', 'failed', 'refunded'];
        if (payment_status && !validStatuses.includes(payment_status)) {
            return res.status(400).json({ success: false, error: 'Invalid payment status' });
        }

        const updateFields = ['updated_at = CURRENT_TIMESTAMP'];
        const params = [];
        let paramIndex = 1;

        if (payment_status) {
            updateFields.push(`payment_status = $${paramIndex}`);
            params.push(payment_status);
            paramIndex++;
        }
        if (payment_method) {
            updateFields.push(`payment_method = $${paramIndex}`);
            params.push(payment_method);
            paramIndex++;
        }

        params.push(id);
        const result = await pool.query(
            `UPDATE orders SET ${updateFields.join(', ')} WHERE order_id = $${paramIndex} RETURNING *`,
            params
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating payment:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// POST /api/orders/:id/allergy-notes - Add allergy note
// ============================================
router.post('/:id/allergy-notes', async (req, res) => {
    try {
        const { id } = req.params;
        const { order_item_id, allergy_type, severity, notes } = req.body;

        if (!allergy_type) {
            return res.status(400).json({ success: false, error: 'allergy_type is required' });
        }

        // Verify order exists
        const orderCheck = await pool.query('SELECT order_id FROM orders WHERE order_id = $1', [id]);
        if (orderCheck.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }

        const result = await pool.query(`
            INSERT INTO allergy_notes (order_id, order_item_id, allergy_type, severity, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [id, order_item_id || null, allergy_type, severity || 'moderate', notes]);

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error adding allergy note:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// PATCH /api/orders/:orderId/allergy-notes/:noteId/acknowledge - Acknowledge allergy note
// ============================================
router.patch('/:orderId/allergy-notes/:noteId/acknowledge', async (req, res) => {
    try {
        const { orderId, noteId } = req.params;
        const { acknowledged_by } = req.body;

        const result = await pool.query(`
            UPDATE allergy_notes 
            SET acknowledged = true, 
                acknowledged_by = $1, 
                acknowledged_at = CURRENT_TIMESTAMP
            WHERE allergy_note_id = $2 AND order_id = $3
            RETURNING *
        `, [acknowledged_by, noteId, orderId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Allergy note not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error acknowledging allergy note:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// GET /api/orders/:id/status-history - Get order status history
// ============================================
router.get('/:id/status-history', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(`
            SELECT * FROM order_status_history 
            WHERE order_id = $1 
            ORDER BY created_at DESC
        `, [id]);

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching status history:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// DELETE /api/orders/:id - Cancel/Delete order (soft delete via status)
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellation_reason } = req.body;

        const result = await pool.query(`
            UPDATE orders 
            SET order_status = 'cancelled',
                cancelled_at = CURRENT_TIMESTAMP,
                cancellation_reason = $1,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = $2 
              AND order_status NOT IN ('picked_up', 'cancelled', 'refunded')
            RETURNING *
        `, [cancellation_reason || 'Cancelled by user', id]);

        if (result.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Order not found or cannot be cancelled' 
            });
        }

        res.json({ success: true, message: 'Order cancelled', data: result.rows[0] });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
