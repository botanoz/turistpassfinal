-- =====================================================
-- MIGRATION: Create Admin Notifications System
-- Description: Creates admin_notifications table for real-time notifications
-- Date: 2025-11-17
-- =====================================================

-- 1) Create admin_notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);

-- 3) Enable RLS
ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- 4) RLS Policies
CREATE POLICY "Admins can view their own notifications"
  ON admin_notifications FOR SELECT
  USING (admin_id = auth.uid());

CREATE POLICY "Admins can update their own notifications"
  ON admin_notifications FOR UPDATE
  USING (admin_id = auth.uid())
  WITH CHECK (admin_id = auth.uid());

CREATE POLICY "System can insert notifications for any admin"
  ON admin_notifications FOR INSERT
  WITH CHECK (true);

-- 5) Updated_at trigger
CREATE OR REPLACE FUNCTION update_admin_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_admin_notifications_updated_at
  BEFORE UPDATE ON admin_notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_notifications_updated_at();

-- 6) Function to create notification for all admins
CREATE OR REPLACE FUNCTION create_notification_for_all_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT,
  p_link TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO admin_notifications (admin_id, title, message, type, link)
  SELECT id, p_title, p_message, p_type, p_link
  FROM admin_profiles
  WHERE role IN ('super_admin', 'admin', 'support');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7) Trigger to create notification when new support ticket is created
CREATE OR REPLACE FUNCTION notify_admins_new_support_ticket()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification_for_all_admins(
    'New Support Ticket',
    'A new support ticket has been created: ' || NEW.subject,
    'info',
    '/admin/support'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_support_ticket ON support_tickets;
CREATE TRIGGER trigger_notify_new_support_ticket
  AFTER INSERT ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_support_ticket();

-- 8) Trigger to create notification when new order is placed
CREATE OR REPLACE FUNCTION notify_admins_new_order()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM create_notification_for_all_admins(
    'New Order',
    'Order #' || NEW.id::TEXT || ' has been placed',
    'success',
    '/admin/orders'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_new_order ON orders;
CREATE TRIGGER trigger_notify_new_order
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_order();

-- 9) Trigger to create notification when business status changes to pending
CREATE OR REPLACE FUNCTION notify_admins_business_pending()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'pending' AND (OLD.status IS NULL OR OLD.status != 'pending') THEN
    PERFORM create_notification_for_all_admins(
      'Business Application Pending',
      'Business "' || NEW.name || '" is pending review',
      'warning',
      '/admin/businesses'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_business_pending ON businesses;
CREATE TRIGGER trigger_notify_business_pending
  AFTER INSERT OR UPDATE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_business_pending();

GRANT EXECUTE ON FUNCTION create_notification_for_all_admins TO authenticated;
