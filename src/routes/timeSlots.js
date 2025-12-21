const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET /api/time-slots - Get all time slots (with filters)
router.get('/', async (req, res) => {
    try {
        const { food_truck_id, slot_date, active } = req.query;
        let query = 'SELECT * FROM time_slots WHERE 1=1';
        const params = [];

        if (food_truck_id) {
            params.push(food_truck_id);
            query += ` AND food_truck_id = $${params.length}`;
        }
        if (slot_date) {
            params.push(slot_date);
            query += ` AND slot_date = $${params.length}`;
        }
        if (active !== undefined) {
            params.push(active === 'true');
            query += ` AND is_active = $${params.length}`;
        }

        query += ' ORDER BY slot_date, start_time';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching time slots:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/time-slots/food-truck/:truckId/deactivate-all - Deactivate all time slots for a food truck
router.patch('/food-truck/:truckId/deactivate-all', async (req, res) => {
    try {
        const { truckId } = req.params;
        
        const result = await pool.query(
            'UPDATE time_slots SET is_active = false WHERE food_truck_id = $1 RETURNING time_slot_id',
            [truckId]
        );
        res.json({ 
            success: true, 
            message: `Deactivated ${result.rowCount} time slots`,
            deactivated: result.rowCount
        });
    } catch (error) {
        console.error('Error deactivating time slots:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/time-slots/food-truck/:truckId - Delete time slots without orders for a food truck
router.delete('/food-truck/:truckId', async (req, res) => {
    try {
        const { truckId } = req.params;
        
        // First check which slots have orders
        const slotsWithOrders = await pool.query(
            'SELECT DISTINCT time_slot_id FROM orders WHERE food_truck_id = $1',
            [truckId]
        );
        const usedSlotIds = slotsWithOrders.rows.map(r => r.time_slot_id);
        
        let query = 'DELETE FROM time_slots WHERE food_truck_id = $1';
        const params = [truckId];
        
        if (usedSlotIds.length > 0) {
            query += ' AND time_slot_id NOT IN (' + usedSlotIds.join(',') + ')';
        }
        query += ' RETURNING time_slot_id';
        
        const result = await pool.query(query, params);
        res.json({ 
            success: true, 
            message: `Deleted ${result.rowCount} time slots (kept ${usedSlotIds.length} slots with orders)`,
            deleted: result.rowCount,
            kept: usedSlotIds.length
        });
    } catch (error) {
        console.error('Error deleting time slots:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/time-slots/available - Get available time slots
router.get('/available', async (req, res) => {
    try {
        const { food_truck_id, slot_date } = req.query;

        if (!food_truck_id) {
            return res.status(400).json({ success: false, error: 'food_truck_id is required' });
        }

        let query = `
            SELECT * FROM time_slots 
            WHERE food_truck_id = $1 
              AND is_active = true 
              AND current_orders < max_orders
        `;
        const params = [food_truck_id];

        if (slot_date) {
            params.push(slot_date);
            query += ` AND slot_date = $${params.length}`;
        } else {
            query += ' AND slot_date >= CURRENT_DATE';
        }

        query += ' ORDER BY slot_date, start_time';
        const result = await pool.query(query, params);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching available time slots:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/time-slots/generate - Generate time slots based on operating hours ONLY
router.post('/generate', async (req, res) => {
    try {
        const { food_truck_id, days = 7 } = req.body;

        if (!food_truck_id) {
            return res.status(400).json({ success: false, error: 'food_truck_id is required' });
        }

        // Get operating hours for this food truck - ONLY use what owner has set
        const hoursResult = await pool.query(
            'SELECT * FROM operating_hours WHERE food_truck_id = $1 AND is_active = true ORDER BY day_of_week',
            [food_truck_id]
        );

        const operatingHours = hoursResult.rows;
        
        // If no operating hours set, don't generate anything
        if (operatingHours.length === 0) {
            return res.json({ 
                success: true, 
                message: 'No operating hours set. Please set working hours first.',
                slots_created: 0
            });
        }

        // Create a map of day -> hours
        const hoursByDay = {};
        operatingHours.forEach(h => {
            hoursByDay[h.day_of_week] = h;
        });

        // Generate dates for next N days
        const dates = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            dates.push({
                dateStr: date.toISOString().split('T')[0],
                dayOfWeek: date.getDay()
            });
        }

        let created = 0;
        for (const { dateStr, dayOfWeek } of dates) {
            const hours = hoursByDay[dayOfWeek];
            if (!hours || !hours.is_active) continue;

            // Parse open and close times
            const [openHour, openMin] = hours.open_time.split(':').map(Number);
            const [closeHour, closeMin] = hours.close_time.split(':').map(Number);

            // Generate 30-minute slots within operating hours
            let currentHour = openHour;
            let currentMin = openMin;

            while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
                const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}:00`;
                
                // Calculate end time (30 minutes later, but don't exceed close time)
                let endHour = currentMin >= 30 ? currentHour + 1 : currentHour;
                let endMin = currentMin >= 30 ? 0 : currentMin + 30;
                
                // Don't create slot if end time exceeds close time
                if (endHour > closeHour || (endHour === closeHour && endMin > closeMin)) {
                    break;
                }
                
                const endTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}:00`;

                try {
                    await pool.query(
                        `INSERT INTO time_slots (food_truck_id, slot_date, start_time, end_time, max_orders, is_active)
                         VALUES ($1, $2, $3, $4, 10, true)
                         ON CONFLICT DO NOTHING`,
                        [food_truck_id, dateStr, startTime, endTime]
                    );
                    created++;
                } catch (e) {
                    // Skip duplicates
                }

                // Move to next slot
                currentMin += 30;
                if (currentMin >= 60) {
                    currentMin = 0;
                    currentHour++;
                }
            }
        }

        res.json({ 
            success: true, 
            message: `Generated ${created} time slots for the next ${days} days based on your operating hours`,
            slots_created: created
        });
    } catch (error) {
        console.error('Error generating time slots:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// GET /api/time-slots/:id - Get single time slot
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM time_slots WHERE time_slot_id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Time slot not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error fetching time slot:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// POST /api/time-slots - Create new time slot
router.post('/', async (req, res) => {
    try {
        const { food_truck_id, slot_date, start_time, end_time, max_orders, is_active } = req.body;

        if (!food_truck_id || !slot_date || !start_time || !end_time) {
            return res.status(400).json({ 
                success: false, 
                error: 'food_truck_id, slot_date, start_time, and end_time are required' 
            });
        }

        const result = await pool.query(
            `INSERT INTO time_slots 
             (food_truck_id, slot_date, start_time, end_time, max_orders, is_active)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [food_truck_id, slot_date, start_time, end_time, max_orders ?? 10, is_active ?? true]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error creating time slot:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, error: 'Invalid food_truck_id' });
        }
        if (error.code === '23514') {
            return res.status(400).json({ success: false, error: 'Invalid time range or order count' });
        }
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PUT /api/time-slots/:id - Update time slot
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { slot_date, start_time, end_time, max_orders, is_active } = req.body;

        const result = await pool.query(
            `UPDATE time_slots 
             SET slot_date = COALESCE($1, slot_date),
                 start_time = COALESCE($2, start_time),
                 end_time = COALESCE($3, end_time),
                 max_orders = COALESCE($4, max_orders),
                 is_active = COALESCE($5, is_active),
                 updated_at = CURRENT_TIMESTAMP
             WHERE time_slot_id = $6
             RETURNING *`,
            [slot_date, start_time, end_time, max_orders, is_active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Time slot not found' });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error updating time slot:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// PATCH /api/time-slots/:id/increment-orders - Increment order count
router.patch('/:id/increment-orders', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE time_slots 
             SET current_orders = current_orders + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE time_slot_id = $1 
               AND current_orders < max_orders
             RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Time slot not found or capacity reached' 
            });
        }

        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Error incrementing orders:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

// DELETE /api/time-slots/:id - Delete time slot
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM time_slots WHERE time_slot_id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Time slot not found' });
        }

        res.json({ success: true, message: 'Time slot deleted', data: result.rows[0] });
    } catch (error) {
        console.error('Error deleting time slot:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
