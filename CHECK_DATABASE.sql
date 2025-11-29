-- =====================================================
-- DATABASE CHECK QUERIES
-- =====================================================
-- Purpose: Check if required columns exist in orders table
-- Run these queries in Supabase SQL Editor to diagnose issues
-- =====================================================

-- ============================================
-- 1. CHECK IF ORDERS TABLE HAS REQUIRED COLUMNS
-- ============================================

-- This query will show all columns in the orders table
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
ORDER BY ordinal_position;

-- Expected columns (must exist):
-- - id
-- - order_number
-- - customer_id
-- - status
-- - total_amount
-- - subtotal (NEW - added in migration 077)
-- - discount_amount (NEW - added in migration 077)
-- - currency
-- - discount_code_id (NEW - added in migration 077)
-- - payment_method
-- - payment_status
-- - created_at
-- - completed_at

-- ============================================
-- 2. CHECK IF ORDER_ITEMS TABLE HAS REQUIRED COLUMNS
-- ============================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'order_items'
ORDER BY ordinal_position;

-- Expected columns (must exist):
-- - id
-- - order_id
-- - pass_id (added in migration 024)
-- - pass_name
-- - pass_type
-- - quantity
-- - unit_price
-- - total_price
-- - adult_quantity
-- - child_quantity

-- ============================================
-- 3. CHECK SPECIFIC MISSING COLUMNS
-- ============================================

-- Check if subtotal column exists in orders table
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'subtotal'
) as subtotal_exists;

-- Check if discount_amount column exists in orders table
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'discount_amount'
) as discount_amount_exists;

-- Check if discount_code_id column exists in orders table
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'orders'
    AND column_name = 'discount_code_id'
) as discount_code_id_exists;

-- Check if pass_id column exists in order_items table
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'order_items'
    AND column_name = 'pass_id'
) as pass_id_exists;

-- Check if total_price column exists in order_items table
SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'order_items'
    AND column_name = 'total_price'
) as total_price_exists;

-- ============================================
-- 4. CHECK IF MIGRATIONS HAVE BEEN RUN
-- ============================================

-- Check if migration tracking table exists
SELECT EXISTS (
  SELECT 1
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'schema_migrations'
) as migration_table_exists;

-- If migration table exists, check which migrations have been run
-- (This might not exist in your setup, so it's optional)
-- SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 10;

-- ============================================
-- 5. SAMPLE DATA CHECK
-- ============================================

-- Get a sample order to see what columns have data
SELECT * FROM orders LIMIT 1;

-- Get a sample order_item to see what columns have data
SELECT * FROM order_items LIMIT 1;

-- ============================================
-- 6. CHECK FOREIGN KEY CONSTRAINTS
-- ============================================

-- Check if foreign key constraint exists for order_items.pass_id
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'order_items'
  AND tc.constraint_type = 'FOREIGN KEY';

-- Check if foreign key constraint exists for orders.discount_code_id
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'orders'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================
-- EXPECTED RESULTS
-- ============================================

-- IF COLUMNS ARE MISSING:
-- You need to run migration 077_add_order_pricing_details.sql

-- IF ALL CHECKS PASS BUT STILL GETTING 500 ERROR:
-- Check the server logs for the actual error message
-- The error might be related to:
-- 1. RLS policies blocking access
-- 2. Missing passes table or data
-- 3. Permission issues

-- =====================================================
