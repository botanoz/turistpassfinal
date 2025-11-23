-- =====================================================
-- MIGRATION: Update businesses status constraint
-- =====================================================
-- Description:
--   The original venues table only allowed statuses ('active', 'inactive').
--   After renaming to businesses we now need additional states for onboarding.
--   This migration drops the legacy constraint and replaces it with one that
--   supports pending/approved/suspended workflows while keeping existing data.
-- Date: 2025-11-05
-- =====================================================

DO $$
BEGIN
  -- Drop legacy constraint if it still exists (created before rename).
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'businesses'
      AND constraint_name = 'venues_status_check'
  ) THEN
    ALTER TABLE businesses
      DROP CONSTRAINT venues_status_check;
  END IF;

  -- Drop any previous businesses_status_check constraint to avoid duplicates.
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'businesses'
      AND constraint_name = 'businesses_status_check'
  ) THEN
    ALTER TABLE businesses
      DROP CONSTRAINT businesses_status_check;
  END IF;
END $$;

-- Recreate constraint with expanded state machine.
ALTER TABLE businesses
  ADD CONSTRAINT businesses_status_check
  CHECK (status IN ('pending', 'active', 'inactive', 'approved', 'suspended', 'rejected'));

-- Ensure default reflects new onboarding flow.
ALTER TABLE businesses
  ALTER COLUMN status SET DEFAULT 'pending';
