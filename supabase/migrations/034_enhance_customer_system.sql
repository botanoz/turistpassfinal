-- Enhance customer system with PIN codes, QR codes, and favorites
-- Date: 2025-11-01

-- ============================================
-- 1. ADD PIN CODE TO PURCHASED PASSES
-- ============================================

-- Add PIN code column for pass verification
ALTER TABLE purchased_passes
ADD COLUMN IF NOT EXISTS pin_code TEXT;

-- Add unique constraint for PIN code
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchased_passes_pin_code ON purchased_passes(pin_code) WHERE pin_code IS NOT NULL;

-- Update activation_code to be more descriptive
COMMENT ON COLUMN purchased_passes.activation_code IS 'QR code data - unique identifier for pass validation';
COMMENT ON COLUMN purchased_passes.pin_code IS 'PIN code (6 digits) - alternative verification method';

-- ============================================
-- 2. CREATE PASS_FAVORITES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pass_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  pass_id UUID NOT NULL REFERENCES passes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint: one favorite per customer per pass
  UNIQUE(customer_id, pass_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_favorites_customer ON pass_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_pass_favorites_pass ON pass_favorites(pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_favorites_created ON pass_favorites(created_at DESC);

-- RLS
ALTER TABLE pass_favorites ENABLE ROW LEVEL SECURITY;

-- Customers can view their own favorites
CREATE POLICY "Customers can view own favorites"
  ON pass_favorites FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can add favorites
CREATE POLICY "Customers can add favorites"
  ON pass_favorites FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Customers can remove their own favorites
CREATE POLICY "Customers can remove own favorites"
  ON pass_favorites FOR DELETE
  USING (customer_id = auth.uid());

-- Admins can view all favorites
CREATE POLICY "Admins can view all favorites"
  ON pass_favorites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 3. CREATE PASS_USAGE_HISTORY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pass_usage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchased_pass_id UUID NOT NULL REFERENCES purchased_passes(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Validation details
  validated_by TEXT, -- Business staff name or ID
  validation_method TEXT CHECK (validation_method IN ('qr_code', 'pin_code', 'manual')) DEFAULT 'qr_code',

  -- Discount applied
  discount_percentage INT,
  original_amount NUMERIC,
  discounted_amount NUMERIC,

  -- Location & device info
  validation_location TEXT,
  device_info JSONB,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pass_usage_purchased_pass ON pass_usage_history(purchased_pass_id);
CREATE INDEX IF NOT EXISTS idx_pass_usage_business ON pass_usage_history(business_id);
CREATE INDEX IF NOT EXISTS idx_pass_usage_created ON pass_usage_history(created_at DESC);

-- RLS
ALTER TABLE pass_usage_history ENABLE ROW LEVEL SECURITY;

-- Customers can view usage history of their own passes
CREATE POLICY "Customers can view own pass usage"
  ON pass_usage_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchased_passes pp
      WHERE pp.id = pass_usage_history.purchased_pass_id
        AND pp.customer_id = auth.uid()
    )
  );

-- Businesses can view their own validation history
CREATE POLICY "Businesses can view own validations"
  ON pass_usage_history FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses
    WHERE id = auth.uid()
  ));

-- Businesses can create usage records
CREATE POLICY "Businesses can create usage records"
  ON pass_usage_history FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM businesses
    WHERE id = auth.uid()
  ));

-- Admins can view all usage history
CREATE POLICY "Admins can view all usage"
  ON pass_usage_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 4. HELPER FUNCTIONS
-- ============================================

-- Generate unique PIN code (6 digits)
CREATE OR REPLACE FUNCTION generate_pin_code()
RETURNS TEXT AS $$
DECLARE
  new_pin TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6 random digits
    new_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Check if exists
    SELECT EXISTS(
      SELECT 1 FROM purchased_passes
      WHERE pin_code = new_pin
    ) INTO exists;

    EXIT WHEN NOT exists;
  END LOOP;

  RETURN new_pin;
END;
$$ LANGUAGE plpgsql;

-- Generate unique QR activation code
CREATE OR REPLACE FUNCTION generate_activation_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate UUID-based activation code
    new_code := 'PASS-' || UPPER(REPLACE(gen_random_uuid()::TEXT, '-', ''));

    -- Check if exists
    SELECT EXISTS(
      SELECT 1 FROM purchased_passes
      WHERE activation_code = new_code
    ) INTO exists;

    EXIT WHEN NOT exists;
  END LOOP;

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Validate pass by QR code or PIN
CREATE OR REPLACE FUNCTION validate_pass(
  p_identifier TEXT,
  p_validation_type TEXT,
  p_business_id UUID
)
RETURNS TABLE (
  valid BOOLEAN,
  message TEXT,
  pass_data JSONB
) AS $$
DECLARE
  v_pass purchased_passes%ROWTYPE;
  v_business_has_access BOOLEAN;
BEGIN
  -- Find pass by QR code or PIN
  IF p_validation_type = 'qr_code' THEN
    SELECT * INTO v_pass FROM purchased_passes
    WHERE activation_code = p_identifier;
  ELSIF p_validation_type = 'pin_code' THEN
    SELECT * INTO v_pass FROM purchased_passes
    WHERE pin_code = p_identifier;
  ELSE
    RETURN QUERY SELECT false, 'Invalid validation type', NULL::JSONB;
    RETURN;
  END IF;

  -- Check if pass exists
  IF v_pass.id IS NULL THEN
    RETURN QUERY SELECT false, 'Pass not found', NULL::JSONB;
    RETURN;
  END IF;

  -- Check if pass is active
  IF v_pass.status != 'active' THEN
    RETURN QUERY SELECT false, 'Pass is ' || v_pass.status, NULL::JSONB;
    RETURN;
  END IF;

  -- Check if pass has expired
  IF v_pass.expiry_date < NOW() THEN
    RETURN QUERY SELECT false, 'Pass has expired', NULL::JSONB;
    RETURN;
  END IF;

  -- Check if business is associated with this pass
  -- (Check if business is in the pass's business list)
  SELECT EXISTS(
    SELECT 1 FROM pass_businesses pb
    JOIN purchased_passes pp ON pp.pass_name LIKE '%' || (
      SELECT name FROM passes WHERE id = pb.pass_id
    ) || '%'
    WHERE pp.id = v_pass.id
      AND pb.business_id = p_business_id
  ) INTO v_business_has_access;

  IF NOT v_business_has_access THEN
    RETURN QUERY SELECT false, 'This pass is not valid at your business', NULL::JSONB;
    RETURN;
  END IF;

  -- Return success with pass details
  RETURN QUERY SELECT
    true,
    'Pass is valid',
    jsonb_build_object(
      'id', v_pass.id,
      'pass_name', v_pass.pass_name,
      'customer_id', v_pass.customer_id,
      'expiry_date', v_pass.expiry_date,
      'usage_count', v_pass.usage_count,
      'max_usage', v_pass.max_usage
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE pass_favorites IS 'Customer favorite passes for quick access';
COMMENT ON TABLE pass_usage_history IS 'Historical record of pass validations at businesses';
COMMENT ON FUNCTION generate_pin_code IS 'Generates unique 6-digit PIN code for pass verification';
COMMENT ON FUNCTION generate_activation_code IS 'Generates unique QR activation code';
COMMENT ON FUNCTION validate_pass IS 'Validates a pass by QR code or PIN code';
