# Food Truck Management System API

RESTful API for managing food truck menu items and time slots.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example` and configure your PostgreSQL connection.

3. Run the SQL migrations:
```bash
psql -U postgres -d food_truck_db -f sql/001_create_tables.sql
psql -U postgres -d food_truck_db -f sql/002_analytics_tables.sql
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Menu Items

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu-items` | Get all menu items |
| GET | `/api/menu-items/:id` | Get single menu item |
| POST | `/api/menu-items` | Create menu item |
| PUT | `/api/menu-items/:id` | Update menu item |
| DELETE | `/api/menu-items/:id` | Delete menu item |

**Query Parameters:** `food_truck_id`, `category`, `available`

### Time Slots

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/time-slots` | Get all time slots |
| GET | `/api/time-slots/available` | Get available slots |
| GET | `/api/time-slots/:id` | Get single time slot |
| POST | `/api/time-slots` | Create time slot |
| PUT | `/api/time-slots/:id` | Update time slot |
| PATCH | `/api/time-slots/:id/increment-orders` | Increment order count |
| DELETE | `/api/time-slots/:id` | Delete time slot |

**Query Parameters:** `food_truck_id`, `slot_date`, `active`

### Cart

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cart/:userId` | Get user's cart with totals |
| POST | `/api/cart` | Add item to cart |
| PUT | `/api/cart/:cartItemId` | Update item quantity |
| DELETE | `/api/cart/:cartItemId` | Remove item from cart |
| DELETE | `/api/cart/user/:userId` | Clear entire cart |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics` | Get analytics with filters |
| GET | `/api/analytics/summary/:foodTruckId` | Get summary for food truck |
| GET | `/api/analytics/:id` | Get single analytics record |
| POST | `/api/analytics` | Create/upsert analytics |
| PUT | `/api/analytics/:id` | Update analytics record |
| DELETE | `/api/analytics/:id` | Delete analytics record |

**Query Parameters:** `food_truck_id`, `start_date`, `end_date`, `days`

### Analytics Time Slots

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/:analyticsId/time-slots` | Get time slot analytics |
| GET | `/api/analytics/time-slots/trends/:foodTruckId` | Get time slot trends |
| POST | `/api/analytics/:analyticsId/time-slots` | Create time slot analytics |
| PUT | `/api/analytics/time-slots/:id` | Update time slot analytics |
| DELETE | `/api/analytics/time-slots/:id` | Delete time slot analytics |

**Query Parameters:** `day_of_week`, `days`

## Example Requests

### Create Menu Item
```bash
curl -X POST http://localhost:3000/api/menu-items \
  -H "Content-Type: application/json" \
  -d '{"food_truck_id": 1, "name": "Tacos", "price": 8.99, "category": "Main"}'
```

### Create Time Slot
```bash
curl -X POST http://localhost:3000/api/time-slots \
  -H "Content-Type: application/json" \
  -d '{"food_truck_id": 1, "slot_date": "2024-12-10", "start_time": "12:00", "end_time": "12:30", "max_orders": 15}'
```

### Add Item to Cart
```bash
curl -X POST http://localhost:3000/api/cart \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "menu_item_id": 1, "quantity": 2}'
```

### Get User's Cart
```bash
curl http://localhost:3000/api/cart/1
```

### Create Analytics Record
```bash
curl -X POST http://localhost:3000/api/analytics \
  -H "Content-Type: application/json" \
  -d '{"food_truck_id": 1, "analytics_date": "2024-12-10", "total_orders": 45, "total_revenue": 892.50}'
```

### Get Analytics Summary
```bash
curl "http://localhost:3000/api/analytics/summary/1?days=30"
```

### Get Time Slot Trends
```bash
curl "http://localhost:3000/api/analytics/time-slots/trends/1?days=30"
```
