-- =====================================================
-- MIGRATION: Add Contact & Metadata Columns to Businesses
-- =====================================================
-- Description: Extends businesses table to store contact information,
-- location metadata, and basic business details required by the admin UI.
-- Date: 2025-10-31
-- =====================================================

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS contact_position TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS tax_number TEXT,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS established TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Optional: index for quick lookups by slug
CREATE INDEX IF NOT EXISTS idx_businesses_slug ON businesses(slug);

-- =====================================================
