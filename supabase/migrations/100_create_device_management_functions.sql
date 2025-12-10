-- =====================================================
-- MIGRATION: Create Device Management Functions
-- Description: Database functions for device tracking and security
-- Date: 2025-12-10
-- =====================================================

-- ============================================
-- 1. FUNCTION: register_device
-- Description: Registers or updates a device, enforces 2-device limit
-- ============================================

CREATE OR REPLACE FUNCTION register_device(
  p_customer_id UUID,
  p_device_fingerprint TEXT,
  p_device_type TEXT,
  p_os_name TEXT,
  p_os_version TEXT,
  p_browser_name TEXT,
  p_browser_version TEXT,
  p_ip_address TEXT,
  p_country TEXT,
  p_city TEXT,
  p_session_id TEXT,
  p_user_agent TEXT
)
RETURNS TABLE (
  device_id UUID,
  should_logout_others BOOLEAN,
  devices_to_logout UUID[]
) AS $$
DECLARE
  v_device_id UUID;
  v_fingerprint_hash TEXT;
  v_active_count INT;
  v_max_limit INT;
  v_devices_to_logout UUID[];
  v_device_name TEXT;
BEGIN
  -- Generate fingerprint hash (SHA-256)
  v_fingerprint_hash := encode(digest(p_device_fingerprint || p_customer_id::TEXT, 'sha256'), 'hex');

  -- Create device name
  v_device_name := p_browser_name || ' on ' || p_os_name;

  -- Check if device already exists
  SELECT id INTO v_device_id
  FROM user_devices
  WHERE customer_id = p_customer_id
    AND device_fingerprint_hash = v_fingerprint_hash;

  IF v_device_id IS NOT NULL THEN
    -- Update existing device
    UPDATE user_devices
    SET
      session_id = p_session_id,
      last_active_at = NOW(),
      ip_address = p_ip_address::INET,
      country = p_country,
      city = p_city,
      status = 'active',
      operation_count = operation_count + 1,
      updated_at = NOW()
    WHERE id = v_device_id;

    -- Log login event
    INSERT INTO device_login_events (
      customer_id, device_id, event_type, ip_address, user_agent, country, city
    ) VALUES (
      p_customer_id, v_device_id, 'login', p_ip_address::INET, p_user_agent, p_country, p_city
    );

    RETURN QUERY SELECT v_device_id, false, ARRAY[]::UUID[];
    RETURN;
  END IF;

  -- Get customer's device limit
  SELECT max_device_limit INTO v_max_limit
  FROM customer_profiles
  WHERE id = p_customer_id;

  -- Default to 2 if not set
  IF v_max_limit IS NULL THEN
    v_max_limit := 2;
  END IF;

  -- Count active devices
  SELECT COUNT(*) INTO v_active_count
  FROM user_devices
  WHERE customer_id = p_customer_id
    AND status = 'active';

  -- If limit exceeded, logout oldest devices
  IF v_active_count >= v_max_limit THEN
    -- Get devices to logout (oldest first, exclude trusted devices)
    SELECT ARRAY_AGG(id) INTO v_devices_to_logout
    FROM (
      SELECT id
      FROM user_devices
      WHERE customer_id = p_customer_id
        AND status = 'active'
        AND is_trusted = false
      ORDER BY last_active_at ASC
      LIMIT (v_active_count - v_max_limit + 1)
    ) old_devices;

    -- Mark devices as inactive
    UPDATE user_devices
    SET
      status = 'inactive',
      session_id = NULL,
      updated_at = NOW()
    WHERE id = ANY(v_devices_to_logout);

    -- Log auto-logout events
    INSERT INTO device_login_events (customer_id, device_id, event_type, event_reason)
    SELECT
      p_customer_id,
      id,
      'auto_logout',
      'device_limit_exceeded'
    FROM UNNEST(v_devices_to_logout) AS id;
  END IF;

  -- Insert new device
  INSERT INTO user_devices (
    customer_id,
    device_fingerprint,
    device_fingerprint_hash,
    device_name,
    device_type,
    os_name,
    os_version,
    browser_name,
    browser_version,
    ip_address,
    country,
    city,
    session_id,
    status
  ) VALUES (
    p_customer_id,
    p_device_fingerprint,
    v_fingerprint_hash,
    v_device_name,
    p_device_type,
    p_os_name,
    p_os_version,
    p_browser_name,
    p_browser_version,
    p_ip_address::INET,
    p_country,
    p_city,
    p_session_id,
    'active'
  )
  RETURNING id INTO v_device_id;

  -- Log login event
  INSERT INTO device_login_events (
    customer_id, device_id, event_type, ip_address, user_agent, country, city
  ) VALUES (
    p_customer_id, v_device_id, 'login', p_ip_address::INET, p_user_agent, p_country, p_city
  );

  -- Update active device count
  UPDATE customer_profiles
  SET active_device_count = (
    SELECT COUNT(*) FROM user_devices
    WHERE customer_id = p_customer_id AND status = 'active'
  )
  WHERE id = p_customer_id;

  RETURN QUERY SELECT
    v_device_id,
    (v_devices_to_logout IS NOT NULL AND array_length(v_devices_to_logout, 1) > 0),
    COALESCE(v_devices_to_logout, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION register_device TO authenticated;

COMMENT ON FUNCTION register_device IS 'Registers or updates a device, enforces 2-device limit with auto-logout';

-- ============================================
-- 2. FUNCTION: check_suspicious_activity
-- Description: Detects suspicious login patterns
-- ============================================

CREATE OR REPLACE FUNCTION check_suspicious_activity(p_customer_id UUID)
RETURNS VOID AS $$
DECLARE
  v_recent_countries TEXT[];
  v_country_count INT;
  v_device_switches INT;
BEGIN
  -- Check 1: Multiple countries in last hour
  SELECT ARRAY_AGG(DISTINCT country) INTO v_recent_countries
  FROM user_devices
  WHERE customer_id = p_customer_id
    AND status = 'active'
    AND last_active_at > NOW() - INTERVAL '1 hour'
    AND country IS NOT NULL
    AND country != '';

  v_country_count := array_length(v_recent_countries, 1);

  IF v_country_count > 1 THEN
    -- Insert alert if not already exists
    INSERT INTO suspicious_activity_alerts (
      customer_id,
      alert_type,
      severity,
      description,
      metadata
    ) VALUES (
      p_customer_id,
      'multi_country_login',
      'high',
      'Kullanıcı ' || v_country_count || ' farklı ülkeden giriş yaptı',
      jsonb_build_object('countries', v_recent_countries, 'timestamp', NOW())
    )
    ON CONFLICT DO NOTHING;

    -- Create admin notification
    PERFORM create_notification_for_all_admins(
      'Şüpheli Aktivite Tespit Edildi',
      'Kullanıcı birden fazla ülkeden eş zamanlı giriş yaptı',
      'warning',
      '/admin/customers?alert=' || p_customer_id::TEXT
    );
  END IF;

  -- Check 2: Rapid device switches (2+ in one day)
  SELECT COUNT(DISTINCT device_id) INTO v_device_switches
  FROM device_login_events
  WHERE customer_id = p_customer_id
    AND event_type = 'login'
    AND created_at > NOW() - INTERVAL '1 day';

  IF v_device_switches >= 2 THEN
    -- Insert alert
    INSERT INTO suspicious_activity_alerts (
      customer_id,
      alert_type,
      severity,
      description,
      metadata
    ) VALUES (
      p_customer_id,
      'rapid_device_switch',
      'medium',
      'Kullanıcı bir günde ' || v_device_switches || ' kez cihaz değiştirdi',
      jsonb_build_object('switch_count', v_device_switches, 'timestamp', NOW())
    )
    ON CONFLICT DO NOTHING;

    -- Create admin notification
    PERFORM create_notification_for_all_admins(
      'Hızlı Cihaz Değişimi Tespit Edildi',
      'Kullanıcı kısa sürede birden fazla cihaz değiştirdi',
      'warning',
      '/admin/customers?alert=' || p_customer_id::TEXT
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION check_suspicious_activity TO authenticated;

COMMENT ON FUNCTION check_suspicious_activity IS 'Detects suspicious login patterns and creates admin alerts';

-- ============================================
-- 3. FUNCTION: force_logout_device
-- Description: Admin function to force logout a device
-- ============================================

CREATE OR REPLACE FUNCTION force_logout_device(
  p_device_id UUID,
  p_admin_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  -- Get customer ID
  SELECT customer_id INTO v_customer_id
  FROM user_devices
  WHERE id = p_device_id;

  IF v_customer_id IS NULL THEN
    RETURN false;
  END IF;

  -- Update device status
  UPDATE user_devices
  SET
    status = 'inactive',
    session_id = NULL,
    updated_at = NOW()
  WHERE id = p_device_id;

  -- Log event
  INSERT INTO device_login_events (
    customer_id,
    device_id,
    event_type,
    event_reason,
    metadata
  ) VALUES (
    v_customer_id,
    p_device_id,
    'logout',
    'admin_forced_logout',
    jsonb_build_object('admin_id', p_admin_id, 'timestamp', NOW())
  );

  -- Update active device count
  UPDATE customer_profiles
  SET active_device_count = (
    SELECT COUNT(*) FROM user_devices
    WHERE customer_id = v_customer_id AND status = 'active'
  )
  WHERE id = v_customer_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION force_logout_device TO authenticated;

COMMENT ON FUNCTION force_logout_device IS 'Admin function to force logout a specific device';

-- ============================================
-- 4. FUNCTION: get_customer_devices
-- Description: Returns detailed device information for a customer
-- ============================================

CREATE OR REPLACE FUNCTION get_customer_devices(p_customer_id UUID)
RETURNS TABLE (
  device_id UUID,
  device_name TEXT,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  last_active TIMESTAMPTZ,
  first_login TIMESTAMPTZ,
  ip_address TEXT,
  location TEXT,
  status TEXT,
  operation_count INT,
  is_trusted BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ud.id AS device_id,
    ud.device_name,
    ud.device_type,
    (ud.os_name || CASE WHEN ud.os_version IS NOT NULL AND ud.os_version != '' THEN ' ' || ud.os_version ELSE '' END) AS os,
    (ud.browser_name || CASE WHEN ud.browser_version IS NOT NULL AND ud.browser_version != '' THEN ' ' || ud.browser_version ELSE '' END) AS browser,
    ud.last_active_at AS last_active,
    ud.first_login_at AS first_login,
    CASE WHEN ud.ip_address IS NOT NULL THEN host(ud.ip_address)::TEXT ELSE '' END AS ip_address,
    (COALESCE(ud.city, '') || CASE WHEN ud.city IS NOT NULL AND ud.city != '' AND ud.country IS NOT NULL AND ud.country != '' THEN ', ' ELSE '' END || COALESCE(ud.country, '')) AS location,
    ud.status,
    ud.operation_count,
    ud.is_trusted
  FROM user_devices ud
  WHERE ud.customer_id = p_customer_id
  ORDER BY ud.last_active_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_customer_devices TO authenticated;

COMMENT ON FUNCTION get_customer_devices IS 'Returns formatted device information for a customer';

-- ============================================
-- 5. TRIGGER: Check suspicious activity after login
-- ============================================

CREATE OR REPLACE FUNCTION trigger_check_suspicious_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Run suspicious activity check asynchronously
  PERFORM check_suspicious_activity(NEW.customer_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS after_device_login_check_suspicious ON device_login_events;

CREATE TRIGGER after_device_login_check_suspicious
  AFTER INSERT ON device_login_events
  FOR EACH ROW
  WHEN (NEW.event_type = 'login')
  EXECUTE FUNCTION trigger_check_suspicious_activity();

-- Grant execute permission
GRANT EXECUTE ON FUNCTION trigger_check_suspicious_activity TO authenticated;

COMMENT ON FUNCTION trigger_check_suspicious_activity IS 'Trigger function to check for suspicious activity after device login';
