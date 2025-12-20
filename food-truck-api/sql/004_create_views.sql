-- Food Truck Management System - Database Views
-- Run this AFTER all table creation scripts
-- Depends on: 000_create_user_tables.sql, 001_create_tables.sql, 
--             002_create_orders_tables.sql, 003_create_analytics_tables.sql

-- ============================================
-- View: v_available_time_slots
-- Shows time slots with available capacity
-- ============================================
CREATE VIEW v_available_time_slots AS
SELECT 
    ts.time_slot_id,
    ts.food_truck_id,
    ft.name AS truck_name,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.max_orders,
    ts.current_orders,
    (ts.max_orders - ts.current_orders) AS available_capacity
FROM time_slots ts
JOIN food_trucks ft ON ts.food_truck_id = ft.food_truck_id
WHERE ts.current_orders < ts.max_orders
  AND ts.is_active = TRUE
  AND ft.is_active = TRUE;

-- ============================================
-- View: v_active_menu_items
-- Shows all active menu items with truck info
-- ============================================
CREATE VIEW v_active_menu_items AS
SELECT 
    mi.menu_item_id,
    mi.food_truck_id,
    ft.name AS truck_name,
    mi.name,
    mi.description,
    mi.price,
    mi.category,
    mi.image_url,
    mi.is_available
FROM menu_items mi
JOIN food_trucks ft ON mi.food_truck_id = ft.food_truck_id
WHERE mi.is_available = TRUE
  AND ft.is_active = TRUE;

-- ============================================
-- View: v_daily_analytics
-- Shows daily analytics summary per food truck
-- ============================================
CREATE VIEW v_daily_analytics AS
SELECT 
    a.analytics_id,
    a.food_truck_id,
    ft.name AS truck_name,
    a.analytics_date,
    a.total_revenue,
    a.total_orders,
    a.avg_order_value,
    a.unique_customers,
    a.items_sold,
    a.peak_hour
FROM analytics a
JOIN food_trucks ft ON a.food_truck_id = ft.food_truck_id;

-- ============================================
-- View: v_time_slot_analytics
-- Shows time slot level analytics (heatmap data)
-- ============================================
CREATE VIEW v_time_slot_analytics AS
SELECT 
    ats.analytics_time_slot_id,
    a.food_truck_id,
    ft.name AS truck_name,
    a.analytics_date,
    ats.day_of_week,
    ats.slot_start_time,
    ats.slot_end_time,
    ats.orders_count,
    ats.revenue,
    ats.capacity_utilization,
    ats.avg_wait_time_minutes
FROM analytics_time_slots ats
JOIN analytics a ON ats.analytics_id = a.analytics_id
JOIN food_trucks ft ON a.food_truck_id = ft.food_truck_id;

-- ============================================
-- View: v_item_order_frequency
-- Shows how many times each menu item was ordered (Worker Dashboard)
-- ============================================
CREATE VIEW v_item_order_frequency AS
SELECT 
    mi.menu_item_id,
    mi.food_truck_id,
    ft.name AS truck_name,
    mi.name AS item_name,
    mi.category,
    mi.price,
    mi.is_available,
    COUNT(oi.order_item_id) AS times_ordered,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total_revenue
FROM menu_items mi
JOIN food_trucks ft ON mi.food_truck_id = ft.food_truck_id
LEFT JOIN order_items oi ON mi.menu_item_id = oi.menu_item_id
LEFT JOIN orders o ON oi.order_id = o.order_id 
    AND o.order_status NOT IN ('cancelled')
GROUP BY mi.menu_item_id, mi.food_truck_id, ft.name, mi.name, mi.category, mi.price, mi.is_available
ORDER BY mi.food_truck_id, times_ordered DESC;

-- ============================================
-- View: v_customer_last_order
-- Customer's most recent order (Order Again feature)
-- ============================================
CREATE VIEW v_customer_last_order AS
SELECT DISTINCT ON (o.customer_id)
    o.customer_id,
    o.order_id,
    o.food_truck_id,
    ft.name AS truck_name,
    o.total_amount,
    o.order_status,
    o.created_at AS order_date
