-- =====================================================
-- Migration: Multi-Currency System
-- =====================================================
-- Purpose: Add comprehensive currency support with exchange rates
-- Date: 2025-11-25
-- =====================================================

-- ============================================
-- 1. CURRENCY SETTINGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS currency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Currency Info
  currency_code TEXT NOT NULL UNIQUE CHECK (currency_code IN ('USD', 'EUR', 'GBP', 'JPY', 'TRY')),
  currency_name TEXT NOT NULL,
  currency_symbol TEXT NOT NULL,

  -- Exchange Rate (base: TRY)
  exchange_rate NUMERIC NOT NULL DEFAULT 1.0 CHECK (exchange_rate > 0),

  -- Display Settings
  decimal_places INTEGER NOT NULL DEFAULT 2 CHECK (decimal_places >= 0),
  symbol_position TEXT NOT NULL DEFAULT 'before' CHECK (symbol_position IN ('before', 'after')),
  thousands_separator TEXT DEFAULT ',',
  decimal_separator TEXT DEFAULT '.',

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,

  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_currency_active ON currency_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_currency_default ON currency_settings(is_default) WHERE is_default = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_currency_single_default ON currency_settings(is_default) WHERE is_default = true;

-- RLS
ALTER TABLE currency_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view active currencies
CREATE POLICY "Public can view active currencies"
  ON currency_settings FOR SELECT
  USING (is_active = true);

-- Admins can manage currencies
CREATE POLICY "Admins can manage currencies"
  ON currency_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles ap
      WHERE ap.id = auth.uid()
    )
  );

-- Auto-update timestamp
CREATE TRIGGER currency_settings_updated_at
  BEFORE UPDATE ON currency_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_site_settings_updated_at();

-- ============================================
-- 2. CURRENCY CONVERSION FUNCTIONS
-- ============================================

-- Get exchange rate for a currency
CREATE OR REPLACE FUNCTION get_exchange_rate(p_currency_code TEXT)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  SELECT exchange_rate INTO v_rate
  FROM currency_settings
  WHERE currency_code = p_currency_code
    AND is_active = true;

  IF v_rate IS NULL THEN
    -- Return 1.0 for TRY or if currency not found
    RETURN 1.0;
  END IF;

  RETURN v_rate;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Convert price from TRY to target currency
