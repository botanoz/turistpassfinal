-- =====================================================
-- Campaign discount code with fallback to discount_codes table
-- =====================================================
-- Description: Update get_active_banner_campaigns to fetch discount code from both sources
-- Date: 2025-01-24
-- =====================================================

-- Drop the existing function
DROP FUNCTION IF EXISTS get_active_banner_campaigns();

-- Create it with discount_codes table fallback
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
    COALESCE(
      c.discount_code,  -- First try campaigns table discount_code
      (SELECT dc.code FROM discount_codes dc
       WHERE dc.campaign_id = c.id
       AND dc.status = 'active'
       AND dc.valid_from <= NOW()
       AND dc.valid_until >= NOW()
       LIMIT 1)  -- Then fallback to discount_codes table
    ) as discount_code,
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

COMMENT ON FUNCTION get_active_banner_campaigns() IS 'Returns the highest priority active campaign for banner display with discount code from campaigns table or discount_codes table';
