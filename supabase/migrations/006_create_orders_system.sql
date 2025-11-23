-- Migration: Orders System (Customers + Orders + Purchased Passes)
-- Description: Complete order management system for TuristPass
-- Date: 2025-10-29
-- FAZ: 3

-- ============================================
-- 1. UPDATE CUSTOMER_PROFILES TABLE
-- ============================================

-- Add total_spent column to existing customer_profiles
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_customer_profiles_total_spent ON customer_profiles(total_spent DESC);

-- Update function to recalculate total_spent from orders
CREATE OR REPLACE FUNCTION update_customer_total_spent()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE customer_profiles
  SET total_spent = (
    SELECT COALESCE(SUM(total_amount), 0)
    FROM orders
    WHERE customer_id = NEW.customer_id
      AND payment_status = 'completed'
  )
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 2. ORDERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL, -- Format: ORD-XXXXXX
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Order details
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')) DEFAULT 'pending',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'TRY',

  -- Payment
  payment_method TEXT CHECK (payment_method IN ('credit_card', 'bank_transfer', 'cash', 'other')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
  payment_id TEXT, -- External payment processor ID

  -- Metadata
  notes TEXT,
  admin_notes TEXT, -- Internal admin notes

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update orders
CREATE POLICY "Admins can update orders"
  ON orders FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- Trigger to update customer total_spent
CREATE TRIGGER update_customer_spent_on_order
  AFTER INSERT OR UPDATE ON orders
  FOR EACH ROW
  WHEN (NEW.payment_status = 'completed')
  EXECUTE FUNCTION update_customer_total_spent();

-- ============================================
-- 3. ORDER_ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Pass reference (to be connected in FAZ 5)
  pass_name TEXT NOT NULL, -- Denormalized for history
  pass_type TEXT, -- e.g., "1-day-adult", "3-day-family"

  -- Pricing
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

-- RLS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Customers can view items of their own orders
CREATE POLICY "Customers can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

-- Admins can view all order items
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 4. PURCHASED_PASSES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS purchased_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Pass details (denormalized for history)
  pass_name TEXT NOT NULL,
  pass_type TEXT NOT NULL,

  -- Activation & Validity
  activation_code TEXT UNIQUE NOT NULL, -- QR code data (to be generated in FAZ 5)
  activation_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ NOT NULL,

  -- Status
  status TEXT CHECK (status IN ('active', 'expired', 'cancelled', 'used')) DEFAULT 'active',

  -- Usage tracking
  usage_count INT DEFAULT 0,
  max_usage INT, -- NULL = unlimited

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_purchased_passes_customer ON purchased_passes(customer_id);
CREATE INDEX IF NOT EXISTS idx_purchased_passes_order ON purchased_passes(order_id);
CREATE INDEX IF NOT EXISTS idx_purchased_passes_status ON purchased_passes(status);
CREATE INDEX IF NOT EXISTS idx_purchased_passes_activation_code ON purchased_passes(activation_code);
CREATE INDEX IF NOT EXISTS idx_purchased_passes_expiry ON purchased_passes(expiry_date);

-- RLS
ALTER TABLE purchased_passes ENABLE ROW LEVEL SECURITY;

-- Customers can view their own passes
CREATE POLICY "Customers can view own passes"
  ON purchased_passes FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can view all passes
CREATE POLICY "Admins can view all passes"
  ON purchased_passes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update passes (e.g., cancel, extend)
CREATE POLICY "Admins can update passes"
  ON purchased_passes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER purchased_passes_updated_at
  BEFORE UPDATE ON purchased_passes
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Generate unique order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate ORD- followed by 6 random digits
    new_number := 'ORD-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');

    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM orders WHERE order_number = new_number) INTO exists;

    EXIT WHEN NOT exists;
  END LOOP;

  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Get customer orders summary
CREATE OR REPLACE FUNCTION get_customer_orders_summary(customer_uuid UUID)
RETURNS TABLE (
  total_orders BIGINT,
  completed_orders BIGINT,
  pending_orders BIGINT,
  total_spent NUMERIC,
  active_passes BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(o.id) as total_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'completed') as completed_orders,
    COUNT(o.id) FILTER (WHERE o.status = 'pending') as pending_orders,
    COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'completed'), 0) as total_spent,
    COUNT(pp.id) FILTER (WHERE pp.status = 'active') as active_passes
  FROM customer_profiles cp
  LEFT JOIN orders o ON o.customer_id = cp.id
  LEFT JOIN purchased_passes pp ON pp.customer_id = cp.id
  WHERE cp.id = customer_uuid
  GROUP BY cp.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get admin orders stats
