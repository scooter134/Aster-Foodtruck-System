const operatingHoursModel = require('../models/operatingHours');

async function getOperatingHours(req, res) {
    try {
        const { food_truck_id, day_of_week, is_active } = req.query;

        const filters = {};

        if (food_truck_id !== undefined) {
            filters.food_truck_id = Number(food_truck_id);
        }

        if (day_of_week !== undefined) {
            filters.day_of_week = Number(day_of_week);
        }

        if (is_active !== undefined) {
            filters.is_active = is_active === 'true';
        }

        const hours = await operatingHoursModel.getOperatingHours(filters);
        res.json({ success: true, data: hours });
    } catch (error) {
        console.error('Error fetching operating hours:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function getOperatingHourById(req, res) {
    try {
        const { id } = req.params;
        const hour = await operatingHoursModel.getOperatingHourById(id);

        if (!hour) {
            return res.status(404).json({ success: false, error: 'Operating hour not found' });
        }

        res.json({ success: true, data: hour });
    } catch (error) {
        console.error('Error fetching operating hour:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function createOperatingHour(req, res) {
    try {
        const { food_truck_id, day_of_week, open_time, close_time, is_active } = req.body;

        if (food_truck_id === undefined || day_of_week === undefined || !open_time || !close_time) {
            return res.status(400).json({
                success: false,
                error: 'food_truck_id, day_of_week, open_time, and close_time are required',
            });
        }

        const hour = await operatingHoursModel.createOperatingHour({
            food_truck_id,
            day_of_week,
            open_time,
            close_time,
            is_active,
        });

        res.status(201).json({ success: true, data: hour });
    } catch (error) {
        console.error('Error creating operating hour:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function updateOperatingHour(req, res) {
    try {
        const { id } = req.params;
        const { day_of_week, open_time, close_time, is_active } = req.body;

        const hour = await operatingHoursModel.updateOperatingHour(id, {
            day_of_week,
            open_time,
            close_time,
            is_active,
        });

        if (!hour) {
            return res.status(404).json({ success: false, error: 'Operating hour not found' });
        }

        res.json({ success: true, data: hour });
    } catch (error) {
        console.error('Error updating operating hour:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function deleteOperatingHour(req, res) {
    try {
        const { id } = req.params;
        const hour = await operatingHoursModel.deleteOperatingHour(id);

        if (!hour) {
            return res.status(404).json({ success: false, error: 'Operating hour not found' });
        }

        res.json({ success: true, message: 'Operating hour deleted', data: hour });
    } catch (error) {
        console.error('Error deleting operating hour:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

module.exports = {
    getOperatingHours,
    getOperatingHourById,
    createOperatingHour,
    updateOperatingHour,
    deleteOperatingHour,
};