FROM orders o
JOIN food_trucks ft ON o.food_truck_id = ft.food_truck_id
WHERE o.order_status IN ('picked_up', 'ready')
ORDER BY o.customer_id, o.created_at DESC;

-- ============================================
-- View: v_customer_last_order_items
-- Items from customer's most recent order (Order Again feature)
-- ============================================
CREATE VIEW v_customer_last_order_items AS
SELECT 
    lo.customer_id,
    lo.order_id,
    lo.food_truck_id,
    lo.truck_name,
    lo.order_date,
    oi.menu_item_id,
    mi.name AS item_name,
    oi.quantity,
    oi.unit_price,
    mi.is_available AS currently_available,
    mi.price AS current_price
FROM v_customer_last_order lo
JOIN order_items oi ON lo.order_id = oi.order_id
LEFT JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id;

-- ============================================
-- View: v_order_status_timeline
-- Order status history for tracking
-- ============================================
CREATE VIEW v_order_status_timeline AS
SELECT 
    osh.status_history_id,
    osh.order_id,
    o.customer_id,
    o.order_number,
    osh.previous_status,
    osh.new_status,
    osh.changed_by,
    osh.change_reason,
    osh.created_at AS status_changed_at
FROM order_status_history osh
JOIN orders o ON osh.order_id = o.order_id
ORDER BY osh.order_id, osh.created_at;

-- ============================================
-- View: v_food_truck_summary
-- Food truck with worker count and menu item count
-- ============================================
CREATE VIEW v_food_truck_summary AS
SELECT 
    ft.food_truck_id,
    ft.name,
    ft.description,
    ft.cuisine_type,
    ft.is_active,
    o.owner_id,
    u.first_name || ' ' || u.last_name AS owner_name,
    (SELECT COUNT(*) FROM workers w WHERE w.food_truck_id = ft.food_truck_id AND w.is_active = TRUE) AS worker_count,
    (SELECT COUNT(*) FROM menu_items mi WHERE mi.food_truck_id = ft.food_truck_id AND mi.is_available = TRUE) AS menu_item_count
FROM food_trucks ft
JOIN owners o ON ft.owner_id = o.owner_id
JOIN users u ON o.user_id = u.user_id;

-- ============================================
-- View: v_user_details
-- Combined user info based on user type
-- ============================================
CREATE VIEW v_user_details AS
SELECT 
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.phone,
    u.user_type,
    u.is_active,
    u.created_at,
    CASE 
        WHEN u.user_type = 'customer' THEN c.customer_id
        WHEN u.user_type = 'owner' THEN o.owner_id
        WHEN u.user_type = 'worker' THEN w.worker_id
    END AS type_specific_id,
    CASE 
        WHEN u.user_type = 'customer' THEN c.loyalty_points::TEXT
        WHEN u.user_type = 'owner' THEN o.business_name
        WHEN u.user_type = 'worker' THEN w.role
    END AS type_specific_info
FROM users u
LEFT JOIN customers c ON u.user_id = c.user_id AND u.user_type = 'customer'
LEFT JOIN owners o ON u.user_id = o.user_id AND u.user_type = 'owner'
LEFT JOIN workers w ON u.user_id = w.user_id AND u.user_type = 'worker';

-- ============================================
-- View: v_order_details
-- Complete order information with customer and truck details
-- ============================================
CREATE VIEW v_order_details AS
SELECT 
    o.order_id,
    o.order_number,
    o.customer_id,
    u.first_name || ' ' || u.last_name AS customer_name,
    u.email AS customer_email,
    u.phone AS customer_phone,
    o.food_truck_id,
    ft.name AS food_truck_name,
    o.time_slot_id,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    o.order_status,
    o.payment_status,
    o.payment_method,
    o.subtotal,
    o.tax_amount,
    o.discount_amount,
    o.total_amount,
    o.special_instructions,
    o.estimated_ready_time,
    o.actual_ready_time,
    o.created_at,
    o.updated_at
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN users u ON c.user_id = u.user_id
JOIN food_trucks ft ON o.food_truck_id = ft.food_truck_id
JOIN time_slots ts ON o.time_slot_id = ts.time_slot_id;
