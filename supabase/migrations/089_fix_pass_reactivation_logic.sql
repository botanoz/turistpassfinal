-- =====================================================
-- Migration: Fix pass reactivation logic to restore original status
-- =====================================================
-- Purpose: When refund is rejected, passes should return to their
--          original status (pending_activation or active), not always 'active'
-- Date: 2025-12-04
-- =====================================================

-- Update suspend function to store previous status in metadata
CREATE OR REPLACE FUNCTION suspend_passes_on_refund_request()
RETURNS TRIGGER AS $$
BEGIN
  -- When a refund request is created, suspend all active/pending/pending_activation passes for that order
  -- and store their previous status in metadata
  IF (NEW.status = 'pending' OR NEW.status = 'under_review') AND OLD.id IS NULL THEN
    UPDATE purchased_passes
    SET
      status = 'suspended',
      metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{previous_status}',
        to_jsonb(status::text)
      ),
      updated_at = NOW()
    WHERE order_id = NEW.order_id
      AND status IN ('active', 'pending', 'pending_activation');

    RAISE NOTICE 'Suspended passes for order % and stored previous status', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update reactivate function to restore previous status from metadata
CREATE OR REPLACE FUNCTION reactivate_passes_on_refund_rejection()
RETURNS TRIGGER AS $$
DECLARE
  pass_record RECORD;
BEGIN
  -- When a refund request is rejected, restore passes to their previous status
  IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN

    -- Restore each pass to its previous status stored in metadata
    FOR pass_record IN
      SELECT id, status, metadata
      FROM purchased_passes
      WHERE order_id = NEW.order_id
        AND status = 'suspended'
    LOOP
      UPDATE purchased_passes
      SET
        status = COALESCE(
          (pass_record.metadata->>'previous_status')::text,
          'active'  -- Fallback to active if no previous status found
        ),
        updated_at = NOW()
      WHERE id = pass_record.id;
    END LOOP;

    RAISE NOTICE 'Reactivated passes for order % to their previous status', NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing suspended passes with previous_status metadata
-- (assuming they were all 'active' or 'pending_activation' before suspension)
UPDATE purchased_passes
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{previous_status}',
  CASE
    WHEN activation_date IS NULL THEN '"pending_activation"'::jsonb
    ELSE '"active"'::jsonb
  END
)
WHERE status = 'suspended'
  AND (metadata IS NULL OR NOT (metadata ? 'previous_status'));

COMMENT ON FUNCTION suspend_passes_on_refund_request() IS 'Suspends passes when refund request is created and stores their previous status in metadata for restoration';
COMMENT ON FUNCTION reactivate_passes_on_refund_rejection() IS 'Restores passes to their original status (from metadata) when refund request is rejected';
