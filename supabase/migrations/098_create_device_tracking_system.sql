-- =====================================================
-- MIGRATION: Create Device Tracking System
-- Description: Creates device tracking and security monitoring system
-- Date: 2025-12-10
-- =====================================================

-- ============================================
-- 1. CREATE user_devices TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  -- Cihaz Tanımlama
  device_fingerprint TEXT NOT NULL,
  device_fingerprint_hash TEXT NOT NULL,
  device_name TEXT,

  -- Cihaz Detayları
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop')) NOT NULL,
  os_name TEXT,
  os_version TEXT,
  browser_name TEXT,
  browser_version TEXT,

  -- Konum
  ip_address INET,
  country TEXT,
  city TEXT,

  -- Session Yönetimi
  session_id TEXT,
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  first_login_at TIMESTAMPTZ DEFAULT NOW(),

  -- Durum
  status TEXT CHECK (status IN ('active', 'inactive', 'blocked')) DEFAULT 'active',
  is_trusted BOOLEAN DEFAULT false,
  operation_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(customer_id, device_fingerprint_hash)
);

-- Indexes for performance
CREATE INDEX idx_user_devices_customer ON user_devices(customer_id);
CREATE INDEX idx_user_devices_fingerprint ON user_devices(device_fingerprint_hash);
CREATE INDEX idx_user_devices_session ON user_devices(session_id);
CREATE INDEX idx_user_devices_status ON user_devices(status);
CREATE INDEX idx_user_devices_last_active ON user_devices(last_active_at DESC);
CREATE INDEX idx_user_devices_ip ON user_devices(ip_address);

-- Comments
COMMENT ON TABLE user_devices IS 'Tracks user devices for security and session management';
COMMENT ON COLUMN user_devices.device_fingerprint IS 'Browser fingerprint ID';
COMMENT ON COLUMN user_devices.device_fingerprint_hash IS 'SHA-256 hash for uniqueness checks';
COMMENT ON COLUMN user_devices.operation_count IS 'Number of operations performed on this device';

-- ============================================
-- 2. CREATE device_login_events TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS device_login_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  device_id UUID REFERENCES user_devices(id) ON DELETE SET NULL,

  event_type TEXT CHECK (event_type IN ('login', 'logout', 'auto_logout', 'blocked')) NOT NULL,
  event_reason TEXT,

  ip_address INET,
  user_agent TEXT,
  country TEXT,
  city TEXT,

  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_device_login_events_customer ON device_login_events(customer_id);
CREATE INDEX idx_device_login_events_device ON device_login_events(device_id);
CREATE INDEX idx_device_login_events_type ON device_login_events(event_type);
CREATE INDEX idx_device_login_events_created ON device_login_events(created_at DESC);

-- Comments
COMMENT ON TABLE device_login_events IS 'Historical record of device login/logout events';
COMMENT ON COLUMN device_login_events.event_type IS 'Type of event: login, logout, auto_logout, blocked';

-- ============================================
-- 3. CREATE suspicious_activity_alerts TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS suspicious_activity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,

  alert_type TEXT CHECK (alert_type IN ('multi_country_login', 'rapid_device_switch')) NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high')) DEFAULT 'medium',
  description TEXT NOT NULL,

  metadata JSONB DEFAULT '{}'::jsonb,

  status TEXT CHECK (status IN ('pending', 'reviewed', 'dismissed')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_suspicious_alerts_customer ON suspicious_activity_alerts(customer_id);
CREATE INDEX idx_suspicious_alerts_type ON suspicious_activity_alerts(alert_type);
CREATE INDEX idx_suspicious_alerts_severity ON suspicious_activity_alerts(severity);
CREATE INDEX idx_suspicious_alerts_status ON suspicious_activity_alerts(status);
CREATE INDEX idx_suspicious_alerts_created ON suspicious_activity_alerts(created_at DESC);

-- Comments
COMMENT ON TABLE suspicious_activity_alerts IS 'Security alerts for suspicious user activity';
COMMENT ON COLUMN suspicious_activity_alerts.alert_type IS 'Type: multi_country_login, rapid_device_switch';

-- ============================================
-- 4. ENABLE RLS (Row Level Security)
-- ============================================

-- user_devices RLS
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- Customers can view their own devices
CREATE POLICY "Customers can view own devices"
  ON user_devices FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can update their own devices (limited)
CREATE POLICY "Customers can update own devices"
  ON user_devices FOR UPDATE
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

-- Admins can view all devices
CREATE POLICY "Admins can view all devices"
  ON user_devices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update devices
CREATE POLICY "Admins can update devices"
  ON user_devices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- System can insert devices (via service role in register_device function)
CREATE POLICY "System can insert devices"
  ON user_devices FOR INSERT
  WITH CHECK (true);

-- device_login_events RLS
ALTER TABLE device_login_events ENABLE ROW LEVEL SECURITY;

-- Customers can view their own login events
CREATE POLICY "Customers can view own login events"
  ON device_login_events FOR SELECT
  USING (customer_id = auth.uid());

-- System can insert login events
CREATE POLICY "System can insert login events"
  ON device_login_events FOR INSERT
  WITH CHECK (true);

-- Admins can view all login events
CREATE POLICY "Admins can view all login events"
  ON device_login_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- suspicious_activity_alerts RLS
ALTER TABLE suspicious_activity_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all alerts
CREATE POLICY "Admins can view all alerts"
  ON suspicious_activity_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Admins can update alerts
CREATE POLICY "Admins can update alerts"
  ON suspicious_activity_alerts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- System can create alerts
CREATE POLICY "System can create alerts"
  ON suspicious_activity_alerts FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 5. UPDATED_AT TRIGGER
-- ============================================

-- Create trigger function for user_devices
CREATE OR REPLACE FUNCTION update_user_devices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_devices_updated_at
  BEFORE UPDATE ON user_devices
  FOR EACH ROW
  EXECUTE FUNCTION update_user_devices_updated_at();

-- Create trigger function for suspicious_activity_alerts
CREATE OR REPLACE FUNCTION update_suspicious_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_suspicious_alerts_updated_at
  BEFORE UPDATE ON suspicious_activity_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_suspicious_alerts_updated_at();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_user_devices_updated_at TO authenticated;
GRANT EXECUTE ON FUNCTION update_suspicious_alerts_updated_at TO authenticated;
