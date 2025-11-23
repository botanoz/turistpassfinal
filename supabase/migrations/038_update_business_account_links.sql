-- =====================================================
-- MIGRATION: Link business_accounts to businesses table
-- =====================================================
-- Description:
--   Adds a formal foreign key between business_accounts and businesses,
--   updates existing data, and refreshes RLS policies so business users
--   can manage their own records & usage history.
-- Date: 2025-11-05
-- =====================================================

-- 1. Ensure column exists and is populated -----------------------------------
ALTER TABLE business_accounts
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id) ON DELETE SET NULL;

-- Backfill from metadata -> business_id if present
UPDATE business_accounts
SET business_id = COALESCE(
  business_id,
  NULLIF(metadata->>'business_id', '')::UUID
)
WHERE metadata ? 'business_id';

-- Remove duplicated key from metadata now that we have native column
UPDATE business_accounts
SET metadata = metadata - 'business_id'
WHERE metadata ? 'business_id';

-- Helpful index for lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_business_accounts_business_id
  ON business_accounts(business_id)
  WHERE business_id IS NOT NULL;

-- 2. Refresh RLS policies ----------------------------------------------------
-- Pass usage history policies relied on businesses.id = auth.uid(), which is
-- no longer true. Replace them with policies that reference business_accounts.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pass_usage_history'
      AND policyname IN (
        'Businesses can view own validations',
        'Businesses can create usage records'
      )
  LOOP
    EXECUTE format('DROP POLICY "%s" ON pass_usage_history;', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Businesses can view own validations"
  ON pass_usage_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM business_accounts ba
      WHERE ba.id = auth.uid()
        AND ba.business_id IS NOT NULL
        AND ba.business_id = pass_usage_history.business_id
    )
  );

CREATE POLICY "Businesses can create usage records"
  ON pass_usage_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM business_accounts ba
      WHERE ba.id = auth.uid()
        AND ba.business_id IS NOT NULL
        AND ba.business_id = pass_usage_history.business_id
    )
  );

-- 3. Allow business owners to view & update their own business profile -------
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'businesses'
      AND policyname IN (
        'Business owners can view own record',
        'Business owners can update own record'
      )
  LOOP
    EXECUTE format('DROP POLICY "%s" ON businesses;', pol.policyname);
  END LOOP;
END $$;

CREATE POLICY "Business owners can view own record"
  ON businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM business_accounts ba
      WHERE ba.id = auth.uid()
        AND ba.business_id = businesses.id
    )
  );

CREATE POLICY "Business owners can update own record"
  ON businesses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM business_accounts ba
      WHERE ba.id = auth.uid()
        AND ba.business_id = businesses.id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM business_accounts ba
      WHERE ba.id = auth.uid()
        AND ba.business_id = businesses.id
    )
  );
