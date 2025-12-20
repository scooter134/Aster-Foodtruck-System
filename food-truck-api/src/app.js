require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');

// Route imports
const usersRouter = require('./routes/users');
const customersRouter = require('./routes/customers');
const ownersRouter = require('./routes/owners');
const workersRouter = require('./routes/workers');
const foodTrucksRouter = require('./routes/foodTrucks');
const operatingHoursRouter = require('./routes/operatingHours');
const menuItemsRouter = require('./routes/menuItems');
const timeSlotsRouter = require('./routes/timeSlots');
const ordersRouter = require('./routes/orders');
const favoritesRouter = require('./routes/favorites');
const notificationsRouter = require('./routes/notifications');
const cartRouter = require('./routes/cart');
const analyticsRouter = require('./routes/analytics');

const app = express();
const PORT = process.env.PORT || 3000;

// View engine setup
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'hjs');

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// Security & parsing middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Frontend Routes
app.get('/', (req, res) => res.redirect('/dashboard'));
app.get('/dashboard', (req, res) => res.render('dashboard', { title: 'Dashboard' }));
app.get('/orders', (req, res) => res.render('orders', { title: 'Order Management' }));
app.get('/menu', (req, res) => res.render('menu', { title: 'Menu Management' }));
app.get('/menu/add', (req, res) => res.render('menu-add', { title: 'Add Menu Item' }));
app.get('/menu-items', (req, res) => res.render('menu-items', { title: 'Menu Items Management' }));
app.get('/menu-items/add', (req, res) => res.render('menu-items-add', { title: 'Add Menu Item' }));
app.get('/time-slots', (req, res) => res.render('time-slots', { title: 'Time Slots' }));
app.get('/truck/:truckId/menu', (req, res) => res.render('customer-menu', { title: 'Menu', truckId: req.params.truckId }));

// Customer Routes
app.get('/customer/menu/:truckId', (req, res) => res.render('customer-menu', { title: 'Menu', truckId: req.params.truckId }));
app.get('/customer/cart', (req, res) => res.render('cart', { title: 'My Cart', userId: req.query.userId || 1, username: req.query.username || 'Customer' }));
app.get('/customer/orders', (req, res) => res.render('customer-orders', { title: 'My Orders', userId: req.query.userId || 1, username: req.query.username || 'Customer' }));

// API Routes
// Users & Roles (Ahmed Hatem)
app.use('/api/users', usersRouter);
app.use('/api/customers', customersRouter);
app.use('/api/owners', ownersRouter);
app.use('/api/workers', workersRouter);

// Food Trucks (Yuseff)
app.use('/api/food-trucks', foodTrucksRouter);
app.use('/api/operating-hours', operatingHoursRouter);

// Menu & Time Slots (Yassin)
app.use('/api/menu-items', menuItemsRouter);
app.use('/api/time-slots', timeSlotsRouter);

// Orders (Salah)
app.use('/api/orders', ordersRouter);

// Favorites & Notifications (Tawfik)
app.use('/api/favorites', favoritesRouter);
app.use('/api/notifications', notificationsRouter);

// Cart
app.use('/api/cart', cartRouter);

// Analytics (Khaled)
app.use('/api/analytics', analyticsRouter);

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
