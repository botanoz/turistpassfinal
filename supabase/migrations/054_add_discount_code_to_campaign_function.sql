-- =====================================================
-- Add discount_code to campaign function
-- =====================================================
-- Description: Update get_active_banner_campaigns to include discount code
-- Date: 2025-01-24
-- =====================================================

-- First drop the existing function
DROP FUNCTION IF EXISTS get_active_banner_campaigns();

-- Then create it with the new signature
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
