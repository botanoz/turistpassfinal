-- ============================================
-- Relax currency code constraint + refresh fn
-- ============================================

-- 1) Drop hardcoded currency_code check to allow new codes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'currency_settings_currency_code_check'
  ) THEN
    ALTER TABLE currency_settings DROP CONSTRAINT currency_settings_currency_code_check;
  END IF;
END $$;

-- 2) Make sure rate_mode check still enforced
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

-- 3) Refresh function: ignore fixed param list, just recalc prices using current exchange_rate
CREATE OR REPLACE FUNCTION update_exchange_rates(
  p_usd_rate NUMERIC DEFAULT NULL,
  p_eur_rate NUMERIC DEFAULT NULL,
  p_gbp_rate NUMERIC DEFAULT NULL,
  p_jpy_rate NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update provided fixed rates if any (backward compatibility)
  IF p_usd_rate IS NOT NULL THEN
    UPDATE currency_settings SET exchange_rate = p_usd_rate, last_updated = NOW() WHERE currency_code = 'USD';
  END IF;
  IF p_eur_rate IS NOT NULL THEN
    UPDATE currency_settings SET exchange_rate = p_eur_rate, last_updated = NOW() WHERE currency_code = 'EUR';
  END IF;
  IF p_gbp_rate IS NOT NULL THEN
    UPDATE currency_settings SET exchange_rate = p_gbp_rate, last_updated = NOW() WHERE currency_code = 'GBP';
  END IF;
  IF p_jpy_rate IS NOT NULL THEN
    UPDATE currency_settings SET exchange_rate = p_jpy_rate, last_updated = NOW() WHERE currency_code = 'JPY';
  END IF;

  -- Recalculate precomputed columns for legacy fields
  UPDATE pass_pricing
  SET
    price_usd = convert_price(price, 'USD'),
    price_eur = convert_price(price, 'EUR'),
    price_gbp = convert_price(price, 'GBP'),
    price_jpy = convert_price(price, 'JPY');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_exchange_rates IS 'Recalculate legacy price columns and optionally update known rates';
