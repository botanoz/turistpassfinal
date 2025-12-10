-- =====================================================
-- Migration: Add refund_rejected to order timeline event types
-- =====================================================
-- Purpose: Fix constraint violation when creating refund_rejected timeline events
-- Date: 2025-12-05
-- =====================================================

-- Drop existing constraint
ALTER TABLE order_timeline_events
  DROP CONSTRAINT IF EXISTS order_timeline_events_event_type_check;

-- Add updated constraint with refund_rejected
ALTER TABLE order_timeline_events
  ADD CONSTRAINT order_timeline_events_event_type_check
  CHECK (event_type IN (
    'order_created',
    'payment_pending',
    'payment_completed',
    'payment_failed',
    'order_confirmed',
    'pass_generated',
    'pass_delivered',
    'pass_activated',
    'first_usage',
    'order_completed',
    'order_cancelled',
    'refund_requested',
    'refund_approved',
    'refund_rejected',
    'refund_completed',
    'note_added'
  ));

COMMENT ON CONSTRAINT order_timeline_events_event_type_check ON order_timeline_events IS 'Valid event types including all refund statuses';
