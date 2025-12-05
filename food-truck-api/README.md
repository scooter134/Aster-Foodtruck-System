# Food Truck Management System API

RESTful API for managing food trucks, users, menu items and time slots.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file with your configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=food_truck_db
DB_USER=postgres
DB_PASSWORD=password
JWT_SECRET=your-secret-key-change-in-production
PORT=3000
```

3. Run the SQL migrations in order:
```bash
psql -U postgres -d food_truck_db -f sql/000_create_user_tables.sql
psql -U postgres -d food_truck_db -f sql/001_create_tables.sql
```

4. Start the server:
```bash
npm run dev
```

## API Endpoints

### Users & Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get single user |
| POST | `/api/users/register` | Register new user |
| POST | `/api/users/login` | Login user |
| PUT | `/api/users/:id` | Update user |
| PATCH | `/api/users/:id/change-password` | Change password |
| DELETE | `/api/users/:id` | Deactivate user |

### Customers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | Get all customers |
| GET | `/api/customers/:id` | Get single customer |
| GET | `/api/customers/user/:userId` | Get customer by user ID |
| PUT | `/api/customers/:id` | Update customer |
| PATCH | `/api/customers/:id/add-points` | Add loyalty points |
| PATCH | `/api/customers/:id/redeem-points` | Redeem loyalty points |
| DELETE | `/api/customers/:id` | Delete customer |

### Owners

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/owners` | Get all owners |
| GET | `/api/owners/:id` | Get owner with food trucks |
| GET | `/api/owners/user/:userId` | Get owner by user ID |
| PUT | `/api/owners/:id` | Update owner |
| DELETE | `/api/owners/:id` | Delete owner |

### Workers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workers` | Get all workers |
| GET | `/api/workers/:id` | Get single worker |
| GET | `/api/workers/user/:userId` | Get worker by user ID |
| POST | `/api/workers` | Create worker with user account |
| PUT | `/api/workers/:id` | Update worker |
| PATCH | `/api/workers/:id/transfer` | Transfer to different food truck |
| DELETE | `/api/workers/:id` | Delete worker |

**Query Parameters:** `food_truck_id`, `active`

### Food Trucks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/food-trucks` | Get all food trucks |
| GET | `/api/food-trucks/:id` | Get food truck with stats |
| GET | `/api/food-trucks/:id/menu` | Get food truck's menu |
| GET | `/api/food-trucks/:id/workers` | Get food truck's workers |
| GET | `/api/food-trucks/:id/time-slots` | Get food truck's time slots |
| POST | `/api/food-trucks` | Create food truck |
| PUT | `/api/food-trucks/:id` | Update food truck |
| DELETE | `/api/food-trucks/:id` | Delete food truck |

**Query Parameters:** `owner_id`, `cuisine_type`, `active`

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

### Register User
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@example.com", "password": "password123", "first_name": "John", "last_name": "Doe", "user_type": "owner"}'
```

### Login
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "owner@example.com", "password": "password123"}'
```

### Create Food Truck
```bash
curl -X POST http://localhost:3000/api/food-trucks \
  -H "Content-Type: application/json" \
  -d '{"owner_id": 1, "name": "Taco Truck", "cuisine_type": "Mexican", "description": "Best tacos in town!"}'
```

### Create Worker
```bash
curl -X POST http://localhost:3000/api/workers \
  -H "Content-Type: application/json" \
  -d '{"email": "worker@example.com", "password": "password123", "first_name": "Jane", "last_name": "Smith", "food_truck_id": 1, "role": "chef"}'
```

## Database Schema

### Tables
- **users** - Base user accounts (email, password, user_type)
- **customers** - Customer profiles with loyalty points
- **owners** - Food truck owners with business info
- **workers** - Food truck employees
- **food_trucks** - Food truck details
- **menu_items** - Menu items per food truck
- **time_slots** - Order time slots

### Indexes
- `idx_users_email` - Fast login lookups
- `idx_users_user_type` - Filter by user type
- `idx_workers_food_truck_id` - Workers per truck
