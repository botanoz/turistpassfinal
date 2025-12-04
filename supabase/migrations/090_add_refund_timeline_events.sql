-- =====================================================
-- Migration: Add refund events to order timeline
-- =====================================================
-- Purpose: Automatically create timeline events when refund requests
--          are created, reviewed, approved, rejected, or completed
-- Date: 2025-12-05
-- =====================================================

-- Function to create timeline event for refund request creation
CREATE OR REPLACE FUNCTION create_refund_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
  -- When a new refund request is created
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO order_timeline_events (
      order_id,
      event_type,
      title,
      description,
      metadata,
      actor_type,
      actor_id,
      created_at
    ) VALUES (
      NEW.order_id,
      'refund_requested',
      'Refund Requested',
      'Customer requested a refund for this order',
      jsonb_build_object(
        'refund_request_id', NEW.id,
        'request_number', NEW.request_number,
        'reason_type', NEW.reason_type,
        'requested_amount', NEW.requested_amount
      ),
      'customer',
      NEW.customer_id,
      NEW.created_at
    );
  END IF;

  -- When refund request status changes
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Refund approved
    IF (NEW.status = 'approved' AND OLD.status != 'approved') THEN
      INSERT INTO order_timeline_events (
        order_id,
        event_type,
        title,
        description,
        metadata,
        actor_type,
        actor_id,
        created_at
      ) VALUES (
        NEW.order_id,
        'refund_approved',
        'Refund Approved',
        'Admin approved the refund request',
        jsonb_build_object(
          'refund_request_id', NEW.id,
          'request_number', NEW.request_number,
          'refund_amount', NEW.refund_amount,
          'refund_method', NEW.refund_method
        ),
        'admin',
        NEW.reviewed_by,
        NEW.reviewed_at
      );
    END IF;

    -- Refund rejected
    IF (NEW.status = 'rejected' AND OLD.status != 'rejected') THEN
      INSERT INTO order_timeline_events (
        order_id,
        event_type,
        title,
        description,
        metadata,
        actor_type,
        actor_id,
        created_at
      ) VALUES (
        NEW.order_id,
        'refund_rejected',
        'Refund Rejected',
        COALESCE(NEW.rejection_reason, 'Admin rejected the refund request'),
        jsonb_build_object(
          'refund_request_id', NEW.id,
          'request_number', NEW.request_number,
          'rejection_reason', NEW.rejection_reason
        ),
        'admin',
        NEW.reviewed_by,
        NEW.reviewed_at
      );
    END IF;

    -- Refund completed
    IF (NEW.status = 'completed' AND OLD.status != 'completed') THEN
      INSERT INTO order_timeline_events (
        order_id,
        event_type,
        title,
        description,
        metadata,
        actor_type,
        actor_id,
        created_at
      ) VALUES (
        NEW.order_id,
        'refund_completed',
        'Refund Completed',
        'Refund has been processed and completed',
        jsonb_build_object(
          'refund_request_id', NEW.id,
          'request_number', NEW.request_number,
          'refund_amount', NEW.refund_amount,
          'refund_method', NEW.refund_method
        ),
        'admin',
        NEW.reviewed_by,
        NEW.refund_processed_at
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for refund timeline events
DROP TRIGGER IF EXISTS refund_timeline_trigger ON refund_requests;
CREATE TRIGGER refund_timeline_trigger
  AFTER INSERT OR UPDATE ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION create_refund_timeline_event();

-- Backfill existing refund requests (optional)
-- This creates timeline events for existing refund requests
INSERT INTO order_timeline_events (
  order_id,
  event_type,
  title,
  description,
  metadata,
  actor_type,
  actor_id,
  created_at
)
SELECT
  rr.order_id,
  CASE
    WHEN rr.status = 'pending' THEN 'refund_requested'
    WHEN rr.status = 'under_review' THEN 'refund_requested'
    WHEN rr.status = 'approved' THEN 'refund_approved'
    WHEN rr.status = 'rejected' THEN 'refund_rejected'
    WHEN rr.status = 'completed' THEN 'refund_completed'
    ELSE 'refund_requested'
  END,
  CASE
    WHEN rr.status = 'pending' THEN 'Refund Requested'
    WHEN rr.status = 'under_review' THEN 'Refund Requested'
    WHEN rr.status = 'approved' THEN 'Refund Approved'
    WHEN rr.status = 'rejected' THEN 'Refund Rejected'
    WHEN rr.status = 'completed' THEN 'Refund Completed'
    ELSE 'Refund Requested'
  END,
  CASE
    WHEN rr.status = 'pending' OR rr.status = 'under_review' THEN 'Customer requested a refund for this order'
    WHEN rr.status = 'approved' THEN 'Admin approved the refund request'
    WHEN rr.status = 'rejected' THEN COALESCE(rr.rejection_reason, 'Admin rejected the refund request')
    WHEN rr.status = 'completed' THEN 'Refund has been processed and completed'
    ELSE 'Customer requested a refund for this order'
  END,
  jsonb_build_object(
    'refund_request_id', rr.id,
    'request_number', rr.request_number,
    'reason_type', rr.reason_type,
    'requested_amount', rr.requested_amount,
    'refund_amount', rr.refund_amount,
    'refund_method', rr.refund_method,
    'rejection_reason', rr.rejection_reason
  ),
  CASE
    WHEN rr.status IN ('pending', 'under_review') THEN 'customer'
    ELSE 'admin'
  END,
  CASE
    WHEN rr.status IN ('pending', 'under_review') THEN rr.customer_id
    ELSE rr.reviewed_by
  END,
  CASE
    WHEN rr.status = 'completed' THEN COALESCE(rr.refund_processed_at, rr.reviewed_at, rr.created_at)
    WHEN rr.status IN ('approved', 'rejected') THEN COALESCE(rr.reviewed_at, rr.created_at)
    ELSE rr.created_at
  END
FROM refund_requests rr
WHERE NOT EXISTS (
  -- Don't create duplicates if timeline events already exist
  SELECT 1 FROM order_timeline_events ote
  WHERE ote.order_id = rr.order_id
    AND ote.event_type IN ('refund_requested', 'refund_approved', 'refund_rejected', 'refund_completed')
    AND (ote.metadata->>'refund_request_id')::uuid = rr.id
);

COMMENT ON FUNCTION create_refund_timeline_event() IS 'Automatically creates timeline events for refund request status changes';
COMMENT ON TRIGGER refund_timeline_trigger ON refund_requests IS 'Creates timeline events when refund requests are created or status changes';
