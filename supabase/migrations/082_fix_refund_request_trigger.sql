-- Migration: Fix refund request notification trigger
-- Description: Fix the is_active column reference in refund notification trigger
-- Date: 2025-12-02

-- Drop and recreate the notify_admins_new_refund function without is_active check
CREATE OR REPLACE FUNCTION notify_admins_new_refund()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Create notification for all admins with orders permission
  FOR admin_record IN
    SELECT id FROM admin_profiles
    WHERE (permissions->>'orders' = 'true' OR role = 'super_admin')
    -- Removed is_active check as the column may not exist
  LOOP
    INSERT INTO admin_notifications (admin_id, type, title, message, metadata)
    VALUES (
      admin_record.id,
      'warning',
      'New Refund Request',
      format('New refund request %s for order %s', NEW.request_number,
        (SELECT order_number FROM orders WHERE id = NEW.order_id)),
      jsonb_build_object('refund_request_id', NEW.id, 'order_id', NEW.order_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate the notify_admins_new_ticket function without is_active check
CREATE OR REPLACE FUNCTION notify_admins_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Create notification for all admins with support permission
  FOR admin_record IN
    SELECT id FROM admin_profiles
    WHERE (permissions->>'support' = 'true' OR role = 'super_admin')
    -- Removed is_active check as the column may not exist
  LOOP
    INSERT INTO admin_notifications (admin_id, type, title, message, metadata)
    VALUES (
      admin_record.id,
      'info',
      'New Support Ticket',
      format('New ticket %s: %s', NEW.ticket_number, NEW.subject),
      jsonb_build_object('ticket_id', NEW.id, 'order_id', NEW.order_id)
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Verify triggers exist (they should already exist from migration 066)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'notify_admins_new_refund_trigger'
  ) THEN
    CREATE TRIGGER notify_admins_new_refund_trigger
      AFTER INSERT ON refund_requests
      FOR EACH ROW
      EXECUTE FUNCTION notify_admins_new_refund();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'notify_admins_new_ticket_trigger'
  ) THEN
    CREATE TRIGGER notify_admins_new_ticket_trigger
      AFTER INSERT ON order_support_tickets
      FOR EACH ROW
      EXECUTE FUNCTION notify_admins_new_ticket();
  END IF;
END $$;

-- Add comment
COMMENT ON FUNCTION notify_admins_new_refund() IS 'Notify admins when new refund request is created (fixed version without is_active check)';
COMMENT ON FUNCTION notify_admins_new_ticket() IS 'Notify admins when new support ticket is created (fixed version without is_active check)';
