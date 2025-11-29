-- =====================================================
-- CHECK ORDER_ITEMS TABLE COLUMNS
-- =====================================================

-- 1. Check all columns in order_items table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'order_items'
ORDER BY ordinal_position;

-- 2. Check specific required columns
SELECT
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'pass_id'
  ) as pass_id_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'pass_name'
  ) as pass_name_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'pass_type'
  ) as pass_type_exists,
  EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'total_price'
  ) as total_price_exists;

-- 3. Check if there are any orders and order_items
SELECT
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COUNT(*) FROM order_items) as total_order_items;

-- 4. Sample order with items to see the structure
SELECT
  o.id,
  o.order_number,
  o.subtotal,
  o.discount_amount,
  o.currency,
  oi.pass_name,
  oi.total_price
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
LIMIT 1;
