# 🔧 Backend Documentation

## Overview
The backend is built with **Node.js** and **Express.js**, using **PostgreSQL** as the database. It provides a RESTful API for all food truck operations.

---

## 📁 Directory Structure

```
src/
├── app.js              # Main Express application & routes
├── config/
│   └── database.js     # PostgreSQL connection pool
└── routes/
    ├── analytics.js    # Sales analytics endpoints
    ├── auth.js         # Authentication (login/register)
    ├── cart.js         # Shopping cart operations
    ├── customers.js    # Customer profile management
    ├── foodTrucks.js   # Food truck CRUD operations
    ├── menuItems.js    # Menu item management
    ├── operatingHours.js # Working hours management
    ├── orders.js       # Order management & status
    ├── owners.js       # Owner profile & trucks
    ├── timeSlots.js    # Time slot generation & booking
    └── workers.js      # Worker management
```

---

## 🔌 API Endpoints

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/login` | User login with email/password |
| POST | `/register` | Register new user (customer/owner) |

### Food Trucks (`/api/food-trucks`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all food trucks (filter by owner_id, cuisine_type) |
| GET | `/:id` | Get single food truck |
| GET | `/:id/menu` | Get truck's menu items |
| GET | `/:id/time-slots` | Get truck's available time slots |
| POST | `/` | Create new food truck |
| PUT | `/:id` | Update food truck |
| DELETE | `/:id` | Delete food truck |

### Menu Items (`/api/menu-items`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all menu items (filter by food_truck_id) |
| GET | `/:id` | Get single menu item |
| POST | `/` | Create menu item |
| PUT | `/:id` | Update menu item |
| DELETE | `/:id` | Delete menu item |
| PATCH | `/fix-availability` | Set all items to available |

### Orders (`/api/orders`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get orders (filter by food_truck_id, customer_id, status) |
| GET | `/stats/summary` | Get order statistics for dashboard |
| GET | `/:id` | Get single order with items |
| POST | `/` | Create new order |
| PATCH | `/:id/status` | Update order status |
| PATCH | `/:id/payment` | Update payment status |

### Cart (`/api/cart`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:userId` | Get user's cart items |
| POST | `/` | Add item to cart |
| PUT | `/:cartItemId` | Update cart item quantity |
| DELETE | `/:cartItemId` | Remove item from cart |
| DELETE | `/user/:userId` | Clear entire cart |

### Time Slots (`/api/time-slots`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all time slots |
| GET | `/available` | Get available slots for booking |
| POST | `/generate` | Generate slots from operating hours |
| DELETE | `/food-truck/:truckId` | Delete truck's time slots |
| PATCH | `/food-truck/:truckId/deactivate-all` | Deactivate all slots |

### Operating Hours (`/api/operating-hours`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get operating hours (filter by food_truck_id) |
| POST | `/` | Create operating hours for a day |
| PUT | `/:id` | Update operating hours |
| DELETE | `/:id` | Delete operating hours |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/summary/:foodTruckId` | Get summary stats (orders, revenue, customers) |
| GET | `/daily/:foodTruckId` | Get daily breakdown |
| GET | `/top-items/:foodTruckId` | Get top selling items |
| GET | `/peak-hours/:foodTruckId` | Get busiest hours |

### Workers (`/api/workers`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all workers (filter by food_truck_id) |
| POST | `/` | Add new worker |
| PUT | `/:id` | Update worker |
| DELETE | `/:id` | Remove worker |

### Customers (`/api/customers`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/:userId` | Get customer by user ID |
| GET | `/:id` | Get customer by customer ID |
| GET | `/:id/orders` | Get customer's orders |

### Owners (`/api/owners`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/user/:userId` | Get owner by user ID |
| GET | `/:id` | Get owner with food trucks |

---

## 🗄️ Database Connection

The database connection is configured in `config/database.js`:

```javascript
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
});
```

Environment variables are loaded from `.env` file.

---

## 🔐 Authentication

- Passwords are hashed using **bcrypt**
- Sessions are stored in **localStorage** on the client
- User type (`customer`, `owner`, `worker`) determines access to features

---

## 📊 Order Status Flow

```
pending → confirmed → preparing → ready → picked_up
                                       ↘ cancelled
```

Status changes are tracked in `order_status_history` table.

---

## ⚡ Key Features

1. **Auto-generated Order Numbers**: Format `ORD-YYYYMMDD-XXXX`
2. **Time Slot Management**: 30-minute intervals based on operating hours
3. **Real-time Analytics**: Calculated from actual orders (not pre-computed)
4. **Status History Tracking**: All status changes are logged
5. **Soft Delete**: Items retain foreign key references

---

## 🚀 Running the Backend

```bash
# Install dependencies
npm install

# Start development server
npm start

# Server runs on http://localhost:3000
```
