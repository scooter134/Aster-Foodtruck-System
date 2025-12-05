const foodTrucksModel = require('../models/foodTrucks');

async function getFoodTrucks(req, res) {
    try {
        const { ownerId, location, isActive } = req.query;

        const filters = {};

        if (ownerId !== undefined) {
            filters.ownerId = Number(ownerId);
        }

        if (location !== undefined) {
            filters.location = location;
        }

        if (isActive !== undefined) {
            filters.isActive = isActive === 'true';
        }

        const trucks = await foodTrucksModel.getFoodTrucks(filters);
        res.json({ success: true, data: trucks });
    } catch (error) {
        console.error('Error fetching food trucks:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function getFoodTruckById(req, res) {
    try {
        const { id } = req.params;
        const truck = await foodTrucksModel.getFoodTruckById(id);

        if (!truck) {
            return res.status(404).json({ success: false, error: 'Food truck not found' });
        }

        res.json({ success: true, data: truck });
    } catch (error) {
        console.error('Error fetching food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function getActiveFoodTrucks(req, res) {
    try {
        const { ownerId, location } = req.query;

        const filters = {};

        if (ownerId !== undefined) {
            filters.ownerId = Number(ownerId);
        }

        if (location !== undefined) {
            filters.location = location;
        }

        const trucks = await foodTrucksModel.getActiveFoodTrucks(filters);
        res.json({ success: true, data: trucks });
    } catch (error) {
        console.error('Error fetching active food trucks:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function createFoodTruck(req, res) {
    try {
        const { owner_id, name, description, location_description, is_active } = req.body;

        if (!owner_id || !name) {
            return res.status(400).json({
                success: false,
                error: 'owner_id and name are required',
            });
        }

        const truck = await foodTrucksModel.createFoodTruck({
            owner_id,
            name,
            description,
            location_description,
            is_active,
        });

        res.status(201).json({ success: true, data: truck });
    } catch (error) {
        console.error('Error creating food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function updateFoodTruck(req, res) {
    try {
        const { id } = req.params;
        const { name, description, location_description, is_active } = req.body;

        const truck = await foodTrucksModel.updateFoodTruck(id, {
            name,
            description,
            location_description,
            is_active,
        });

        if (!truck) {
            return res.status(404).json({ success: false, error: 'Food truck not found' });
        }

        res.json({ success: true, data: truck });
    } catch (error) {
        console.error('Error updating food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

async function deleteFoodTruck(req, res) {
    try {
        const { id } = req.params;
        const truck = await foodTrucksModel.deleteFoodTruck(id);

        if (!truck) {
            return res.status(404).json({ success: false, error: 'Food truck not found' });
        }

        res.json({ success: true, message: 'Food truck deleted', data: truck });
    } catch (error) {
        console.error('Error deleting food truck:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
}

module.exports = {
    getFoodTrucks,
    getFoodTruckById,
    getActiveFoodTrucks,
    createFoodTruck,
    updateFoodTruck,
    deleteFoodTruck,
};

const express =('express');
