-- =====================================================
-- Migration: Add metadata column to purchased_passes
-- =====================================================
-- Purpose: Add JSONB metadata column for tracking additional
--          pass usage information for refund verification
-- Date: 2025-12-04
-- =====================================================

-- Add metadata column to purchased_passes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'purchased_passes'
      AND column_name = 'metadata'
  ) THEN
    ALTER TABLE purchased_passes ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;

    RAISE NOTICE 'Added metadata column to purchased_passes table';
  ELSE
    RAISE NOTICE 'metadata column already exists in purchased_passes table';
  END IF;
END $$;

-- Create index on metadata for better query performance
CREATE INDEX IF NOT EXISTS idx_purchased_passes_metadata
  ON purchased_passes USING GIN (metadata);

-- Create a function to sync usage_count with metadata
CREATE OR REPLACE FUNCTION sync_pass_usage_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- When usage_count is updated, also update metadata
  IF NEW.usage_count IS DISTINCT FROM OLD.usage_count THEN
    NEW.metadata = jsonb_set(
      COALESCE(NEW.metadata, '{}'::jsonb),
      '{used_count}',
      to_jsonb(NEW.usage_count)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid errors
DROP TRIGGER IF EXISTS sync_pass_usage_metadata_trigger ON purchased_passes;

-- Create trigger to automatically sync metadata
CREATE TRIGGER sync_pass_usage_metadata_trigger
  BEFORE UPDATE ON purchased_passes
  FOR EACH ROW
  WHEN (NEW.usage_count IS DISTINCT FROM OLD.usage_count)
  EXECUTE FUNCTION sync_pass_usage_metadata();

-- Backfill existing data: copy usage_count to metadata
UPDATE purchased_passes
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{used_count}',
  to_jsonb(usage_count)
)
WHERE metadata IS NULL OR NOT (metadata ? 'used_count');

COMMENT ON COLUMN purchased_passes.metadata IS 'JSONB column storing additional pass usage information. Fields: used_count, visit_count, scans, redemptions';
