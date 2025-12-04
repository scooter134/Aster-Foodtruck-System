const express = require('express');
const router = express.Router();
const foodtruckController = require('../Controllers/foodtruck-controller');
const operatingHoursController = require('../Controllers/operatingHours-controller');

// GET /api/food-trucks - Get food trucks (with optional filters)
router.get('/', foodtruckController.getFoodTrucks);

// POST /api/food-trucks - Create a new food truck
router.post('/', foodtruckController.createFoodTruck);

// PATCH /api/food-trucks/:id - Update a food truck
router.patch('/:id', foodtruckController.updateFoodTruck);

// DELETE /api/food-trucks/:id - Delete a food truck
router.delete('/:id', foodtruckController.deleteFoodTruck);

// GET /api/food-trucks/:id/operating-hours - Get operating hours for a food truck
router.get('/:id/operating-hours', (req, res, next) => {
    req.query.food_truck_id = req.params.id;
    return operatingHoursController.getOperatingHours(req, res, next);
});

// POST /api/food-trucks/:id/operating-hours - Create operating hours for a food truck
router.post('/:id/operating-hours', (req, res, next) => {
    req.body.food_truck_id = req.params.id;
    return operatingHoursController.createOperatingHour(req, res, next);
});

module.exports = router;
