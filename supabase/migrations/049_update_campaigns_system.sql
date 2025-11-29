-- =============================================
-- UPDATE CAMPAIGNS SYSTEM (if tables already exist)
-- =============================================
-- This migration updates the campaigns system without recreating tables

-- Drop existing functions first (safe to drop and recreate)
DROP FUNCTION IF EXISTS get_active_banner_campaigns();
DROP FUNCTION IF EXISTS validate_discount_code(TEXT, UUID, NUMERIC, UUID);

-- =============================================
-- ENSURE TABLES EXIST (CREATE IF NOT EXISTS)
-- =============================================

-- Create campaigns table if it doesn't exist
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  banner_text TEXT NOT NULL,
  banner_type TEXT CHECK (banner_type IN ('info', 'warning', 'success', 'promotion')) DEFAULT 'promotion',
  show_banner BOOLEAN DEFAULT true,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed_amount', 'none')) DEFAULT 'none',
  discount_value NUMERIC CHECK (discount_value >= 0),
  status TEXT CHECK (status IN ('draft', 'active', 'scheduled', 'expired', 'cancelled')) DEFAULT 'draft',
  priority INTEGER DEFAULT 0,
  target_audience JSONB DEFAULT '{}',
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create discount_codes table if it doesn't exist
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  max_uses INTEGER,
  max_uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  min_purchase_amount NUMERIC DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  applicable_pass_ids UUID[] DEFAULT NULL,
  applicable_pass_types TEXT[] DEFAULT NULL,
  status TEXT CHECK (status IN ('active', 'inactive', 'expired')) DEFAULT 'active',
  created_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create discount_code_usage table if it doesn't exist
CREATE TABLE IF NOT EXISTS discount_code_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id UUID NOT NULL REFERENCES discount_codes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  code_used TEXT NOT NULL,
  discount_amount NUMERIC NOT NULL,
  order_subtotal NUMERIC NOT NULL,
  order_total NUMERIC NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(discount_code_id, order_id)
);

-- =============================================
-- CREATE INDEXES (IF NOT EXISTS)
-- =============================================

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON campaigns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_campaigns_priority ON campaigns(priority DESC);

CREATE INDEX IF NOT EXISTS idx_discount_codes_code ON discount_codes(UPPER(code));
CREATE INDEX IF NOT EXISTS idx_discount_codes_status ON discount_codes(status);
CREATE INDEX IF NOT EXISTS idx_discount_codes_campaign ON discount_codes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_discount_codes_validity ON discount_codes(valid_from, valid_until);

