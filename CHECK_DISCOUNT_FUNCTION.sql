-- =====================================================
-- CHECK DISCOUNT CODE VALIDATION FUNCTION
-- =====================================================

-- 1. Check if validate_discount_code function exists
SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'validate_discount_code'
  AND n.nspname = 'public';

-- 2. Check if discount_codes table exists
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'discount_codes'
) as discount_codes_table_exists;

-- 3. Check discount_codes table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'discount_codes'
ORDER BY ordinal_position;

-- 4. Check if there are any active discount codes
SELECT
  code,
  discount_type,
  discount_value,
  status,
  valid_from,
  valid_until,
  min_purchase_amount,
  max_uses,
  current_uses
FROM discount_codes
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 5;

-- 5. Test the function with a sample code (replace 'TESTCODE' with actual code)
-- SELECT * FROM validate_discount_code(
--   'TESTCODE',           -- p_code
--   NULL,                 -- p_customer_id (can be NULL)
--   100,                  -- p_subtotal
--   NULL                  -- p_pass_id (can be NULL)
-- );

-- 6. Check campaigns table
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'campaigns'
) as campaigns_table_exists;

-- 7. Check discount_code_usage table
SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'discount_code_usage'
) as discount_code_usage_table_exists;
