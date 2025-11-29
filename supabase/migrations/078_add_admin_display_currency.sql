-- =====================================================
-- Add is_admin_display column to currency_settings
-- This column determines which currency is used for
-- displaying values in the admin panel (Dashboard, Analytics, etc.)
-- =====================================================

-- Add is_admin_display column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'currency_settings' 
    AND column_name = 'is_admin_display'
  ) THEN
    ALTER TABLE currency_settings 
    ADD COLUMN is_admin_display BOOLEAN DEFAULT false;
    
    -- Set TRY as the default admin display currency
    UPDATE currency_settings 
    SET is_admin_display = true 
    WHERE currency_code = 'TRY';
    
    RAISE NOTICE 'Added is_admin_display column to currency_settings';
  ELSE
    RAISE NOTICE 'is_admin_display column already exists';
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_currency_settings_admin_display 
ON currency_settings(is_admin_display) 
WHERE is_admin_display = true;

-- Create a function to get admin display currency
CREATE OR REPLACE FUNCTION get_admin_display_currency()
RETURNS TABLE (
  currency_code TEXT,
  currency_symbol TEXT,
  exchange_rate NUMERIC,
  symbol_position TEXT,
  decimal_places INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.currency_code,
    cs.currency_symbol,
    cs.exchange_rate,
    cs.symbol_position,
    cs.decimal_places
  FROM currency_settings cs
  WHERE cs.is_admin_display = true
  LIMIT 1;
  
  -- If no admin display currency is set, return TRY as default
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'TRY'::TEXT,
      '₺'::TEXT,
      1::NUMERIC,
      'before'::TEXT,
      2::INTEGER;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create a function to convert TRY amount to admin display currency
CREATE OR REPLACE FUNCTION convert_to_admin_currency(amount_try NUMERIC)
RETURNS NUMERIC AS $$
DECLARE
  v_exchange_rate NUMERIC;
  v_currency_code TEXT;
BEGIN
  -- Get admin display currency info
  SELECT cs.exchange_rate, cs.currency_code
  INTO v_exchange_rate, v_currency_code
  FROM currency_settings cs
  WHERE cs.is_admin_display = true
  LIMIT 1;
  
  -- If no admin display currency or it's TRY, return the amount as-is
  IF v_currency_code IS NULL OR v_currency_code = 'TRY' THEN
    RETURN amount_try;
  END IF;
  
  -- Convert TRY to admin display currency
  -- exchange_rate is stored as "TRY per 1 unit of foreign currency"
  -- So to convert TRY to foreign: TRY / exchange_rate
  RETURN ROUND(amount_try / COALESCE(v_exchange_rate, 1), 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_admin_display_currency() TO authenticated;
GRANT EXECUTE ON FUNCTION convert_to_admin_currency(NUMERIC) TO authenticated;

-- =====================================================
-- END OF MIGRATION
-- =====================================================

