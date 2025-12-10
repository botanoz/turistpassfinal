-- =====================================================
-- Migration: Add admin notifications for refund requests
-- =====================================================
-- Purpose: Automatically notify admins when refund requests are created or updated
-- Date: 2025-12-05
-- =====================================================

-- Function to notify admins when new refund request is created
CREATE OR REPLACE FUNCTION notify_admins_new_refund_request()
RETURNS TRIGGER AS $$
DECLARE
  order_number TEXT;
BEGIN
  -- Get order number for the notification message
  SELECT o.order_number INTO order_number
  FROM orders o
  WHERE o.id = NEW.order_id;

  -- Create notification for all admins
  PERFORM create_notification_for_all_admins(
    'New Refund Request',
    'Refund request ' || NEW.request_number || ' created for order #' || COALESCE(order_number, 'N/A'),
    'warning',
    '/admin/refunds'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new refund requests
DROP TRIGGER IF EXISTS trigger_notify_new_refund_request ON refund_requests;
CREATE TRIGGER trigger_notify_new_refund_request
  AFTER INSERT ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_refund_request();

-- Function to notify admins when refund request status changes (optional - for status updates)
CREATE OR REPLACE FUNCTION notify_admins_refund_status_change()
RETURNS TRIGGER AS $$
DECLARE
  order_number TEXT;
  notification_title TEXT;
  notification_message TEXT;
  notification_type TEXT;
BEGIN
  -- Only notify on meaningful status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Get order number
    SELECT o.order_number INTO order_number
    FROM orders o
    WHERE o.id = NEW.order_id;

    -- Determine notification content based on new status
    CASE NEW.status
      WHEN 'under_review' THEN
        notification_title := 'Refund Under Review';
        notification_message := 'Refund ' || NEW.request_number || ' is now under review';
        notification_type := 'info';
      WHEN 'approved' THEN
        notification_title := 'Refund Approved';
        notification_message := 'Refund ' || NEW.request_number || ' has been approved - awaiting completion';
        notification_type := 'info';
      WHEN 'completed' THEN
        notification_title := 'Refund Completed';
        notification_message := 'Refund ' || NEW.request_number || ' has been completed successfully';
        notification_type := 'success';
      ELSE
        -- Don't create notification for rejected status or other statuses
        RETURN NEW;
    END CASE;

    -- Create notification for all admins
    IF notification_title IS NOT NULL THEN
      PERFORM create_notification_for_all_admins(
        notification_title,
        notification_message,
        notification_type,
        '/admin/refunds'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for refund status changes (disabled by default - uncomment if needed)
-- DROP TRIGGER IF EXISTS trigger_notify_refund_status_change ON refund_requests;
-- CREATE TRIGGER trigger_notify_refund_status_change
--   AFTER UPDATE ON refund_requests
--   FOR EACH ROW
--   WHEN (OLD.status IS DISTINCT FROM NEW.status)
--   EXECUTE FUNCTION notify_admins_refund_status_change();

COMMENT ON FUNCTION notify_admins_new_refund_request() IS 'Notifies all admins when a new refund request is created';
COMMENT ON FUNCTION notify_admins_refund_status_change() IS 'Notifies all admins when refund request status changes (trigger disabled by default)';
