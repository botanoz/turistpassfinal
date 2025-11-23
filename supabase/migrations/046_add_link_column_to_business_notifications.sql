-- =====================================================
-- MIGRATION: Add link column to business_notifications
-- Description: Safely adds missing link column if it doesn't exist
-- Date: 2025-11-17
-- =====================================================

-- Add link column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'business_notifications'
    AND column_name = 'link'
  ) THEN
    ALTER TABLE business_notifications ADD COLUMN link TEXT;
  END IF;
END $$;
