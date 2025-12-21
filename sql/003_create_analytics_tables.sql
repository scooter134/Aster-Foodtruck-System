-- Food Truck Management System - Analytics Schema
-- Tables: analytics, analytics_time_slots

-- ============================================
-- Table: analytics
-- Stores aggregated analytics for each food truck
-- ============================================
CREATE TABLE analytics (
    analytics_id        SERIAL PRIMARY KEY,
    food_truck_id       INTEGER NOT NULL,
    analytics_date      DATE NOT NULL,
    total_orders        INTEGER DEFAULT 0,
    total_revenue       DECIMAL(12, 2) DEFAULT 0.00,
    avg_order_value     DECIMAL(10, 2) DEFAULT 0.00,
    unique_customers    INTEGER DEFAULT 0,
    items_sold          INTEGER DEFAULT 0,
    peak_hour           TIME,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_analytics_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE CASCADE,
    
    -- Ensure one analytics record per food truck per day
    CONSTRAINT uq_analytics_food_truck_date
        UNIQUE (food_truck_id, analytics_date)
);

-- ============================================
-- Table: analytics_time_slots
-- Stores time slot level analytics breakdown
-- ============================================
CREATE TABLE analytics_time_slots (
    analytics_time_slot_id  SERIAL PRIMARY KEY,
    analytics_id            INTEGER NOT NULL,
    time_slot_id            INTEGER,
    day_of_week             INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    slot_start_time         TIME NOT NULL,
    slot_end_time           TIME NOT NULL,
    orders_count            INTEGER DEFAULT 0,
    revenue                 DECIMAL(10, 2) DEFAULT 0.00,
    capacity_utilization    DECIMAL(5, 2) DEFAULT 0.00 CHECK (capacity_utilization BETWEEN 0 AND 100),
    avg_wait_time_minutes   INTEGER DEFAULT 0,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_analytics_time_slots_analytics
        FOREIGN KEY (analytics_id)
        REFERENCES analytics(analytics_id)
        ON DELETE CASCADE,
    
    CONSTRAINT fk_analytics_time_slots_time_slot
        FOREIGN KEY (time_slot_id)
        REFERENCES time_slots(time_slot_id)
        ON DELETE SET NULL
);

-- ============================================
-- Indexes for optimized queries
-- ============================================

-- Index for querying analytics by food truck
CREATE INDEX idx_analytics_food_truck_id 
    ON analytics(food_truck_id);

-- Index for querying analytics by date
CREATE INDEX idx_analytics_date 
    ON analytics(analytics_date);

-- Composite index for efficient food truck + date range lookups
CREATE INDEX idx_analytics_food_truck_date 
    ON analytics(food_truck_id, analytics_date);

-- Index for querying analytics_time_slots by day of week (common query for trends)
CREATE INDEX idx_analytics_time_slots_day_id 
    ON analytics_time_slots(day_of_week);

-- Index for querying analytics_time_slots by analytics_id
CREATE INDEX idx_analytics_time_slots_analytics_id 
    ON analytics_time_slots(analytics_id);

-- Composite index for analytics_id + day lookups
CREATE INDEX idx_analytics_time_slots_analytics_day 
    ON analytics_time_slots(analytics_id, day_of_week);
