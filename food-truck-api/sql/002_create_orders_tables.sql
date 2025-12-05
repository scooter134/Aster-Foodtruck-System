-- Food Truck Management System - Orders Schema
-- Tables: orders, order_items, allergy_notes, order_status_history
-- Run this AFTER 001_create_tables.sql

-- ============================================
-- ENUM: Order Status
-- Defines possible order statuses
-- ============================================
CREATE TYPE order_status AS ENUM (
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'picked_up',
    'cancelled',
    'refunded'
);

-- ============================================
-- ENUM: Payment Status
-- Defines possible payment statuses
-- ============================================
CREATE TYPE payment_status AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded'
);

-- ============================================
-- ENUM: Payment Method
-- Defines possible payment methods
-- ============================================
CREATE TYPE payment_method AS ENUM (
    'cash',
    'credit_card',
    'debit_card',
    'mobile_payment',
    'online'
);

-- ============================================
-- Table: orders
-- Stores customer orders
-- ============================================
CREATE TABLE orders (
    order_id            SERIAL PRIMARY KEY,
    customer_id         INTEGER NOT NULL,
    food_truck_id       INTEGER NOT NULL,
    time_slot_id        INTEGER NOT NULL,
    order_number        VARCHAR(20) UNIQUE NOT NULL,
    order_status        order_status DEFAULT 'pending',
    payment_status      payment_status DEFAULT 'pending',
    payment_method      payment_method,
    subtotal            DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount          DECIMAL(10, 2) DEFAULT 0.00 CHECK (tax_amount >= 0),
    discount_amount     DECIMAL(10, 2) DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount        DECIMAL(10, 2) NOT NULL CHECK (total_amount >= 0),
    special_instructions TEXT,
    estimated_ready_time TIMESTAMP,
    actual_ready_time   TIMESTAMP,
    picked_up_at        TIMESTAMP,
    cancelled_at        TIMESTAMP,
    cancellation_reason TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers(customer_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_food_truck
        FOREIGN KEY (food_truck_id)
        REFERENCES food_trucks(food_truck_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_orders_time_slot
        FOREIGN KEY (time_slot_id)
        REFERENCES time_slots(time_slot_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_total_calculation
        CHECK (total_amount = subtotal + tax_amount - discount_amount)
);

-- ============================================
-- Table: order_items
-- Stores individual items within an order
-- ============================================
CREATE TABLE order_items (
    order_item_id       SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL,
    menu_item_id        INTEGER NOT NULL,
    quantity            INTEGER NOT NULL CHECK (quantity > 0),
    unit_price          DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_price         DECIMAL(10, 2) NOT NULL CHECK (total_price >= 0),
    special_instructions TEXT,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_order_items_menu_item
        FOREIGN KEY (menu_item_id)
        REFERENCES menu_items(menu_item_id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_item_total
        CHECK (total_price = unit_price * quantity)
);

-- ============================================
-- Table: allergy_notes
-- Stores allergy information for orders
-- ============================================
CREATE TABLE allergy_notes (
    allergy_note_id     SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL,
    order_item_id       INTEGER,
    allergy_type        VARCHAR(100) NOT NULL,
    severity            VARCHAR(20) DEFAULT 'moderate' CHECK (severity IN ('mild', 'moderate', 'severe', 'life_threatening')),
    notes               TEXT,
    acknowledged        BOOLEAN DEFAULT FALSE,
    acknowledged_by     VARCHAR(100),
    acknowledged_at     TIMESTAMP,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_allergy_notes_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_allergy_notes_order_item
        FOREIGN KEY (order_item_id)
        REFERENCES order_items(order_item_id)
        ON DELETE CASCADE
);

-- ============================================
-- Table: order_status_history
-- Tracks order status changes for audit trail
-- ============================================
CREATE TABLE order_status_history (
    status_history_id   SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL,
    previous_status     order_status,
    new_status          order_status NOT NULL,
    changed_by          VARCHAR(100),
    change_reason       TEXT,
    metadata            JSONB,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_status_history_order
        FOREIGN KEY (order_id)
        REFERENCES orders(order_id)
        ON DELETE CASCADE
);

-- ============================================
-- Indexes for optimized queries
-- ============================================

-- Orders indexes (as specified)
CREATE INDEX idx_orders_customer_id 
    ON orders(customer_id);

CREATE INDEX idx_orders_food_truck_id 
    ON orders(food_truck_id);

CREATE INDEX idx_orders_slot_id 
    ON orders(time_slot_id);

CREATE INDEX idx_orders_order_status 
    ON orders(order_status);

-- Order items index (as specified)
CREATE INDEX idx_order_items_order_id 
    ON order_items(order_id);

-- Order status history index (as specified)
CREATE INDEX idx_order_status_history_order_id 
    ON order_status_history(order_id);

-- Additional useful indexes for common queries

-- Index for order number lookups
CREATE INDEX idx_orders_order_number 
    ON orders(order_number);

-- Index for payment status filtering
CREATE INDEX idx_orders_payment_status 
    ON orders(payment_status);

-- Index for date-based order queries
CREATE INDEX idx_orders_created_at 
    ON orders(created_at);

-- Composite index for food truck + status queries
CREATE INDEX idx_orders_food_truck_status 
    ON orders(food_truck_id, order_status);

-- Composite index for customer order history
CREATE INDEX idx_orders_customer_created 
    ON orders(customer_id, created_at DESC);

-- Index for menu item lookups in order items
CREATE INDEX idx_order_items_menu_item_id 
    ON order_items(menu_item_id);

-- Index for allergy type searches
CREATE INDEX idx_allergy_notes_allergy_type 
    ON allergy_notes(allergy_type);

-- Index for unacknowledged allergies
CREATE INDEX idx_allergy_notes_acknowledged 
    ON allergy_notes(acknowledged) WHERE acknowledged = FALSE;

-- Index for status history timeline
CREATE INDEX idx_order_status_history_created_at 
    ON order_status_history(order_id, created_at);

-- ============================================
-- Function: Generate Order Number
-- Creates unique order numbers (e.g., FT-20231205-001)
-- ============================================
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
DECLARE
    today_date TEXT;
    daily_count INTEGER;
    new_order_number TEXT;
BEGIN
    today_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    SELECT COUNT(*) + 1 INTO daily_count
    FROM orders
    WHERE DATE(created_at) = CURRENT_DATE;
    
    new_order_number := 'FT-' || today_date || '-' || LPAD(daily_count::TEXT, 4, '0');
    
    NEW.order_number := new_order_number;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-generate order number
-- ============================================
CREATE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL OR NEW.order_number = '')
    EXECUTE FUNCTION generate_order_number();

-- ============================================
-- Function: Update order timestamp
-- Automatically updates updated_at on changes
-- ============================================
CREATE OR REPLACE FUNCTION update_order_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-update timestamp on orders
-- ============================================
CREATE TRIGGER trigger_update_order_timestamp
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_order_timestamp();

-- ============================================
-- Function: Log order status changes
-- Automatically creates history entry on status change
-- ============================================
CREATE OR REPLACE FUNCTION log_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
        INSERT INTO order_status_history (order_id, previous_status, new_status)
        VALUES (NEW.order_id, OLD.order_status, NEW.order_status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-log status changes
-- ============================================
CREATE TRIGGER trigger_log_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION log_order_status_change();

-- ============================================
-- Function: Update time slot order count
-- Increments/decrements slot count on order creation/cancellation
-- ============================================
CREATE OR REPLACE FUNCTION update_time_slot_order_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE time_slots 
        SET current_orders = current_orders + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE time_slot_id = NEW.time_slot_id;
    ELSIF TG_OP = 'UPDATE' AND OLD.order_status != 'cancelled' AND NEW.order_status = 'cancelled' THEN
        UPDATE time_slots 
        SET current_orders = GREATEST(current_orders - 1, 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE time_slot_id = NEW.time_slot_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Trigger: Auto-update time slot counts
-- ============================================
CREATE TRIGGER trigger_update_time_slot_count
    AFTER INSERT OR UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_time_slot_order_count();
