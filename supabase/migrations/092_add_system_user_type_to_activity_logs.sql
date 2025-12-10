-- =====================================================
-- Migration: Add 'system' user type to activity_logs
-- =====================================================
-- Purpose: Fix constraint violation when system triggers create activity logs
-- Date: 2025-12-05
-- =====================================================

-- Drop existing constraint
ALTER TABLE activity_logs
  DROP CONSTRAINT IF EXISTS activity_logs_user_type_check;

-- Add updated constraint with 'system'
ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_user_type_check
  CHECK (user_type IN ('admin', 'customer', 'business', 'system'));

COMMENT ON CONSTRAINT activity_logs_user_type_check ON activity_logs IS 'Valid user types including system for automated triggers';
