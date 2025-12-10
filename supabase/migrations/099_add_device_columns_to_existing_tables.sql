-- =====================================================
-- MIGRATION: Add Device Tracking Columns to Existing Tables
-- Description: Enhances existing tables with device tracking fields
-- Date: 2025-12-10
-- =====================================================

-- ============================================
-- 1. ENHANCE customer_profiles TABLE
-- ============================================

-- Add device limit columns
ALTER TABLE customer_profiles
ADD COLUMN IF NOT EXISTS active_device_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_device_limit INT DEFAULT 2;

-- Create index for device limit enforcement
CREATE INDEX IF NOT EXISTS idx_customer_profiles_device_limit ON customer_profiles(max_device_limit);

-- Comments
COMMENT ON COLUMN customer_profiles.active_device_count IS 'Cached count of active devices (updated via triggers)';
COMMENT ON COLUMN customer_profiles.max_device_limit IS 'Maximum number of concurrent devices allowed (default: 2)';

-- ============================================
-- 2. ENHANCE activity_logs TABLE
-- ============================================

-- Add device reference to activity logs
ALTER TABLE activity_logs
ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES user_devices(id) ON DELETE SET NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_activity_logs_device ON activity_logs(device_id);

-- Comment
COMMENT ON COLUMN activity_logs.device_id IS 'Reference to the device used for this activity';
