-- ============================================
-- Allow inserting new currencies (no hardcoded list)
-- ============================================

-- Remove NOT NULL default check on currency_code list if any remains
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'currency_settings_currency_code_check'
  ) THEN
    ALTER TABLE currency_settings DROP CONSTRAINT currency_settings_currency_code_check;
  END IF;
END $$;

-- Ensure currency_code stays uppercased and unique via trigger
CREATE OR REPLACE FUNCTION normalize_currency_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.currency_code := UPPER(TRIM(NEW.currency_code));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_normalize_currency_code ON currency_settings;
CREATE TRIGGER trg_normalize_currency_code
  BEFORE INSERT OR UPDATE ON currency_settings
  FOR EACH ROW
  EXECUTE FUNCTION normalize_currency_code();

-- Ensure rate_mode constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'currency_rate_mode_check'
  ) THEN
    ALTER TABLE currency_settings
    ADD CONSTRAINT currency_rate_mode_check
      CHECK (rate_mode IN ('live', 'manual'));
  END IF;
END $$;
