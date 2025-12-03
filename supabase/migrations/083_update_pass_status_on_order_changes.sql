-- Migration: Update pass status when order is cancelled or refunded
-- This ensures that Active Passes count only includes truly active passes

-- Function to update purchased_passes status when order status changes
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
      AND status = 'active';  -- Only update active passes

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

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_update_pass_status_on_order_change ON orders;

-- Create trigger on orders table
CREATE TRIGGER trigger_update_pass_status_on_order_change
  AFTER UPDATE OF status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_pass_status_on_order_change();

-- Also update passes for any existing cancelled/refunded orders that have active passes
UPDATE purchased_passes pp
SET
  status = 'cancelled',
  updated_at = NOW()
FROM orders o
WHERE pp.order_id = o.id
  AND pp.status = 'active'
  AND (o.status = 'cancelled' OR o.status = 'refunded');

-- Log this cleanup
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
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
      'pass_status_cleanup',
      'Cleaned up ' || updated_count || ' active passes from cancelled/refunded orders',
      'passes',
      jsonb_build_object('passes_updated', updated_count)
    );
  END IF;
END $$;
