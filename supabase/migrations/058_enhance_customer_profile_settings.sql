-- =====================================================
-- Enhanced Customer Profile Settings
-- =====================================================
-- Description: Add profile settings and security features
-- Date: 2025-01-25
-- =====================================================

-- ============================================
-- 1. ENHANCE CUSTOMER_PROFILES TABLE
-- ============================================

-- Add new columns for enhanced profile management
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS language_preference TEXT DEFAULT 'tr' CHECK (language_preference IN ('tr', 'en', 'de', 'fr', 'es', 'ar', 'ru')),
ADD COLUMN IF NOT EXISTS currency_preference TEXT DEFAULT 'TRY' CHECK (currency_preference IN ('TRY', 'USD', 'EUR', 'GBP')),
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Istanbul',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS account_status TEXT CHECK (account_status IN ('active', 'suspended', 'deleted')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_password_change_at TIMESTAMPTZ;

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_customer_profiles_account_status ON customer_profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_email_verified ON customer_profiles(email_verified);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_last_login ON customer_profiles(last_login_at DESC);

-- ============================================
-- 2. PROFILE CHANGE LOG TABLE
-- ============================================
-- Track all profile changes for security and audit

CREATE TABLE IF NOT EXISTS customer_profile_changelog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Change Details
  field_changed TEXT NOT NULL, -- e.g., 'email', 'phone', 'password'
  old_value TEXT, -- Encrypted or hashed if sensitive
  new_value TEXT, -- Encrypted or hashed if sensitive
  change_type TEXT CHECK (change_type IN ('update', 'verify', 'security')) NOT NULL,

  -- Context
  ip_address INET,
  user_agent TEXT,
  change_reason TEXT,

  -- Admin action tracking
  changed_by_admin UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profile_changelog_customer ON customer_profile_changelog(customer_id);
CREATE INDEX IF NOT EXISTS idx_profile_changelog_field ON customer_profile_changelog(field_changed);
CREATE INDEX IF NOT EXISTS idx_profile_changelog_created ON customer_profile_changelog(created_at DESC);

-- RLS
ALTER TABLE customer_profile_changelog ENABLE ROW LEVEL SECURITY;

-- Customers can view their own change history
CREATE POLICY "Customers can view own changelog"
  ON customer_profile_changelog FOR SELECT
  USING (customer_id = auth.uid());

-- Admins can view all changelogs
CREATE POLICY "Admins can view all changelogs"
  ON customer_profile_changelog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- System can insert changelog entries
