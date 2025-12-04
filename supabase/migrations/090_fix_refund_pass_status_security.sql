-- =====================================================
-- Migration 090: Harden refund pass status flow
-- Purpose: Make refund triggers bypass RLS safely and
--          backfill pass statuses to match refund state
-- Date: 2025-12-05
-- =====================================================

-- Make sure refund triggers can update purchased_passes even with RLS
CREATE OR REPLACE FUNCTION suspend_passes_on_refund_request()
RETURNS TRIGGER AS $$
BEGIN
  -- When a refund request is created, suspend all eligible passes
  IF NEW.status IN ('pending', 'under_review') THEN
    UPDATE purchased_passes
    SET
      status = 'suspended',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{previous_status}',
        to_jsonb(status::text),
        true
      ),
      updated_at = NOW()
    WHERE order_id = NEW.order_id
      AND status IN ('active', 'pending', 'pending_activation');

    RAISE NOTICE 'Suspended passes for order % via refund trigger', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- When refund is rejected, restore passes to their previous status
CREATE OR REPLACE FUNCTION reactivate_passes_on_refund_rejection()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM NEW.status THEN
    UPDATE purchased_passes
    SET
      status = COALESCE((metadata->>'previous_status')::text, 'active'),
      metadata = COALESCE(metadata, '{}'::jsonb) - 'previous_status',
      updated_at = NOW()
    WHERE order_id = NEW.order_id
      AND status = 'suspended';

    RAISE NOTICE 'Reactivated suspended passes for order % after refund rejection', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Recreate triggers to ensure they point at the updated functions
DROP TRIGGER IF EXISTS suspend_passes_on_refund_request_trigger ON refund_requests;
CREATE TRIGGER suspend_passes_on_refund_request_trigger
  AFTER INSERT ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION suspend_passes_on_refund_request();

DROP TRIGGER IF EXISTS reactivate_passes_on_refund_rejection_trigger ON refund_requests;
CREATE TRIGGER reactivate_passes_on_refund_rejection_trigger
  AFTER UPDATE ON refund_requests
  FOR EACH ROW
  WHEN (NEW.status = 'rejected' AND OLD.status != 'rejected')
  EXECUTE FUNCTION reactivate_passes_on_refund_rejection();

-- Backfill: suspend passes for any refunds still in progress/approved
UPDATE purchased_passes pp
SET
  status = 'suspended',
  metadata = jsonb_set(
    COALESCE(pp.metadata, '{}'::jsonb),
    '{previous_status}',
    to_jsonb(pp.status::text),
    true
  ),
  updated_at = NOW()
FROM refund_requests rr
WHERE rr.order_id = pp.order_id
  AND rr.status IN ('pending', 'under_review', 'approved')
  AND pp.status IN ('active', 'pending', 'pending_activation');

-- Backfill: restore suspended passes where the refund was rejected
UPDATE purchased_passes pp
SET
  status = COALESCE((pp.metadata->>'previous_status')::text, 'active'),
  metadata = COALESCE(pp.metadata, '{}'::jsonb) - 'previous_status',
  updated_at = NOW()
FROM refund_requests rr
WHERE rr.order_id = pp.order_id
  AND rr.status = 'rejected'
  AND pp.status = 'suspended';

-- Backfill: completed refunds should cancel any remaining usable passes
UPDATE purchased_passes pp
SET
  status = 'cancelled',
  updated_at = NOW()
FROM refund_requests rr
WHERE rr.order_id = pp.order_id
  AND rr.status = 'completed'
  AND pp.status IN ('active', 'suspended', 'pending', 'pending_activation');

COMMENT ON FUNCTION suspend_passes_on_refund_request() IS 'Suspends passes (and records previous status) when a refund request is opened';
COMMENT ON FUNCTION reactivate_passes_on_refund_rejection() IS 'Restores suspended passes to their previous status when refund is rejected';
