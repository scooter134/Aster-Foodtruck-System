const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// ============================================
// Analytics Routes
// ============================================

// GET /api/analytics - Get analytics with filters
router.get('/', async (req, res) => {
    try {
        const { food_truck_id, start_date, end_date } = req.query;
        let query = 'SELECT * FROM analytics WHERE 1=1';
        const params = [];

        if (food_truck_id) {
            params.push(food_truck_id);
            query += ` AND food_truck_id = $${params.length}`;
        }
        if (start_date) {
            params.push(start_date);
            query += ` AND analytics_date >= $${params.length}`;
        }
        if (end_date) {
            params.push(end_date);
            query += ` AND analytics_date <= $${params.length}`;
        }

        query += ' ORDER BY analytics_date DESC';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/analytics/summary/:foodTruckId - Get summary analytics calculated from orders
router.get('/summary/:foodTruckId', async (req, res) => {
    try {
        const { foodTruckId } = req.params;
        const { days = 30 } = req.query;

        // Calculate analytics from actual orders
        const result = await pool.query(
            `SELECT 
                COUNT(*) AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(AVG(total_amount), 0)::DECIMAL(10,2) AS avg_order_value,
                COUNT(DISTINCT customer_id) AS total_unique_customers
             FROM orders 
             WHERE food_truck_id = $1 
               AND order_status NOT IN ('cancelled', 'refunded')
               AND created_at >= CURRENT_DATE - $2::INTEGER`,
            [foodTruckId, days]
        );

        // Get items sold count
        const itemsResult = await pool.query(
            `SELECT COALESCE(SUM(oi.quantity), 0) AS total_items_sold
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             WHERE o.food_truck_id = $1 
               AND o.order_status NOT IN ('cancelled', 'refunded')
               AND o.created_at >= CURRENT_DATE - $2::INTEGER`,
            [foodTruckId, days]
        );

        const data = {
            ...result.rows[0],
            total_items_sold: itemsResult.rows[0]?.total_items_sold || 0
        };

        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching analytics summary:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/analytics/daily/:foodTruckId - Get daily analytics from orders
router.get('/daily/:foodTruckId', async (req, res) => {
    try {
        const { foodTruckId } = req.params;
        const { days = 30 } = req.query;

        const result = await pool.query(
            `SELECT 
                DATE(created_at) AS analytics_date,
                COUNT(*) AS total_orders,
                COALESCE(SUM(total_amount), 0) AS total_revenue,
                COALESCE(AVG(total_amount), 0)::DECIMAL(10,2) AS avg_order_value,
                COUNT(DISTINCT customer_id) AS unique_customers
             FROM orders 
             WHERE food_truck_id = $1 
               AND order_status NOT IN ('cancelled', 'refunded')
               AND created_at >= CURRENT_DATE - $2::INTEGER
             GROUP BY DATE(created_at)
             ORDER BY analytics_date DESC`,
            [foodTruckId, days]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching daily analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/analytics/top-items/:foodTruckId - Get top selling items
router.get('/top-items/:foodTruckId', async (req, res) => {
    try {
        const { foodTruckId } = req.params;
        const { days = 30, limit = 5 } = req.query;

        const result = await pool.query(
            `SELECT 
                mi.name,
                mi.category,
                SUM(oi.quantity) AS quantity_sold,
                SUM(oi.total_price) AS total_revenue
             FROM order_items oi
             JOIN orders o ON oi.order_id = o.order_id
             JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
             WHERE o.food_truck_id = $1 
               AND o.order_status NOT IN ('cancelled', 'refunded')
               AND o.created_at >= CURRENT_DATE - $2::INTEGER
             GROUP BY mi.menu_item_id, mi.name, mi.category
             ORDER BY quantity_sold DESC
             LIMIT $3`,
            [foodTruckId, days, limit]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching top items:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/analytics/peak-hours/:foodTruckId - Get peak ordering hours
router.get('/peak-hours/:foodTruckId', async (req, res) => {
    try {
        const { foodTruckId } = req.params;
        const { days = 30 } = req.query;

        const result = await pool.query(
            `SELECT 
                EXTRACT(HOUR FROM created_at) AS hour,
                COUNT(*) AS order_count,
                SUM(total_amount) AS revenue
             FROM orders 
             WHERE food_truck_id = $1 
               AND order_status NOT IN ('cancelled', 'refunded')
               AND created_at >= CURRENT_DATE - $2::INTEGER
             GROUP BY EXTRACT(HOUR FROM created_at)
             ORDER BY order_count DESC`,
            [foodTruckId, days]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching peak hours:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/analytics/:id - Get single analytics record
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM analytics WHERE analytics_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Analytics record not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/analytics - Create or update analytics record
router.post('/', async (req, res) => {
    try {
        const { 
            food_truck_id, 
            analytics_date, 
            total_orders, 
            total_revenue, 
            avg_order_value, 
            unique_customers, 
            items_sold, 
            peak_hour 
        } = req.body;

        if (!food_truck_id || !analytics_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'food_truck_id and analytics_date are required' 
            });
        }

        // Upsert: insert or update if already exists for that food truck + date
        const result = await pool.query(
            `INSERT INTO analytics 
             (food_truck_id, analytics_date, total_orders, total_revenue, avg_order_value, unique_customers, items_sold, peak_hour)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (food_truck_id, analytics_date) 
             DO UPDATE SET 
                total_orders = EXCLUDED.total_orders,
                total_revenue = EXCLUDED.total_revenue,
                avg_order_value = EXCLUDED.avg_order_value,
                unique_customers = EXCLUDED.unique_customers,
                items_sold = EXCLUDED.items_sold,
                peak_hour = EXCLUDED.peak_hour,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [food_truck_id, analytics_date, total_orders ?? 0, total_revenue ?? 0, avg_order_value ?? 0, unique_customers ?? 0, items_sold ?? 0, peak_hour]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating analytics:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid food_truck_id' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/analytics/:id - Update analytics record
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { total_orders, total_revenue, avg_order_value, unique_customers, items_sold, peak_hour } = req.body;

        const result = await pool.query(
            `UPDATE analytics 
             SET total_orders = COALESCE($1, total_orders),
                 total_revenue = COALESCE($2, total_revenue),
                 avg_order_value = COALESCE($3, avg_order_value),
                 unique_customers = COALESCE($4, unique_customers),
                 items_sold = COALESCE($5, items_sold),
                 peak_hour = COALESCE($6, peak_hour),
                 updated_at = CURRENT_TIMESTAMP
             WHERE analytics_id = $7
             RETURNING *`,
            [total_orders, total_revenue, avg_order_value, unique_customers, items_sold, peak_hour, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Analytics record not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/analytics/:id - Delete analytics record
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM analytics WHERE analytics_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Analytics record not found' });
        }

        res.json({ success: true, message: 'Analytics record deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// ============================================
// Analytics Time Slots Routes
// ============================================

// GET /api/analytics/:analyticsId/time-slots - Get time slot analytics for a day
router.get('/:analyticsId/time-slots', async (req, res) => {
    try {
        const { analyticsId } = req.params;
        const { day_of_week } = req.query;
        
        let query = 'SELECT * FROM analytics_time_slots WHERE analytics_id = $1';
        const params = [analyticsId];

        if (day_of_week !== undefined) {
            params.push(day_of_week);
            query += ` AND day_of_week = $${params.length}`;
        }

        query += ' ORDER BY slot_start_time';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching time slot analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/analytics/time-slots/trends/:foodTruckId - Get time slot trends
router.get('/time-slots/trends/:foodTruckId', async (req, res) => {
    try {
        const { foodTruckId } = req.params;
        const { days = 30 } = req.query;

        const result = await pool.query(
            `SELECT 
                ats.day_of_week,
                ats.slot_start_time,
                ats.slot_end_time,
                AVG(ats.orders_count)::DECIMAL(10,2) AS avg_orders,
                AVG(ats.revenue)::DECIMAL(10,2) AS avg_revenue,
                AVG(ats.capacity_utilization)::DECIMAL(5,2) AS avg_utilization,
                AVG(ats.avg_wait_time_minutes)::INTEGER AS avg_wait_time
             FROM analytics_time_slots ats
             JOIN analytics a ON ats.analytics_id = a.analytics_id
             WHERE a.food_truck_id = $1 
               AND a.analytics_date >= CURRENT_DATE - $2::INTEGER
             GROUP BY ats.day_of_week, ats.slot_start_time, ats.slot_end_time
             ORDER BY ats.day_of_week, ats.slot_start_time`,
            [foodTruckId, days]
        );

        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching time slot trends:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/analytics/:analyticsId/time-slots - Create time slot analytics
router.post('/:analyticsId/time-slots', async (req, res) => {
    try {
        const { analyticsId } = req.params;
        const { 
            time_slot_id,
            day_of_week, 
            slot_start_time, 
            slot_end_time, 
            orders_count, 
            revenue, 
            capacity_utilization, 
            avg_wait_time_minutes 
        } = req.body;

        if (day_of_week === undefined || !slot_start_time || !slot_end_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'day_of_week, slot_start_time, and slot_end_time are required' 
            });
        }

        const result = await pool.query(
            `INSERT INTO analytics_time_slots 
             (analytics_id, time_slot_id, day_of_week, slot_start_time, slot_end_time, orders_count, revenue, capacity_utilization, avg_wait_time_minutes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [analyticsId, time_slot_id, day_of_week, slot_start_time, slot_end_time, orders_count ?? 0, revenue ?? 0, capacity_utilization ?? 0, avg_wait_time_minutes ?? 0]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating time slot analytics:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid analytics_id or time_slot_id' });
        }
        if (error.code === '23514') {
            return res.status(400).json({ success: false, error: 'Invalid day_of_week (0-6) or capacity_utilization (0-100)' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/analytics/time-slots/:timeSlotAnalyticsId - Update time slot analytics
router.put('/time-slots/:timeSlotAnalyticsId', async (req, res) => {
    try {
        const { timeSlotAnalyticsId } = req.params;
        const { orders_count, revenue, capacity_utilization, avg_wait_time_minutes } = req.body;

        const result = await pool.query(
            `UPDATE analytics_time_slots 
             SET orders_count = COALESCE($1, orders_count),
                 revenue = COALESCE($2, revenue),
                 capacity_utilization = COALESCE($3, capacity_utilization),
                 avg_wait_time_minutes = COALESCE($4, avg_wait_time_minutes),
                 updated_at = CURRENT_TIMESTAMP
             WHERE analytics_time_slot_id = $5
             RETURNING *`,
            [orders_count, revenue, capacity_utilization, avg_wait_time_minutes, timeSlotAnalyticsId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Time slot analytics record not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating time slot analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/analytics/time-slots/:timeSlotAnalyticsId - Delete time slot analytics
router.delete('/time-slots/:timeSlotAnalyticsId', async (req, res) => {
    try {
        const { timeSlotAnalyticsId } = req.params;
        const result = await pool.query(
            'DELETE FROM analytics_time_slots WHERE analytics_time_slot_id = $1 RETURNING *',
            [timeSlotAnalyticsId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Time slot analytics record not found' });
        }

        res.json({ success: true, message: 'Time slot analytics deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting time slot analytics:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
