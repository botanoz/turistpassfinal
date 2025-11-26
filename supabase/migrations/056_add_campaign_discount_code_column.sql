-- =====================================================
-- Add discount_code column to campaigns table
-- =====================================================
-- Description: Add a simple discount code field to campaigns for banner display
-- Date: 2025-01-24
-- =====================================================

-- Add discount_code column to campaigns table
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS discount_code TEXT;

-- Add comment
COMMENT ON COLUMN campaigns.discount_code IS 'Simple discount code to display in banner (optional)';

-- Now update the function to include discount_code
DROP FUNCTION IF EXISTS get_active_banner_campaigns();

CREATE OR REPLACE FUNCTION get_active_banner_campaigns()
RETURNS TABLE (
  id UUID,
  title TEXT,
  subtitle TEXT,
  description TEXT,
  banner_text TEXT,
  banner_type TEXT,
  discount_type TEXT,
  discount_value NUMERIC,
  discount_code TEXT,
  end_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.subtitle,
    c.description,
    c.banner_text,
    c.banner_type,
    c.discount_type,
    c.discount_value,
    c.discount_code,
    c.end_date
  FROM campaigns c
  WHERE c.status = 'active'
    AND c.show_banner = true
    AND c.start_date <= NOW()
    AND c.end_date >= NOW()
  ORDER BY c.priority DESC, c.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_active_banner_campaigns() IS 'Returns the highest priority active campaign for banner display with discount code';
