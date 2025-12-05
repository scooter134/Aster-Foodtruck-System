-- Food Truck Management System - Foundation Tables
-- Tables: food_trucks, customers
-- Run this BEFORE 001_create_tables.sql

-- ============================================
-- Table: food_trucks
-- Stores food truck information
-- ============================================
CREATE TABLE food_trucks (
    food_truck_id   SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    description     TEXT,
    cuisine_type    VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    license_number  VARCHAR(100) UNIQUE,
    is_active       BOOLEAN DEFAULT TRUE,
    rating          DECIMAL(2, 1) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
    image_url       VARCHAR(500),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Table: customers
-- Stores customer information
-- ============================================
CREATE TABLE customers (
    customer_id     SERIAL PRIMARY KEY,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    phone           VARCHAR(20),
    password_hash   VARCHAR(255) NOT NULL,
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Indexes for optimized queries
-- ============================================

-- Index for querying active food trucks
CREATE INDEX idx_food_trucks_is_active 
    ON food_trucks(is_active);

-- Index for querying food trucks by cuisine
CREATE INDEX idx_food_trucks_cuisine_type 
    ON food_trucks(cuisine_type);

-- Index for customer email lookups (login)
CREATE INDEX idx_customers_email 
    ON customers(email);

-- Index for active customers
CREATE INDEX idx_customers_is_active 
    ON customers(is_active);
