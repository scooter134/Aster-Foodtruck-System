require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const menuItemsRouter = require('./routes/menuItems');
const timeSlotsRouter = require('./routes/timeSlots');
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const ownersRouter = require('./routes/owners');
const workersRouter = require('./routes/workers');
const foodTrucksRouter = require('./routes/foodTrucks');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/owners', ownersRouter);
app.use('/api/workers', workersRouter);
app.use('/api/food-trucks', foodTrucksRouter);
app.use('/api/menu-items', menuItemsRouter);
app.use('/api/time-slots', timeSlotsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`Food Truck API running on port ${PORT}`);
});

module.exports = app;
