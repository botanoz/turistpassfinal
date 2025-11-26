-- =====================================================
-- Migration: Contact Messages System
-- =====================================================
-- Purpose: Create contact messages table for customer inquiries
-- Date: 2025-11-25
-- =====================================================

-- ============================================
-- 1. CREATE CONTACT_MESSAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Sender Information
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Customer ID (if logged in)
  customer_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL,

  -- Status
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

  -- Admin Assignment
  assigned_to UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,

  -- Response
  admin_response TEXT,
  responded_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  source TEXT DEFAULT 'website', -- 'website', 'mobile', 'email', etc.

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);
CREATE INDEX IF NOT EXISTS idx_contact_messages_customer ON contact_messages(customer_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_assigned ON contact_messages(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_email ON contact_messages(email);

-- ============================================
-- 3. ENABLE RLS
-- ============================================

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Customers can view their own messages
CREATE POLICY "Customers can view own messages"
  ON contact_messages FOR SELECT
  USING (
    customer_id = auth.uid()
  );

-- Customers can insert their own messages
CREATE POLICY "Customers can insert messages"
  ON contact_messages FOR INSERT
  WITH CHECK (true); -- Anyone can send a contact message

-- Admins can view all messages
CREATE POLICY "Admins can view all messages"
  ON contact_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update messages
CREATE POLICY "Admins can update messages"
  ON contact_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- ============================================
-- 4. CREATE TRIGGER FOR AUTO-UPDATE
-- ============================================

CREATE OR REPLACE FUNCTION update_contact_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_messages_updated_at
  BEFORE UPDATE ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_messages_updated_at();

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Get contact messages stats
CREATE OR REPLACE FUNCTION get_contact_messages_stats()
RETURNS TABLE (
  total_messages BIGINT,
  new_messages BIGINT,
  in_progress_messages BIGINT,
  resolved_messages BIGINT,
  avg_response_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_messages,
    COUNT(*) FILTER (WHERE status = 'new') as new_messages,
    COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_messages,
    COUNT(*) FILTER (WHERE status = 'resolved') as resolved_messages,
    AVG(responded_at - created_at) FILTER (WHERE responded_at IS NOT NULL) as avg_response_time
  FROM contact_messages;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign message to admin
CREATE OR REPLACE FUNCTION assign_contact_message(
  p_message_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE contact_messages
  SET
    assigned_to = p_admin_id,
    assigned_at = NOW(),
    status = CASE WHEN status = 'new' THEN 'in_progress' ELSE status END,
    updated_at = NOW()
  WHERE id = p_message_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin response
CREATE OR REPLACE FUNCTION respond_to_contact_message(
  p_message_id UUID,
  p_admin_id UUID,
  p_response TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE contact_messages
  SET
    admin_response = p_response,
    responded_by = p_admin_id,
    responded_at = NOW(),
    status = 'resolved',
    updated_at = NOW()
  WHERE id = p_message_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. CREATE ADMIN NOTIFICATION TRIGGER
-- ============================================

-- Notify admins when new contact message arrives
CREATE OR REPLACE FUNCTION notify_admins_new_contact_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert notification for all admins with support permission
  INSERT INTO admin_notifications (admin_id, title, message, type, link)
  SELECT
    ap.id,
    'New Contact Message',
    'New message from ' || NEW.name || ': ' || LEFT(NEW.subject, 50),
    'info',
    '/admin/contact-messages?id=' || NEW.id
  FROM admin_profiles ap
  WHERE ap.role = 'super_admin'
     OR (ap.permissions->>'support')::boolean = true;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notify_new_contact_message
  AFTER INSERT ON contact_messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_contact_message();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE contact_messages IS 'Customer contact form submissions and inquiries';
COMMENT ON COLUMN contact_messages.status IS 'Message status: new, in_progress, resolved, closed';
COMMENT ON COLUMN contact_messages.priority IS 'Message priority: low, normal, high, urgent';
COMMENT ON COLUMN contact_messages.customer_id IS 'Linked customer profile if user is logged in';
COMMENT ON FUNCTION get_contact_messages_stats IS 'Get statistics about contact messages';
COMMENT ON FUNCTION assign_contact_message IS 'Assign a contact message to an admin';
COMMENT ON FUNCTION respond_to_contact_message IS 'Add admin response to a contact message';