CREATE OR REPLACE FUNCTION convert_price(
  p_price_try NUMERIC,
  p_target_currency TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  IF p_target_currency = 'TRY' OR p_target_currency IS NULL THEN
    RETURN p_price_try;
  END IF;

  v_rate := get_exchange_rate(p_target_currency);
  RETURN ROUND(p_price_try / v_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Convert price from any currency to TRY (base)
CREATE OR REPLACE FUNCTION convert_to_base(
  p_price NUMERIC,
  p_currency TEXT
)
RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  IF p_currency = 'TRY' OR p_currency IS NULL THEN
    RETURN p_price;
  END IF;

  v_rate := get_exchange_rate(p_currency);
  RETURN ROUND(p_price * v_rate, 2);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Format currency amount with proper symbol and formatting
CREATE OR REPLACE FUNCTION format_currency(
  p_amount NUMERIC,
  p_currency_code TEXT
)
RETURNS TEXT AS $$
DECLARE
  v_symbol TEXT;
  v_position TEXT;
  v_decimals INTEGER;
  v_formatted TEXT;
BEGIN
  -- Get currency settings
  SELECT currency_symbol, symbol_position, decimal_places
  INTO v_symbol, v_position, v_decimals
  FROM currency_settings
  WHERE currency_code = p_currency_code
    AND is_active = true;

  -- Default to TRY if not found
  IF v_symbol IS NULL THEN
    v_symbol := '₺';
    v_position := 'after';
    v_decimals := 2;
  END IF;

  -- Format number
  v_formatted := TO_CHAR(p_amount, 'FM999,999,999,990.00');

  -- Add symbol
  IF v_position = 'before' THEN
    RETURN v_symbol || v_formatted;
  ELSE
    RETURN v_formatted || v_symbol;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- 3. ADD CURRENCY TO EXISTING TABLES
-- ============================================

-- Add currency columns to pass_pricing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pass_pricing' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE pass_pricing ADD COLUMN currency_code TEXT DEFAULT 'TRY' NOT NULL;
    ALTER TABLE pass_pricing ADD COLUMN price_usd NUMERIC;
    ALTER TABLE pass_pricing ADD COLUMN price_eur NUMERIC;
    ALTER TABLE pass_pricing ADD COLUMN price_gbp NUMERIC;
    ALTER TABLE pass_pricing ADD COLUMN price_jpy NUMERIC;
  END IF;
END $$;

-- Add currency columns to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE orders ADD COLUMN currency_code TEXT DEFAULT 'TRY' NOT NULL;
    ALTER TABLE orders ADD COLUMN exchange_rate NUMERIC DEFAULT 1.0;
  END IF;
END $$;

-- Add currency columns to order_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'currency_code'
  ) THEN
    ALTER TABLE order_items ADD COLUMN currency_code TEXT DEFAULT 'TRY' NOT NULL;
  END IF;
END $$;

-- ============================================
-- 4. TRIGGER TO AUTO-CALCULATE PRICES
-- ============================================

-- Auto-calculate multi-currency prices when pass_pricing is inserted/updated
CREATE OR REPLACE FUNCTION calculate_multicurrency_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate prices in all currencies based on TRY price
  NEW.price_usd := convert_price(NEW.price, 'USD');
  NEW.price_eur := convert_price(NEW.price, 'EUR');
  NEW.price_gbp := convert_price(NEW.price, 'GBP');
  NEW.price_jpy := convert_price(NEW.price, 'JPY');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pass_pricing_calculate_prices
  BEFORE INSERT OR UPDATE ON pass_pricing
  FOR EACH ROW
  EXECUTE FUNCTION calculate_multicurrency_prices();

-- ============================================
-- 5. VIEWS FOR MULTI-CURRENCY PRICING
-- ============================================

-- View to get pass pricing in all currencies
CREATE OR REPLACE VIEW pass_pricing_multicurrency AS
SELECT
  pp.id,
  pp.pass_id,
  pp.days,
  pp.age_group,
  pp.price as price_try,
  pp.price_usd,
  pp.price_eur,
  pp.price_gbp,
  pp.price_jpy,
  pp.currency_code,
  pp.created_at,
  p.name as pass_name,
  p.status as pass_status
FROM pass_pricing pp
JOIN passes p ON p.id = pp.pass_id;

-- Grant access to view
GRANT SELECT ON pass_pricing_multicurrency TO anon, authenticated;

-- ============================================
-- 6. INSERT DEFAULT CURRENCIES
-- ============================================

INSERT INTO currency_settings (currency_code, currency_name, currency_symbol, exchange_rate, decimal_places, symbol_position, is_active, is_default) VALUES
  ('TRY', 'Turkish Lira', '₺', 1.0, 2, 'after', true, true),
  ('USD', 'US Dollar', '$', 34.50, 2, 'before', true, false),
  ('EUR', 'Euro', '€', 37.50, 2, 'before', true, false),
  ('GBP', 'British Pound', '£', 43.50, 2, 'before', true, false),
  ('JPY', 'Japanese Yen', '¥', 0.23, 0, 'before', true, false)
ON CONFLICT (currency_code) DO UPDATE
SET
  currency_name = EXCLUDED.currency_name,
  currency_symbol = EXCLUDED.currency_symbol,
  exchange_rate = EXCLUDED.exchange_rate,
  decimal_places = EXCLUDED.decimal_places,
  symbol_position = EXCLUDED.symbol_position,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ============================================
-- 7. UPDATE EXISTING PRICING DATA
-- ============================================

-- Recalculate all multi-currency prices for existing data
UPDATE pass_pricing
SET
  price_usd = convert_price(price, 'USD'),
  price_eur = convert_price(price, 'EUR'),
  price_gbp = convert_price(price, 'GBP'),
  price_jpy = convert_price(price, 'JPY'),
  currency_code = 'TRY'
WHERE currency_code IS NULL OR price_usd IS NULL;

-- ============================================
-- 8. HELPER FUNCTIONS FOR CURRENCY
-- ============================================

-- Get all active currencies
CREATE OR REPLACE FUNCTION get_active_currencies()
RETURNS TABLE (
  currency_code TEXT,
  currency_name TEXT,
  currency_symbol TEXT,
  exchange_rate NUMERIC,
  is_default BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.currency_code,
    cs.currency_name,
    cs.currency_symbol,
    cs.exchange_rate,
    cs.is_default
  FROM currency_settings cs
  WHERE cs.is_active = true
  ORDER BY cs.is_default DESC, cs.currency_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get default currency
CREATE OR REPLACE FUNCTION get_default_currency()
RETURNS TEXT AS $$
DECLARE
  v_currency TEXT;
BEGIN
  SELECT currency_code INTO v_currency
  FROM currency_settings
  WHERE is_default = true
    AND is_active = true
  LIMIT 1;

  RETURN COALESCE(v_currency, 'TRY');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Update currency exchange rates (for admin use)
CREATE OR REPLACE FUNCTION update_exchange_rates(
  p_usd_rate NUMERIC DEFAULT NULL,
  p_eur_rate NUMERIC DEFAULT NULL,
  p_gbp_rate NUMERIC DEFAULT NULL,
  p_jpy_rate NUMERIC DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Update rates if provided
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

  -- Recalculate all pass prices
  UPDATE pass_pricing
  SET
    price_usd = convert_price(price, 'USD'),
    price_eur = convert_price(price, 'EUR'),
    price_gbp = convert_price(price, 'GBP'),
    price_jpy = convert_price(price, 'JPY');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE currency_settings IS 'Multi-currency configuration with exchange rates';
COMMENT ON FUNCTION get_exchange_rate IS 'Get current exchange rate for a currency';
COMMENT ON FUNCTION convert_price IS 'Convert price from TRY to target currency';
COMMENT ON FUNCTION convert_to_base IS 'Convert price from any currency to TRY';
COMMENT ON FUNCTION format_currency IS 'Format currency amount with symbol and formatting';
COMMENT ON FUNCTION get_active_currencies IS 'Get all active currencies with their settings';
COMMENT ON FUNCTION get_default_currency IS 'Get the default currency code';
COMMENT ON FUNCTION update_exchange_rates IS 'Update exchange rates and recalculate all prices';