CREATE OR REPLACE FUNCTION get_admin_orders_stats()
RETURNS TABLE (
  total_orders BIGINT,
  completed_orders BIGINT,
  pending_orders BIGINT,
  total_revenue NUMERIC,
  today_orders BIGINT,
  today_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_orders,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'completed'), 0) as total_revenue,
    COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_orders,
    COALESCE(SUM(total_amount) FILTER (WHERE DATE(created_at) = CURRENT_DATE AND payment_status = 'completed'), 0) as today_revenue
  FROM orders;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. INSERT SAMPLE DATA (for development)
-- ============================================

-- NOTE: Sample data insertion requires existing customer_profiles
-- Since customer_profiles.id is linked to auth.users, we'll only insert
-- sample orders for the FIRST existing customer profile (if any exist)

DO $$
DECLARE
  first_customer_id UUID;
  order1_id UUID;
  order2_id UUID;
  order3_id UUID;
BEGIN
  -- Get the first existing customer profile
  SELECT id INTO first_customer_id FROM customer_profiles LIMIT 1;

  -- Only proceed if we have at least one customer
  IF first_customer_id IS NOT NULL THEN
    -- Order 1: Completed
    INSERT INTO orders (id, order_number, customer_id, status, total_amount, payment_method, payment_status, created_at, completed_at)
    VALUES (gen_random_uuid(), 'ORD-001001', first_customer_id, 'completed', 200, 'credit_card', 'completed', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '5 minutes')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO order1_id;

    IF order1_id IS NOT NULL THEN
      INSERT INTO order_items (order_id, pass_name, pass_type, quantity, unit_price, total_price)
      VALUES (order1_id, 'Istanbul Welcome Pass', '1-day-adult', 1, 200, 200);

      INSERT INTO purchased_passes (customer_id, order_id, pass_name, pass_type, activation_code, expiry_date, status)
      VALUES (first_customer_id, order1_id, 'Istanbul Welcome Pass', '1-day-adult', 'PASS-' || SUBSTRING(order1_id::TEXT, 1, 8), NOW() + INTERVAL '1 day', 'active');
    END IF;

    -- Order 2: Pending
    INSERT INTO orders (id, order_number, customer_id, status, total_amount, payment_method, payment_status, created_at)
    VALUES (gen_random_uuid(), 'ORD-001002', first_customer_id, 'pending', 150, 'credit_card', 'pending', NOW() - INTERVAL '1 day')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO order2_id;

    IF order2_id IS NOT NULL THEN
      INSERT INTO order_items (order_id, pass_name, pass_type, quantity, unit_price, total_price)
      VALUES (order2_id, 'Food & Beverage Pass', '3-day-adult', 1, 150, 150);
    END IF;

    -- Order 3: Completed
    INSERT INTO orders (id, order_number, customer_id, status, total_amount, payment_method, payment_status, created_at, completed_at)
    VALUES (gen_random_uuid(), 'ORD-001003', first_customer_id, 'completed', 350, 'credit_card', 'completed', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '10 minutes')
    ON CONFLICT (order_number) DO NOTHING
    RETURNING id INTO order3_id;

    IF order3_id IS NOT NULL THEN
      INSERT INTO order_items (order_id, pass_name, pass_type, quantity, unit_price, total_price)
      VALUES (order3_id, 'Premium Pass', '3-day-adult', 1, 350, 350);

      INSERT INTO purchased_passes (customer_id, order_id, pass_name, pass_type, activation_code, expiry_date, status)
      VALUES (first_customer_id, order3_id, 'Premium Pass', '3-day-adult', 'PASS-' || SUBSTRING(order3_id::TEXT, 1, 8), NOW() + INTERVAL '3 days', 'active');
    END IF;
  END IF;
END $$;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE orders IS 'Customer orders for TuristPass purchases';
COMMENT ON TABLE order_items IS 'Line items within each order';
COMMENT ON TABLE purchased_passes IS 'Active passes owned by customers with activation codes';
COMMENT ON FUNCTION generate_order_number IS 'Generates unique order numbers in format ORD-XXXXXX';
COMMENT ON FUNCTION get_customer_orders_summary IS 'Gets order summary for a specific customer';
COMMENT ON FUNCTION get_admin_orders_stats IS 'Gets global order statistics for admin dashboard';
