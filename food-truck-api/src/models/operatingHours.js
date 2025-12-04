const pool = require('../config/database');

async function getOperatingHours({ food_truck_id, day_of_week, is_active } = {}) {
    let query = 'SELECT * FROM operating_hours WHERE 1=1';
    const params = [];

    if (food_truck_id !== undefined) {
        params.push(food_truck_id);
        query += ` AND food_truck_id = $${params.length}`;
    }

    if (day_of_week !== undefined) {
        params.push(day_of_week);
        query += ` AND day_of_week = $${params.length}`;
    }

    if (is_active !== undefined) {
        params.push(is_active);
        query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY food_truck_id, day_of_week, open_time';

    const result = await pool.query(query, params);
    return result.rows;
}

async function getOperatingHourById(id) {
    const result = await pool.query(
        'SELECT * FROM operating_hours WHERE operating_hour_id = $1',
        [id]
    );

    return result.rows[0] || null;
}

async function createOperatingHour({ food_truck_id, day_of_week, open_time, close_time, is_active }) {
    const result = await pool.query(
        `INSERT INTO operating_hours 
         (food_truck_id, day_of_week, open_time, close_time, is_active)
         VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
         RETURNING *`,
        [food_truck_id, day_of_week, open_time, close_time, is_active]
    );

    return result.rows[0];
}

async function updateOperatingHour(id, { day_of_week, open_time, close_time, is_active }) {
    const result = await pool.query(
        `UPDATE operating_hours 
         SET day_of_week = COALESCE($1, day_of_week),
             open_time = COALESCE($2, open_time),
             close_time = COALESCE($3, close_time),
             is_active = COALESCE($4, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE operating_hour_id = $5
         RETURNING *`,
        [day_of_week, open_time, close_time, is_active, id]
    );

    return result.rows[0] || null;
}

async function deleteOperatingHour(id) {
    const result = await pool.query(
        'DELETE FROM operating_hours WHERE operating_hour_id = $1 RETURNING *',
        [id]
    );

    return result.rows[0] || null;
}

module.exports = {
    getOperatingHours,
    getOperatingHourById,
    createOperatingHour,
    updateOperatingHour,
    deleteOperatingHour,
};
