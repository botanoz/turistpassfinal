-- Ensure only ONE pass can be marked as popular at any time
-- This creates a partial unique index on popular=true rows

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'idx_single_popular_pass'
  ) THEN
    CREATE UNIQUE INDEX idx_single_popular_pass
      ON public.passes (popular)
      WHERE popular = true;
  END IF;
END $$;


