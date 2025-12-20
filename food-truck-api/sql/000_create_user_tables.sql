-- Food Truck Management System - User & Authentication Schema
-- Tables: users, customers, owners, food_trucks, workers

-- ============================================
-- Table: users
-- Base table for all user types (customers, owners, workers)
-- ============================================
CREATE TABLE users (
    user_id         SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    phone           VARCHAR(20),
    user_type       VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'owner', 'worker')),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: customers
-- Stores customer-specific information
-- ============================================
CREATE TABLE customers (
    customer_id     SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    default_address TEXT,
    loyalty_points  INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_customers_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table: owners
-- Stores food truck owner information
-- ============================================
CREATE TABLE owners (
    owner_id        SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    business_name   VARCHAR(255),
    tax_id          VARCHAR(50),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_owners_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table: food_trucks
-- Stores food truck information (owned by owners)
-- ============================================
CREATE TABLE food_trucks (
    food_truck_id   SERIAL PRIMARY KEY,
    owner_id        INTEGER NOT NULL,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    cuisine_type    VARCHAR(100),
    license_number  VARCHAR(100),
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_food_trucks_owner
        FOREIGN KEY (owner_id)
        REFERENCES owners(owner_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table: workers
-- Stores worker information (employees of food trucks)
-- ============================================
CREATE TABLE workers (
    worker_id       SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL UNIQUE,
    food_truck_id   INTEGER NOT NULL,
    role            VARCHAR(50) DEFAULT 'staff',
    hire_date       DATE DEFAULT CURRENT_DATE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_workers_user
        FOREIGN KEY (user_id)
        REFERENCES users(user_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_workers_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE CASCADE
);

-- ============================================
-- Indexes for optimized queries
-- ============================================

-- Index for user email lookups (login queries)
CREATE INDEX idx_users_email 
    ON users(email);

-- Index for filtering users by type
CREATE INDEX idx_users_user_type 
    ON users(user_type);

-- Index for querying workers by food truck
CREATE INDEX idx_workers_food_truck_id 
    ON workers(food_truck_id);

-- Additional useful indexes

-- Index for customer lookups by user_id
CREATE INDEX idx_customers_user_id 
    ON customers(user_id);

-- Index for owner lookups by user_id
CREATE INDEX idx_owners_user_id 
    ON owners(user_id);

-- Index for worker lookups by user_id
CREATE INDEX idx_workers_user_id 
    ON workers(user_id);

-- Index for food truck lookups by owner
CREATE INDEX idx_food_trucks_owner_id 
    ON food_trucks(owner_id);

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

-- Index for querying operating hours by food truck
CREATE INDEX idx_operating_hours_food_truck_id 
    ON operating_hours(food_truck_id);

-- Index for querying operating hours by day of week
CREATE INDEX idx_operating_hours_day_of_week 
    ON operating_hours(day_of_week);
