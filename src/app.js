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

// ============================================
// Public Routes (No Auth Required)
// ============================================
app.get('/', (req, res) => res.render('login', { title: 'Login' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register' }));

// ============================================
// Customer Routes (Auth Required)
// ============================================
app.get('/dashboard', (req, res) => res.render('customerHomepage', { title: 'Dashboard' }));
app.get('/trucks', (req, res) => res.render('trucks', { title: 'Browse Trucks' }));
app.get('/truckMenu/:truckId', (req, res) => res.render('truckMenu', { title: 'Menu', truckId: req.params.truckId }));
app.get('/cart', (req, res) => res.render('cart', { title: 'My Cart' }));
app.get('/myOrders', (req, res) => res.render('myOrders', { title: 'My Orders' }));

// New Customer Routes (match frontend expectations)
app.get('/customer/dashboard', (req, res) => res.render('customer-dashboard', { title: 'Customer Dashboard' }));
app.get('/customer/browse-trucks', (req, res) => res.render('browse-trucks', { title: 'Browse Trucks' }));
app.get('/customer/menu/:truckId', (req, res) => res.render('customer-menu', { title: 'Menu', truckId: req.params.truckId }));
app.get('/customer/cart', (req, res) => res.render('cart', { title: 'My Cart' }));
app.get('/customer/orders', (req, res) => res.render('customer-orders', { title: 'My Orders' }));
app.get('/login', (req, res) => res.render('login', { title: 'Login' }));

// ============================================
// Truck Owner Routes (Auth Required)
// ============================================
app.get('/ownerDashboard', (req, res) => res.render('ownerDashboard', { title: 'Owner Dashboard' }));
app.get('/menuItems', (req, res) => res.render('menuItems', { title: 'Menu Items' }));
app.get('/addMenuItem', (req, res) => res.render('addMenuItem', { title: 'Add Menu Item' }));
app.get('/truckOrders', (req, res) => res.render('truckOrders', { title: 'Truck Orders' }));

// Additional Owner Routes
app.get('/owner/dashboard', (req, res) => res.render('dashboard', { title: 'Owner Dashboard' }));
app.get('/menu-items', (req, res) => res.render('menuItems', { title: 'Menu Items' }));
app.get('/menu-items/add', (req, res) => res.render('addMenuItem', { title: 'Add Menu Item' }));
app.get('/orders', (req, res) => res.render('orders', { title: 'Orders' }));
app.get('/analytics', (req, res) => res.render('analytics', { title: 'Sales Analytics' }));
app.get('/working-hours', (req, res) => res.render('working-hours', { title: 'Working Hours' }));
app.get('/workers', (req, res) => res.render('workers', { title: 'Manage Workers' }));
app.get('/worker-dashboard', (req, res) => res.render('worker-dashboard', { title: 'Worker Dashboard' }));
app.get('/create-truck', (req, res) => res.render('create-truck', { title: 'Create Food Truck' }));
app.get('/forgot-password', (req, res) => res.render('forgot-password', { title: 'Forgot Password' }));
app.get('/reset-password', (req, res) => res.render('reset-password', { title: 'Reset Password' }));

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
