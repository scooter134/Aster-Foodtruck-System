const pool = require('../config/database');

async function getFoodTrucks({ ownerId, location, isActive } = {}) {
    let query = 'SELECT * FROM food_trucks WHERE 1=1';
    const params = [];

    if (ownerId !== undefined) {
        params.push(ownerId);
        query += ` AND owner_id = $${params.length}`;
    }

    if (location !== undefined) {
        params.push(location);
        query += ` AND location_description = $${params.length}`;
    }

    if (isActive !== undefined) {
        params.push(isActive);
        query += ` AND is_active = $${params.length}`;
    }

    query += ' ORDER BY name';

    const result = await pool.query(query, params);
    return result.rows;
}

async function getActiveFoodTrucks(filters = {}) {
    const extendedFilters = { ...filters, isActive: true };
    return getFoodTrucks(extendedFilters);
}

async function getFoodTruckById(id) {
    const result = await pool.query(
        'SELECT * FROM food_trucks WHERE food_truck_id = $1',
        [id]
    );

    return result.rows[0] || null;
}

async function createFoodTruck({ owner_id, name, description, location_description, is_active }) {
    const result = await pool.query(
        `INSERT INTO food_trucks 
         (owner_id, name, description, location_description, is_active)
         VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
         RETURNING *`,
        [owner_id, name, description, location_description, is_active]
    );

    return result.rows[0];
}

async function updateFoodTruck(id, { name, description, location_description, is_active }) {
    const result = await pool.query(
        `UPDATE food_trucks 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             location_description = COALESCE($3, location_description),
             is_active = COALESCE($4, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE food_truck_id = $5
         RETURNING *`,
        [name, description, location_description, is_active, id]
    );

    return result.rows[0] || null;
}

async function deleteFoodTruck(id) {
    const result = await pool.query(
        'DELETE FROM food_trucks WHERE food_truck_id = $1 RETURNING *',
        [id]
    );

    return result.rows[0] || null;
}

module.exports = {
    getFoodTrucks,
    getActiveFoodTrucks,
    getFoodTruckById,
    createFoodTruck,
    updateFoodTruck,
    deleteFoodTruck,
};
