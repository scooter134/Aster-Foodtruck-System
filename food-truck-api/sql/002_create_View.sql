CREATE VIEW v_available_time_slots AS
SELECT 
    ts.slot_id,
    ts.food_truck_id,
    ft.name AS truck_name,
    ts.slot_date,
    ts.start_time,
    ts.end_time,
    ts.max_capacity,
    ts.current_bookings,
    (ts.max_capacity - ts.current_bookings) AS available_capacity
FROM time_slots ts
JOIN food_trucks ft ON ts.food_truck_id = ft.food_truck_id
WHERE ts.current_bookings < ts.max_capacity
  AND ft.is_active = TRUE;

-- View: Active menu items
CREATE VIEW v_active_menu_items AS
SELECT 
    mi.item_id,
    mi.food_truck_id,
    ft.name AS truck_name,
    mi.name,
    mi.description,
    mi.price,
    mi.category,
    mi.image_url,
    mi.order_count
FROM menu_items mi
JOIN food_trucks ft ON mi.food_truck_id = ft.food_truck_id
WHERE mi.is_available = TRUE
  AND mi.is_deleted = FALSE
  AND ft.is_active = TRUE;

-- View: Daily analytics summary
CREATE VIEW v_daily_analytics AS
SELECT 
    a.day_id,
    a.food_truck_id,
    ft.name AS truck_name,
    a.analytics_date,
    a.total_revenue,
    a.total_orders,
    hi.name AS highest_revenue_item,
    li.name AS lowest_revenue_item
FROM analytics a
JOIN food_trucks ft ON a.food_truck_id = ft.food_truck_id
LEFT JOIN menu_items hi ON a.highest_revenue_item_id = hi.item_id
LEFT JOIN menu_items li ON a.lowest_revenue_item_id = li.item_id;

-- View: Time slot analytics (heatmap data)
CREATE VIEW v_time_slot_analytics AS
SELECT 
    ats.slot_analytics_id,
    a.food_truck_id,
    ft.name AS truck_name,
    a.analytics_date,
    ts.start_time,
    ts.end_time,
    ats.orders_count
FROM analytics_time_slots ats
JOIN analytics a ON ats.day_id = a.day_id
JOIN time_slots ts ON ats.slot_id = ts.slot_id
JOIN food_trucks ft ON a.food_truck_id = ft.food_truck_id;

-- View: Order frequency per item (Worker Dashboard)
-- Shows how many times each menu item was ordered
CREATE VIEW v_item_order_frequency AS
SELECT 
    mi.item_id,
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
LEFT JOIN order_items oi ON mi.item_id = oi.item_id
LEFT JOIN orders o ON oi.order_id = o.order_id 
    AND o.order_status NOT IN ('cancelled')
WHERE mi.is_deleted = FALSE
GROUP BY mi.item_id, mi.food_truck_id, ft.name, mi.name, mi.category, mi.price, mi.is_available
ORDER BY mi.food_truck_id, times_ordered DESC;

-- View: Customer's most recent order (Order Again feature)
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
WHERE o.order_status IN ('completed', 'ready')
ORDER BY o.customer_id, o.created_at DESC;

-- View: Items from customer's most recent order (Order Again feature)
CREATE VIEW v_customer_last_order_items AS
SELECT 
    lo.customer_id,
    lo.order_id,
    lo.food_truck_id,
    lo.truck_name,
    lo.order_date,
    oi.item_id,
    oi.item_name_snapshot,
    oi.quantity,
    oi.unit_price,
    mi.is_available AS currently_available,
    mi.is_deleted AS item_deleted,
    mi.price AS current_price
FROM v_customer_last_order lo
JOIN order_items oi ON lo.order_id = oi.order_id
LEFT JOIN menu_items mi ON oi.item_id = mi.item_id;

-- View: Order status timeline (Order Tracking)
CREATE VIEW v_order_status_timeline AS
SELECT 
    osh.history_id,
    osh.order_id,
    o.customer_id,
    osh.old_status,
    osh.new_status,
    osh.notes,
    osh.created_at AS status_changed_at,
    u.username AS changed_by_username
FROM order_status_history osh
JOIN orders o ON osh.order_id = o.order_id
LEFT JOIN users u ON osh.changed_by = u.user_id
ORDER BY osh.order_id, osh.created_at;