CREATE POLICY "System can insert changelog"
  ON customer_profile_changelog FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 3. PASSWORD RESET TOKENS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Token
  token TEXT UNIQUE NOT NULL,
  token_hash TEXT NOT NULL, -- Hashed version for security

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  -- Security
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_password_reset_customer ON password_reset_tokens(customer_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_expires ON password_reset_tokens(expires_at);

-- Auto-cleanup expired tokens (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM password_reset_tokens
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- No direct access - only through functions
CREATE POLICY "No direct access to reset tokens"
  ON password_reset_tokens FOR ALL
  USING (false);

-- ============================================
-- 4. EMAIL CHANGE REQUESTS TABLE
-- ============================================
-- Handle email changes with verification

CREATE TABLE IF NOT EXISTS email_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Email Change
  current_email TEXT NOT NULL,
  new_email TEXT NOT NULL,

  -- Verification
  verification_token TEXT UNIQUE NOT NULL,
  token_hash TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,

  -- Expiry
  expires_at TIMESTAMPTZ NOT NULL,

  -- Security
  ip_address INET,
  user_agent TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_change_customer ON email_change_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_change_token ON email_change_requests(token_hash);
CREATE INDEX IF NOT EXISTS idx_email_change_verified ON email_change_requests(verified);

-- RLS
ALTER TABLE email_change_requests ENABLE ROW LEVEL SECURITY;

-- Customers can view their own email change requests
CREATE POLICY "Customers can view own email changes"
  ON email_change_requests FOR SELECT
  USING (customer_id = auth.uid());

-- System can manage email change requests
CREATE POLICY "System can manage email changes"
  ON email_change_requests FOR ALL
  WITH CHECK (true);

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Update last login timestamp
CREATE OR REPLACE FUNCTION update_last_login(customer_uuid UUID)
RETURNS void AS $$
BEGIN
  UPDATE customer_profiles
  SET last_login_at = NOW()
  WHERE id = customer_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log profile change
CREATE OR REPLACE FUNCTION log_profile_change(
  customer_uuid UUID,
  field TEXT,
  old_val TEXT,
  new_val TEXT,
  change_type_val TEXT DEFAULT 'update',
  ip TEXT DEFAULT NULL,
  agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO customer_profile_changelog (
    customer_id,
    field_changed,
    old_value,
    new_value,
    change_type,
    ip_address,
    user_agent
  ) VALUES (
    customer_uuid,
    field,
    old_val,
    new_val,
    change_type_val,
    ip::INET,
    agent
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer profile with statistics
CREATE OR REPLACE FUNCTION get_customer_profile_full(customer_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', row_to_json(cp.*),
    'stats', (
      SELECT json_build_object(
        'total_orders', COUNT(DISTINCT o.id),
        'total_spent', COALESCE(SUM(o.total_amount) FILTER (WHERE o.payment_status = 'completed'), 0),
        'active_passes', COUNT(DISTINCT pp.id) FILTER (WHERE pp.status = 'active'),
        'total_visits', COUNT(DISTINCT vv.id),
        'member_since_days', EXTRACT(DAY FROM NOW() - cp.created_at)
      )
      FROM customer_profiles cp2
      LEFT JOIN orders o ON o.customer_id = cp2.id
      LEFT JOIN purchased_passes pp ON pp.customer_id = cp2.id
      LEFT JOIN venue_visits vv ON vv.customer_id = cp2.id
      WHERE cp2.id = customer_uuid
    ),
    'preferences', (
      SELECT row_to_json(np.*)
      FROM notification_preferences np
      WHERE np.customer_id = customer_uuid
    )
  ) INTO result
  FROM customer_profiles cp
  WHERE cp.id = customer_uuid;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if email is available for change
CREATE OR REPLACE FUNCTION is_email_available(new_email_val TEXT, current_customer_uuid UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  email_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM customer_profiles
    WHERE email = new_email_val
      AND (current_customer_uuid IS NULL OR id != current_customer_uuid)
  ) INTO email_exists;

  RETURN NOT email_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get recent profile activity
CREATE OR REPLACE FUNCTION get_profile_activity(customer_uuid UUID, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  activity_type TEXT,
  description TEXT,
  timestamp TIMESTAMPTZ,
  metadata JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'profile_change'::TEXT as activity_type,
    'Changed ' || field_changed as description,
    created_at as timestamp,
    json_build_object(
      'field', field_changed,
      'change_type', change_type
    )::jsonb as metadata
  FROM customer_profile_changelog
  WHERE customer_id = customer_uuid
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER FOR PASSWORD CHANGE LOGGING
-- ============================================

CREATE OR REPLACE FUNCTION log_password_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last password change timestamp
  NEW.last_password_change_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger would be on auth.users table, but we can't directly modify it
-- Instead, we'll handle this through the application layer

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE customer_profile_changelog IS 'Audit log of all customer profile changes';
COMMENT ON TABLE password_reset_tokens IS 'Temporary tokens for password reset flow';
COMMENT ON TABLE email_change_requests IS 'Pending email change requests with verification';
COMMENT ON FUNCTION update_last_login IS 'Update customer last login timestamp';
COMMENT ON FUNCTION log_profile_change IS 'Log a profile field change for audit trail';
COMMENT ON FUNCTION get_customer_profile_full IS 'Get complete customer profile with stats and preferences';
COMMENT ON FUNCTION is_email_available IS 'Check if an email address is available for use';
COMMENT ON FUNCTION get_profile_activity IS 'Get recent profile activity for a customer';
