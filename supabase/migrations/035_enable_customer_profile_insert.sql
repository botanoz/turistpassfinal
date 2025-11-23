-- Allow authenticated users to create their own customer profile
-- Date: 2025-11-02

ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'customer_profiles'
      AND policyname = 'Users can create own profile'
  ) THEN
    CREATE POLICY "Users can create own profile"
      ON customer_profiles FOR INSERT
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

