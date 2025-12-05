-- Food Truck Management System - Base Database Schema
-- Tables: food_trucks, operating_hours
-- These tables must be created BEFORE menu_items, time_slots, cart_items

-- ============================================
-- Table: food_trucks
-- Stores food truck information
-- ============================================
CREATE TABLE food_trucks (
    food_truck_id       SERIAL PRIMARY KEY,
    owner_id            INTEGER NOT NULL,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    location_description VARCHAR(500),
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_food_trucks_owner
        FOREIGN KEY (owner_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table: operating_hours
-- Stores weekly operating hours for each food truck
-- day_of_week: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
-- ============================================
CREATE TABLE operating_hours (
    operating_hour_id   SERIAL PRIMARY KEY,
    food_truck_id       INTEGER NOT NULL,
    day_of_week         INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    open_time           TIME NOT NULL,
    close_time          TIME NOT NULL,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_operating_hours_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE CASCADE,
    
    CONSTRAINT chk_operating_time_order
        CHECK (close_time > open_time)
);

-- ============================================
-- Indexes for optimized queries
-- ============================================

-- Index for querying food trucks by owner (required)
CREATE INDEX idx_food_trucks_owner_id 
    ON food_trucks(owner_id);

-- Index for querying active food trucks
CREATE INDEX idx_food_trucks_is_active 
    ON food_trucks(is_active);

-- Index for querying operating hours by food truck
CREATE INDEX idx_operating_hours_food_truck_id 
    ON operating_hours(food_truck_id);

-- Index for querying operating hours by day of week
CREATE INDEX idx_operating_hours_day_of_week 
    ON operating_hours(day_of_week);

-- Composite index for efficient food truck + day lookups
CREATE INDEX idx_operating_hours_food_truck_day 
    ON operating_hours(food_truck_id, day_of_week);
