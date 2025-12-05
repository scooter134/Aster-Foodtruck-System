# Food Truck Management System API

RESTful API for managing food trucks, menu items, time slots, operating hours, and cart.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example` and configure your PostgreSQL connection.

3. Run the SQL migrations (in order):
```bash
psql -U postgres -d food_truck_db -f sql/000_create_base_tables.sql
psql -U postgres -d food_truck_db -f sql/001_create_tables.sql
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Food Trucks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/food-trucks` | Get all food trucks |
| GET | `/api/food-trucks/active` | Get active food trucks |
| GET | `/api/food-trucks/:id` | Get single food truck |
| POST | `/api/food-trucks` | Create food truck |
| PUT | `/api/food-trucks/:id` | Update food truck |
| DELETE | `/api/food-trucks/:id` | Delete food truck |

**Query Parameters:** `owner_id`, `location`, `active`

### Operating Hours

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/operating-hours` | Get all operating hours |
| GET | `/api/operating-hours/:id` | Get single operating hour |
| POST | `/api/operating-hours` | Create operating hour |
| PUT | `/api/operating-hours/:id` | Update operating hour |
| DELETE | `/api/operating-hours/:id` | Delete operating hour |

**Query Parameters:** `food_truck_id`, `day_of_week`, `active`

**Note:** `day_of_week` values: 0 = Sunday, 1 = Monday, ..., 6 = Saturday

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

### Create Food Truck
```bash
curl -X POST http://localhost:3000/api/food-trucks \
  -H "Content-Type: application/json" \
  -d '{"owner_id": 1, "name": "Taco Express", "description": "Best tacos in town", "location_description": "Downtown"}'
```

### Create Operating Hours
```bash
curl -X POST http://localhost:3000/api/operating-hours \
  -H "Content-Type: application/json" \
  -d '{"food_truck_id": 1, "day_of_week": 1, "open_time": "11:00", "close_time": "21:00"}'
```
