-- =====================================================
-- Migration: Update order trigger to handle suspended passes
-- =====================================================
-- Purpose: When order is refunded/cancelled, also cancel suspended passes
-- Date: 2025-12-04
-- =====================================================

-- Update function to handle suspended passes
CREATE OR REPLACE FUNCTION update_pass_status_on_order_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If order status changed to cancelled or refunded, deactivate passes
  IF (NEW.status = 'cancelled' OR NEW.status = 'refunded')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN

    UPDATE purchased_passes
    SET
      status = 'cancelled',
      updated_at = NOW()
    WHERE order_id = NEW.id
      AND status IN ('active', 'suspended', 'pending', 'pending_activation');  -- Include all non-cancelled statuses

    -- Log in activity_logs if available
    INSERT INTO activity_logs (
      user_type,
      user_id,
      action,
      description,
      category,
      metadata
    ) VALUES (
      'system',
      NEW.customer_id,
      'pass_status_updated',
      'Passes cancelled due to order ' || NEW.status,
      'passes',
      jsonb_build_object(
        'order_id', NEW.id,
        'order_number', NEW.order_number,
        'old_order_status', OLD.status,
        'new_order_status', NEW.status
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- No need to recreate trigger, just updated the function

-- Also update any existing suspended passes from refunded orders
UPDATE purchased_passes pp
SET
  status = 'cancelled',
  updated_at = NOW()
FROM orders o
WHERE pp.order_id = o.id
  AND pp.status = 'suspended'
  AND (o.status = 'cancelled' OR o.status = 'refunded');

COMMENT ON FUNCTION update_pass_status_on_order_change() IS 'Automatically cancels active, suspended, pending, and pending_activation passes when order is cancelled or refunded';
