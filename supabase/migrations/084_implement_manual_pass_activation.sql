-- Migration 084: Implement Manual Pass Activation System
-- Allows customers to purchase passes in advance and activate them when ready

-- ============================================
-- 0. ADD MISSING COLUMNS AND CONSTRAINTS
-- ============================================

-- Add pass_id column to link to passes table (for duration lookup)
ALTER TABLE purchased_passes
ADD COLUMN IF NOT EXISTS pass_id UUID REFERENCES passes(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_purchased_passes_pass_id ON purchased_passes(pass_id);

-- Make expiry_date nullable (will be set on activation, not at purchase)
ALTER TABLE purchased_passes
ALTER COLUMN expiry_date DROP NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN purchased_passes.pass_id IS
'Foreign key to passes table. Used to lookup pass duration for activation calculations.';

-- ============================================
-- 1. UPDATE STATUS CONSTRAINT
-- ============================================

-- Drop existing check constraint
ALTER TABLE purchased_passes
DROP CONSTRAINT IF EXISTS purchased_passes_status_check;

-- Add new constraint with 'pending_activation' status
ALTER TABLE purchased_passes
ADD CONSTRAINT purchased_passes_status_check
CHECK (status IN ('pending_activation', 'active', 'expired', 'cancelled', 'used'));

-- Add helpful comment
COMMENT ON COLUMN purchased_passes.status IS
'Pass lifecycle: pending_activation (purchased, not started) → active (activated, timer running) → expired/used/cancelled';

COMMENT ON COLUMN purchased_passes.activation_date IS
'NULL for pending_activation passes. Set when customer manually activates the pass.';

COMMENT ON COLUMN purchased_passes.expiry_date IS
'NULL for pending_activation passes. Calculated as activation_date + pass_duration when activated.';

-- ============================================
-- 2. CREATE ACTIVATION FUNCTION
-- ============================================

-- Function to activate a pass
CREATE OR REPLACE FUNCTION activate_purchased_pass(
  p_pass_id UUID,
  p_customer_id UUID
)
RETURNS TABLE (
  pass_id UUID,
  activation_date TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  status TEXT,
  message TEXT
) AS $$
DECLARE
  v_pass RECORD;
  v_pass_duration INTERVAL;
  v_activation_ts TIMESTAMPTZ;
  v_expiry_ts TIMESTAMPTZ;
BEGIN
  -- Get the pass
  SELECT pp.*
  INTO v_pass
  FROM purchased_passes pp
  WHERE pp.id = p_pass_id
    AND pp.customer_id = p_customer_id
  FOR UPDATE; -- Lock the row

  -- Check if pass exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pass not found or does not belong to customer';
  END IF;

  -- Check if pass is in correct status
  IF v_pass.status != 'pending_activation' THEN
    RAISE EXCEPTION 'Pass cannot be activated. Current status: %', v_pass.status;
  END IF;

  -- Calculate duration from pass_type string
  IF v_pass.pass_type IS NOT NULL THEN
    -- Extract days from pass_type like "3-day-adult" or "1-day-child"
    DECLARE
      type_days INTEGER;
    BEGIN
      type_days := SUBSTRING(v_pass.pass_type FROM '(\d+)-day')::INTEGER;
      IF type_days IS NOT NULL THEN
        v_pass_duration := make_interval(days => type_days);
      ELSE
        -- Default to 3 days if pattern doesn't match
        v_pass_duration := INTERVAL '3 days';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_pass_duration := INTERVAL '3 days';
    END;
  ELSE
    -- Default to 3 days if no pass_type specified
    v_pass_duration := INTERVAL '3 days';
  END IF;

  -- Set activation timestamp
  v_activation_ts := NOW();
  v_expiry_ts := v_activation_ts + v_pass_duration;

  -- Update the pass
  UPDATE purchased_passes
  SET
    status = 'active',
    activation_date = v_activation_ts,
    expiry_date = v_expiry_ts,
    updated_at = NOW()
  WHERE id = p_pass_id;

  -- Log the activation
  INSERT INTO activity_logs (
    user_type,
    user_id,
    action,
    description,
    category,
    metadata
  ) VALUES (
    'customer',
    p_customer_id,
    'pass_activated',
    'Pass manually activated: ' || v_pass.pass_name,
    'passes',
    jsonb_build_object(
      'pass_id', p_pass_id,
      'pass_name', v_pass.pass_name,
      'activation_date', v_activation_ts,
      'expiry_date', v_expiry_ts,
      'duration', v_pass_duration::TEXT
    )
  );

  -- Return the activated pass info
  RETURN QUERY
  SELECT
    p_pass_id,
    v_activation_ts,
    v_expiry_ts,
    'active'::TEXT,
    'Pass activated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION activate_purchased_pass(UUID, UUID) TO authenticated;

-- ============================================
-- 3. CREATE AUTO-EXPIRY FUNCTION (OPTIONAL)
-- ============================================

-- Function to auto-expire passes that have passed their expiry date
-- This can be run periodically via cron or manually
CREATE OR REPLACE FUNCTION expire_old_passes()
RETURNS TABLE (expired_count INTEGER) AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Update active passes that have expired
  UPDATE purchased_passes
  SET
    status = 'expired',
    updated_at = NOW()
  WHERE status = 'active'
    AND expiry_date < NOW();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Log if any passes were expired
  IF v_count > 0 THEN
    INSERT INTO activity_logs (
      user_type,
      user_id,
      action,
      description,
      category,
      metadata
    ) VALUES (
      'system',
      NULL,
      'passes_auto_expired',
      'Automatically expired ' || v_count || ' passes',
      'passes',
      jsonb_build_object('expired_count', v_count, 'timestamp', NOW())
    );
  END IF;

  RETURN QUERY SELECT v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. UPDATE EXISTING PASSES (BACKWARDS COMPATIBILITY)
-- ============================================

-- IMPORTANT: Do NOT change existing active passes
-- They already have activation_date and expiry_date set
-- Only new purchases will use pending_activation

-- Add a note for any passes that are active but missing activation_date
UPDATE purchased_passes
SET
  activation_date = created_at,
  updated_at = NOW()
WHERE status = 'active'
  AND activation_date IS NULL;

-- Log this fix
DO $$
DECLARE
  v_fixed_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_fixed_count = ROW_COUNT;

  IF v_fixed_count > 0 THEN
    INSERT INTO activity_logs (
      user_type,
      user_id,
      action,
      description,
      category,
      metadata
    ) VALUES (
      'system',
      NULL,
      'pass_data_cleanup',
      'Fixed ' || v_fixed_count || ' active passes missing activation_date',
      'passes',
      jsonb_build_object('fixed_count', v_fixed_count)
    );
  END IF;
END $$;

-- ============================================
-- 5. CREATE HELPER VIEW (OPTIONAL)
-- ============================================

-- View to easily see pass activation statistics
CREATE OR REPLACE VIEW pass_activation_stats AS
SELECT
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE activation_date IS NOT NULL) as activated_count,
  COUNT(*) FILTER (WHERE activation_date IS NULL) as pending_count
FROM purchased_passes
GROUP BY status;

-- Grant access
GRANT SELECT ON pass_activation_stats TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify the changes
DO $$
BEGIN
  RAISE NOTICE 'Migration 084 completed successfully!';
  RAISE NOTICE 'New pass status available: pending_activation';
  RAISE NOTICE 'Activation function created: activate_purchased_pass()';
  RAISE NOTICE 'Auto-expiry function created: expire_old_passes()';
  RAISE NOTICE 'Existing active passes preserved';
END $$;
