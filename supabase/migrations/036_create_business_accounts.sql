-- Create business_accounts table linked to Supabase auth users
-- Date: 2025-11-02

CREATE TABLE IF NOT EXISTS business_accounts (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'suspended')) DEFAULT 'pending',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_accounts_status ON business_accounts(status);
CREATE INDEX IF NOT EXISTS idx_business_accounts_created ON business_accounts(created_at DESC);

ALTER TABLE business_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_accounts'
      AND policyname = 'Businesses can view own account'
  ) THEN
    CREATE POLICY "Businesses can view own account"
      ON business_accounts FOR SELECT
      USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_accounts'
      AND policyname = 'Businesses can update own account'
  ) THEN
    CREATE POLICY "Businesses can update own account"
      ON business_accounts FOR UPDATE
      USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'business_accounts'
      AND policyname = 'Businesses can insert own account'
  ) THEN
    CREATE POLICY "Businesses can insert own account"
      ON business_accounts FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_business_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_accounts_updated_at ON business_accounts;
CREATE TRIGGER business_accounts_updated_at
  BEFORE UPDATE ON business_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_business_accounts_updated_at();

