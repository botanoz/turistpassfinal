-- =====================================================
-- MIGRATION: Add pricing details to orders table
-- =====================================================
-- Description: Add subtotal and discount_amount columns
--              to properly track order pricing breakdown
-- Date: 2025-11-29
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ADDING ORDER PRICING DETAILS';
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- 1. ADD SUBTOTAL AND DISCOUNT_AMOUNT COLUMNS
-- =====================================================

DO $$
BEGIN
  -- Add subtotal column (order amount before discount)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE orders ADD COLUMN subtotal NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added subtotal column to orders table';
  ELSE
    RAISE NOTICE 'subtotal column already exists';
  END IF;

  -- Add discount_amount column (total discount applied)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'discount_amount'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    RAISE NOTICE 'Added discount_amount column to orders table';
  ELSE
    RAISE NOTICE 'discount_amount column already exists';
  END IF;

  -- Add discount_code_id column (reference to applied discount code)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'discount_code_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN discount_code_id UUID;
    RAISE NOTICE 'Added discount_code_id column to orders table';
  ELSE
    RAISE NOTICE 'discount_code_id column already exists';
  END IF;
END $$;

-- =====================================================
-- 2. BACKFILL EXISTING ORDERS
-- =====================================================

-- For existing orders without subtotal, set it equal to total_amount
UPDATE orders
SET subtotal = total_amount
WHERE subtotal = 0 AND total_amount > 0;

-- =====================================================
-- 3. ADD INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_orders_discount_code ON orders(discount_code_id);

-- =====================================================
-- 4. ADD FOREIGN KEY CONSTRAINT (if discount_codes table exists)
-- =====================================================

DO $$
BEGIN
  -- Check if discount_codes table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'discount_codes'
  ) THEN
    -- Add foreign key constraint if not already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'fk_orders_discount_code'
    ) THEN
      ALTER TABLE orders
        ADD CONSTRAINT fk_orders_discount_code
        FOREIGN KEY (discount_code_id) REFERENCES discount_codes(id) ON DELETE SET NULL;
      RAISE NOTICE 'Added foreign key constraint to discount_codes';
    ELSE
      RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
  END IF;
END $$;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
DECLARE
  orders_with_subtotal INTEGER;
  orders_with_discount INTEGER;
  total_orders INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_orders FROM orders;
  SELECT COUNT(*) INTO orders_with_subtotal FROM orders WHERE subtotal > 0;
  SELECT COUNT(*) INTO orders_with_discount FROM orders WHERE discount_amount > 0;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'MIGRATION 077 COMPLETED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Orders: %', total_orders;
  RAISE NOTICE 'Orders with subtotal: %', orders_with_subtotal;
  RAISE NOTICE 'Orders with discount: %', orders_with_discount;
  RAISE NOTICE '';
  RAISE NOTICE 'New columns added:';
  RAISE NOTICE '- subtotal: Order amount before discount';
  RAISE NOTICE '- discount_amount: Total discount applied';
  RAISE NOTICE '- discount_code_id: Reference to discount code used';
  RAISE NOTICE '========================================';
END $$;
