-- =====================================================
-- Migration: Add 'suspended' status to purchased_passes
-- =====================================================
-- Purpose: Allow passes to be temporarily suspended during refund
--          review process, and reactivated if refund is rejected
-- Date: 2025-12-04
-- =====================================================

-- Drop existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'purchased_passes_status_check'
      AND conrelid = 'purchased_passes'::regclass
  ) THEN
    ALTER TABLE purchased_passes DROP CONSTRAINT purchased_passes_status_check;
    RAISE NOTICE 'Dropped old status constraint';
  END IF;
END $$;

-- Add new constraint with 'suspended' and 'pending_activation' status
ALTER TABLE purchased_passes
  ADD CONSTRAINT purchased_passes_status_check
  CHECK (status IN ('pending_activation', 'active', 'expired', 'cancelled', 'used', 'suspended', 'pending'));

-- Create index on suspended passes for quick lookups
CREATE INDEX IF NOT EXISTS idx_purchased_passes_suspended
  ON purchased_passes(status) WHERE status = 'suspended';

-- Function to suspend passes when refund request is created
CREATE OR REPLACE FUNCTION suspend_passes_on_refund_request()
RETURNS TRIGGER AS $$
BEGIN
  -- When a refund request is created, suspend all active/pending/pending_activation passes for that order
  IF (NEW.status = 'pending' OR NEW.status = 'under_review') AND OLD.id IS NULL THEN
    UPDATE purchased_passes
    SET
      status = 'suspended',
      updated_at = NOW()
    WHERE order_id = NEW.order_id
      AND status IN ('active', 'pending', 'pending_activation');

    RAISE NOTICE 'Suspended passes for order %', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to reactivate passes when refund is rejected
CREATE OR REPLACE FUNCTION reactivate_passes_on_refund_rejection()
RETURNS TRIGGER AS $$
BEGIN
  -- When a refund request is rejected, reactivate suspended passes
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
    UPDATE purchased_passes
    SET
      status = 'active',
      updated_at = NOW()
    WHERE order_id = NEW.order_id
      AND status = 'suspended';

    RAISE NOTICE 'Reactivated passes for order %', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers to avoid duplicates
DROP TRIGGER IF EXISTS suspend_passes_on_refund_request_trigger ON refund_requests;
DROP TRIGGER IF EXISTS reactivate_passes_on_refund_rejection_trigger ON refund_requests;

-- Create trigger to suspend passes when refund request is created
CREATE TRIGGER suspend_passes_on_refund_request_trigger
  AFTER INSERT ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION suspend_passes_on_refund_request();

-- Create trigger to reactivate passes when refund is rejected
CREATE TRIGGER reactivate_passes_on_refund_rejection_trigger
  AFTER UPDATE ON refund_requests
  FOR EACH ROW
  WHEN (NEW.status = 'rejected' AND OLD.status != 'rejected')
  EXECUTE FUNCTION reactivate_passes_on_refund_rejection();

COMMENT ON COLUMN purchased_passes.status IS 'Pass status: pending_activation (not started), active (in use), expired, cancelled, used, suspended (during refund review), pending (payment pending)';