CREATE INDEX IF NOT EXISTS idx_discount_usage_code ON discount_code_usage(discount_code_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_customer ON discount_code_usage(customer_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_order ON discount_code_usage(order_id);
CREATE INDEX IF NOT EXISTS idx_discount_usage_date ON discount_code_usage(used_at DESC);

-- =============================================
-- RECREATE TRIGGERS
-- =============================================

-- Drop existing triggers first
DROP TRIGGER IF EXISTS campaigns_updated_at_trigger ON campaigns;
DROP TRIGGER IF EXISTS discount_codes_updated_at_trigger ON discount_codes;
DROP TRIGGER IF EXISTS increment_usage_trigger ON discount_code_usage;
DROP TRIGGER IF EXISTS auto_expire_campaigns_trigger ON campaigns;

-- Update updated_at timestamp for campaigns
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid "already exists" error
DROP TRIGGER IF EXISTS campaigns_updated_at_trigger ON campaigns;

CREATE TRIGGER campaigns_updated_at_trigger
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Update updated_at timestamp for discount codes
CREATE OR REPLACE FUNCTION update_discount_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid "already exists" error
DROP TRIGGER IF EXISTS discount_codes_updated_at_trigger ON discount_codes;

CREATE TRIGGER discount_codes_updated_at_trigger
  BEFORE UPDATE ON discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_discount_codes_updated_at();

-- Auto-increment current_uses when discount code is used
CREATE OR REPLACE FUNCTION increment_discount_code_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE discount_codes
  SET current_uses = current_uses + 1
  WHERE id = NEW.discount_code_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_usage_trigger
  AFTER INSERT ON discount_code_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_discount_code_usage();

-- Auto-expire campaigns when end_date is reached
CREATE OR REPLACE FUNCTION auto_expire_campaigns()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.end_date < NOW() AND NEW.status = 'active' THEN
    NEW.status = 'expired';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid "already exists" error
DROP TRIGGER IF EXISTS auto_expire_campaigns_trigger ON campaigns;

CREATE TRIGGER auto_expire_campaigns_trigger
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION auto_expire_campaigns();

-- =============================================
-- ENABLE RLS
-- =============================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_code_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can manage campaigns" ON campaigns;
DROP POLICY IF EXISTS "Customers can view active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Anonymous can view active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admins can manage discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Customers can view active discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Anonymous can view active discount codes" ON discount_codes;
DROP POLICY IF EXISTS "Admins can view all discount usage" ON discount_code_usage;
DROP POLICY IF EXISTS "Customers can view own discount usage" ON discount_code_usage;
DROP POLICY IF EXISTS "System can insert discount usage" ON discount_code_usage;

-- Recreate policies
CREATE POLICY "Admins can manage campaigns"
  ON campaigns
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Customers can view active campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    start_date <= NOW() AND
    end_date >= NOW() AND
    show_banner = true
  );

CREATE POLICY "Anonymous can view active campaigns"
  ON campaigns
  FOR SELECT
  TO anon
  USING (
    status = 'active' AND
    start_date <= NOW() AND
    end_date >= NOW() AND
    show_banner = true
  );

CREATE POLICY "Admins can manage discount codes"
  ON discount_codes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Customers can view active discount codes"
  ON discount_codes
  FOR SELECT
  TO authenticated
  USING (
    status = 'active' AND
    valid_from <= NOW() AND
    valid_until >= NOW()
  );

CREATE POLICY "Anonymous can view active discount codes"
  ON discount_codes
  FOR SELECT
  TO anon
  USING (
    status = 'active' AND
    valid_from <= NOW() AND
    valid_until >= NOW()
  );

CREATE POLICY "Admins can view all discount usage"
  ON discount_code_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Customers can view own discount usage"
  ON discount_code_usage
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "System can insert discount usage"
  ON discount_code_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Function to get active campaigns for banner display
CREATE OR REPLACE FUNCTION get_active_banner_campaigns()
RETURNS TABLE (
  id UUID,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  banner_text TEXT,
  banner_type TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.subtitle,
    c.description,
    c.banner_text,
    c.banner_type,
    c.discount_type,
    c.discount_value,
    c.end_date
  FROM campaigns c
  WHERE c.status = 'active'
    AND c.show_banner = true
    AND c.start_date <= NOW()
    AND c.end_date >= NOW()
  ORDER BY c.priority DESC, c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate discount code
-- Drop existing function to avoid signature conflicts
DROP FUNCTION IF EXISTS validate_discount_code(TEXT, UUID, NUMERIC, UUID);

CREATE OR REPLACE FUNCTION validate_discount_code(
  p_code TEXT,
  p_customer_id UUID,
  p_subtotal NUMERIC,
  p_pass_id UUID DEFAULT NULL
)
RETURNS TABLE (
  is_valid BOOLEAN,
  discount_code_id UUID,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_amount NUMERIC,
  error_message TEXT
) AS $$
DECLARE
  v_code RECORD;
  v_usage_count INTEGER;
  v_calculated_discount NUMERIC;
BEGIN
  -- Find the discount code (case-insensitive)
  SELECT * INTO v_code
  FROM discount_codes
  WHERE UPPER(code) = UPPER(p_code)
    AND status = 'active'
    AND valid_from <= NOW()
    AND valid_until >= NOW();

  -- Check if code exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Invalid or expired discount code'::TEXT;
    RETURN;
  END IF;

  -- Check max uses
  IF v_code.max_uses IS NOT NULL AND v_code.current_uses >= v_code.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'Discount code has reached maximum uses'::TEXT;
    RETURN;
  END IF;

  -- Check usage per customer
  IF p_customer_id IS NOT NULL AND v_code.max_uses_per_customer IS NOT NULL THEN
    SELECT COUNT(*) INTO v_usage_count
    FROM discount_code_usage
    WHERE discount_code_id = v_code.id
      AND customer_id = p_customer_id;

    IF v_usage_count >= v_code.max_uses_per_customer THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'You have already used this discount code'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Check minimum purchase amount
  IF p_subtotal < v_code.min_purchase_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC,
      format('Minimum purchase amount is ₺%s', v_code.min_purchase_amount)::TEXT;
    RETURN;
  END IF;

  -- Check applicable passes
  IF p_pass_id IS NOT NULL AND v_code.applicable_pass_ids IS NOT NULL THEN
    IF NOT (p_pass_id = ANY(v_code.applicable_pass_ids)) THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, NULL::NUMERIC, NULL::NUMERIC, 'This discount code is not applicable to the selected pass'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Calculate discount amount
  IF v_code.discount_type = 'percentage' THEN
    v_calculated_discount := (p_subtotal * v_code.discount_value) / 100;
  ELSE
    v_calculated_discount := v_code.discount_value;
  END IF;

  -- Ensure discount doesn't exceed subtotal
  v_calculated_discount := LEAST(v_calculated_discount, p_subtotal);

  -- Return valid result
  RETURN QUERY SELECT
    true,
    v_code.id,
    v_code.discount_type,
    v_code.discount_value,
    v_calculated_discount,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'Campaigns system updated successfully!';
END $$;
