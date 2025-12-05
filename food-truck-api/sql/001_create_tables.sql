-- Food Truck Management System - Database Schema
-- Tables: menu_items, time_slots
-- Depends on: 000_create_user_tables.sql (users, customers, owners, food_trucks, workers)

-- ============================================
-- Table: menu_items
-- Stores menu items for each food truck
-- ============================================
CREATE TABLE menu_items (
    menu_item_id    SERIAL PRIMARY KEY,
    food_truck_id   INTEGER NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    price           DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
    category        VARCHAR(100),
    is_available    BOOLEAN DEFAULT TRUE,
    image_url       VARCHAR(500),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_menu_items_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table: time_slots
-- Stores order time slots for each food truck
-- ============================================
CREATE TABLE time_slots (
    time_slot_id    SERIAL PRIMARY KEY,
    food_truck_id   INTEGER NOT NULL,
    slot_date       DATE NOT NULL,
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    max_orders      INTEGER DEFAULT 10,
    current_orders  INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_time_slots_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE CASCADE,
    
    CONSTRAINT chk_time_order
        CHECK (end_time > start_time),
    
    CONSTRAINT chk_orders_capacity
        CHECK (current_orders <= max_orders)
);

-- ============================================
-- Indexes for optimized queries
-- ============================================

-- Index for querying menu items by food truck
CREATE INDEX idx_menu_items_food_truck_id 
    ON menu_items(food_truck_id);

-- Index for querying time slots by food truck
CREATE INDEX idx_time_slots_food_truck_id 
    ON time_slots(food_truck_id);

-- Index for querying time slots by date (common query pattern)
CREATE INDEX idx_time_slots_slot_date 
    ON time_slots(slot_date);

-- Composite index for efficient date + food truck lookups
CREATE INDEX idx_time_slots_food_truck_date 
    ON time_slots(food_truck_id, slot_date);

-- ============================================
-- Table: favorites
-- Stores customer favorites for food trucks and menu items
-- ============================================
CREATE TABLE favorites (
    favorite_id     SERIAL PRIMARY KEY,
    customer_id     INTEGER NOT NULL,
    favorite_type   VARCHAR(50) NOT NULL,
    food_truck_id   INTEGER,
    menu_item_id    INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_favorites_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorites_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_favorites_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(menu_item_id)
        ON DELETE CASCADE,

    CONSTRAINT chk_favorite_type_valid
        CHECK (favorite_type IN ('FOOD_TRUCK', 'MENU_ITEM')),

    CONSTRAINT chk_favorites_target
        CHECK (
            (favorite_type = 'FOOD_TRUCK' AND food_truck_id IS NOT NULL AND menu_item_id IS NULL)
            OR
            (favorite_type = 'MENU_ITEM' AND menu_item_id IS NOT NULL AND food_truck_id IS NULL)
        )
);

-- Index for querying favorites by customer
CREATE INDEX idx_favorites_customer_id 
    ON favorites(customer_id);

-- ============================================
-- Table: notifications
-- Stores notifications sent to users/customers
-- ============================================
CREATE TABLE notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    type            VARCHAR(50) NOT NULL,
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    sent_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at         TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    order_id        INTEGER,
    food_truck_id   INTEGER,
    menu_item_id    INTEGER,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_notifications_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE SET NULL,

    CONSTRAINT fk_notifications_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(menu_item_id)
        ON DELETE SET NULL
);

-- Index for querying notifications by user
CREATE INDEX idx_notifications_user_id 
    ON notifications(user_id);
-- Table: cart_items
-- Stores menu items in each user's cart
-- ============================================
CREATE TABLE cart_items (
    cart_item_id    SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL,
    menu_item_id    INTEGER NOT NULL,
    quantity        INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_cart_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_cart_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(menu_item_id)
        ON DELETE CASCADE,
    
    -- Ensure each user can only have one entry per menu item
    CONSTRAINT uq_user_menu_item
        UNIQUE (user_id, menu_item_id)
);

-- Index for querying cart by user
CREATE INDEX idx_cart_items_user_id 
    ON cart_items(user_id);
