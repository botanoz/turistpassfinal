-- =====================================================
-- FAZ 5: VENUES MANAGEMENT SYSTEM ENHANCEMENTS
-- =====================================================
-- Description: Adds stats functions and enhancements for venues CRUD
-- Dependencies: 007_create_passes_system.sql
-- Date: 2025-10-30
-- =====================================================

-- =====================================================
-- FUNCTION: Get Admin Venues Statistics
-- =====================================================
-- Returns global statistics for venues dashboard

CREATE OR REPLACE FUNCTION get_admin_venues_stats()
RETURNS TABLE (
  total_venues BIGINT,
  active_venues BIGINT,
  inactive_venues BIGINT,
  by_category JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_venues,
    COUNT(*) FILTER (WHERE status = 'active') as active_venues,
    COUNT(*) FILTER (WHERE status = 'inactive') as inactive_venues,
    (
      SELECT json_agg(
        json_build_object(
          'category', category,
          'count', count
        )
      )
      FROM (
        SELECT
          category,
          COUNT(*) as count
        FROM venues
        GROUP BY category
        ORDER BY count DESC
      ) category_counts
    ) as by_category
  FROM venues;
END;
$$;

COMMENT ON FUNCTION get_admin_venues_stats() IS 'Returns venue statistics for admin dashboard';

-- =====================================================
-- FUNCTION: Get Venue Details with Pass Count
-- =====================================================
-- Returns complete venue details including number of passes using this venue

CREATE OR REPLACE FUNCTION get_venue_details(venue_uuid UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'venue', row_to_json(v.*),
    'pass_count', (
      SELECT COUNT(*)
      FROM pass_venues pv
      WHERE pv.venue_id = venue_uuid
    ),
    'passes', (
      SELECT json_agg(
        json_build_object(
          'pass_id', p.id,
          'pass_name', p.name,
          'pass_status', p.status,
          'discount', pv.discount,
          'usage_type', pv.usage_type,
          'max_usage', pv.max_usage
        )
      )
      FROM pass_venues pv
      JOIN passes p ON p.id = pv.pass_id
      WHERE pv.venue_id = venue_uuid
    )
  ) INTO result
  FROM venues v
  WHERE v.id = venue_uuid;

  RETURN result;
END;
$$;

COMMENT ON FUNCTION get_venue_details(UUID) IS 'Returns complete venue details with associated passes';

-- =====================================================
-- FUNCTION: Check if Venue Can Be Deleted
-- =====================================================
-- Returns true if venue can be safely deleted (not used in any active passes)

CREATE OR REPLACE FUNCTION can_delete_venue(venue_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  active_pass_count INTEGER;
BEGIN
  -- Check if venue is used in any active passes
  SELECT COUNT(*)
  INTO active_pass_count
  FROM pass_venues pv
  JOIN passes p ON p.id = pv.pass_id
  WHERE pv.venue_id = venue_uuid
    AND p.status = 'active';

  RETURN active_pass_count = 0;
END;
$$;

COMMENT ON FUNCTION can_delete_venue(UUID) IS 'Checks if venue can be safely deleted without breaking active passes';

-- =====================================================
-- TRIGGER: Update venues updated_at timestamp
-- =====================================================

CREATE OR REPLACE FUNCTION update_venues_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_venues_updated_at ON venues;

CREATE TRIGGER trigger_update_venues_updated_at
  BEFORE UPDATE ON venues
  FOR EACH ROW
  EXECUTE FUNCTION update_venues_updated_at();

COMMENT ON TRIGGER trigger_update_venues_updated_at ON venues IS 'Automatically updates updated_at timestamp on venue modifications';

-- =====================================================
-- ADD SAMPLE VENUES (Additional venues for testing)
-- =====================================================
-- Adding more diverse sample venues for testing

INSERT INTO venues (id, name, category, description, short_description, address, latitude, longitude, image_url, status) VALUES
  -- Additional Historical Sites
  (
    '00000000-0000-0000-0000-000000000009',
    'Basilica Cistern',
    'Historical',
    'The Basilica Cistern is one of Istanbul''s most impressive ancient structures. Built in the 6th century during the reign of Byzantine Emperor Justinian I, this underground marvel was designed to store water for the Great Palace. The cistern features 336 marble columns arranged in 12 rows, many of which were repurposed from older structures. The most famous features are the two Medusa head column bases, mysteriously placed sideways and upside down. The atmospheric lighting and the sound of dripping water create an otherworldly experience as you walk along the elevated platforms.',
    'Ancient underground water reservoir with 336 columns',
    'Alemdar, Yerebatan Cd. 1/3, Fatih, Istanbul',
    41.0084,
    28.9784,
    NULL,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000010',
    'Dolmabahçe Palace',
    'Historical',
    'Dolmabahçe Palace served as the main administrative center of the Ottoman Empire from 1856 to 1887 and 1909 to 1922. Built by Sultan Abdülmecid I, it replaced Topkapi Palace as the empire''s administrative center. The palace blends traditional Ottoman architecture with European Baroque, Rococo, and Neoclassical styles. It houses the world''s largest Bohemian crystal chandelier, a gift from Queen Victoria. Mustafa Kemal Atatürk, founder of the Turkish Republic, spent his final days here and passed away on November 10, 1938. The palace contains 285 rooms and 46 halls.',
    'Magnificent Ottoman palace on the Bosphorus waterfront',
    'Vişnezade, Dolmabahçe Cd., Beşiktaş, Istanbul',
    41.0391,
    29.0003,
    NULL,
    'active'
  ),

  -- Additional Museums
  (
    '00000000-0000-0000-0000-000000000011',
    'Pera Museum',
    'Museum',
    'Located in the historic Beyoğlu district, Pera Museum is a private museum known for its rich collection of Orientalist paintings, Anatolian weights and measures, and Kütahya tiles and ceramics. The building itself is a historic structure that was once the Bristol Hotel. The museum regularly hosts temporary exhibitions featuring local and international artists, making it one of Istanbul''s most dynamic cultural venues. Its permanent collection includes masterpieces by European artists who traveled to the Ottoman Empire in the 19th century.',
    'Contemporary art museum with Orientalist painting collection',
    'Meşrutiyet Cd. No:65, Beyoğlu, Istanbul',
    41.0297,
    28.9744,
    NULL,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000012',
    'Rahmi M. Koç Museum',
    'Museum',
    'Turkey''s first major museum dedicated to the history of transport, industry, and communications. Housed in historic buildings on the Golden Horn, including the Lengerhane (Anchor Building) and Hasköy shipyard, the museum showcases a fascinating collection of vintage cars, trains, submarines, aircraft, and scientific instruments. Interactive exhibits make it particularly popular with families. The museum also features a vintage tram that visitors can ride, a submarine you can enter, and a period café serving traditional Turkish cuisine.',
    'Industrial museum featuring transport and communication history',
    'Piri Paşa, Hasköy Cd. No:5, Beyoğlu, Istanbul',
    41.0456,
    28.9478,
    NULL,
    'active'
  ),

  -- Additional Restaurants
  (
    '00000000-0000-0000-0000-000000000013',
    'Nusr-Et Steakhouse',
    'Restaurant',
    'Made famous by celebrity chef Nusret Gökçe (Salt Bae), Nusr-Et has become an iconic Istanbul dining destination. The restaurant specializes in premium quality steaks prepared with theatrical flair. While known for its Instagram-worthy serving style, the restaurant maintains high culinary standards with expertly prepared meat dishes. The modern, luxurious ambiance and attentive service make it a favorite among both locals and international visitors seeking a memorable dining experience.',
    'Famous steakhouse by celebrity chef Salt Bae',
    'Nispetiye Cd. No:87, Etiler, Beşiktaş, Istanbul',
    41.0789,
    29.0239,
    NULL,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000014',
    '360 Istanbul',
    'Restaurant',
    'Perched atop a historic building in Beyoğlu, 360 Istanbul offers breathtaking panoramic views of the city, the Bosphorus, and the Golden Horn. The restaurant serves contemporary fusion cuisine blending Turkish and international flavors. After dinner, it transforms into one of Istanbul''s most popular nightlife venues. The rooftop terrace is especially magical at sunset. The extensive cocktail menu and regular DJ performances make it a complete entertainment destination.',
    'Rooftop restaurant and bar with 360-degree city views',
    'İstiklal Cd. Misir Apt No:163/8, Beyoğlu, Istanbul',
    41.0330,
    28.9769,
    NULL,
    'active'
  ),

  -- Additional Shopping
  (
    '00000000-0000-0000-0000-000000000015',
    'Istinye Park',
    'Shopping',
    'One of Istanbul''s premier luxury shopping destinations, Istinye Park combines an open-air shopping experience with a covered mall concept. Home to over 300 national and international brands including Gucci, Prada, Louis Vuitton, and many more, it offers a comprehensive luxury retail experience. The mall features a distinctive architectural design with a boulevard-style layout, luxury restaurants, a gourmet food market, cinema complex, and entertainment zones. The outdoor spaces with landscaping provide a pleasant shopping environment year-round.',
    'Luxury shopping mall with premium international brands',
    'Pınar, Katar Cd. No:11, Sarıyer, Istanbul',
    41.1208,
    29.0547,
    NULL,
    'active'
  ),
  (
    '00000000-0000-0000-0000-000000000016',
    'Zorlu Center',
    'Shopping',
    'Zorlu Center is a multi-purpose complex that seamlessly integrates shopping, culture, dining, and entertainment. Beyond its impressive selection of luxury and high-street brands, it houses the Zorlu Performing Arts Center (Zorlu PSM), which hosts world-class concerts, theater performances, and exhibitions. The complex features contemporary architecture by renowned firms, fine dining restaurants, a multi-screen cinema, and beautifully landscaped outdoor spaces. It has become a cultural hub in addition to being a premier shopping destination.',
    'Premium shopping and cultural complex with performing arts center',
    'Levazım, Koru Sk. No:2, Beşiktaş, Istanbul',
    41.0625,
    29.0089,
    NULL,
    'active'
  )
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant execute permissions on functions to authenticated users
GRANT EXECUTE ON FUNCTION get_admin_venues_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_venue_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_venue(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- You can run this to verify the migration worked correctly:
-- SELECT * FROM get_admin_venues_stats();
-- SELECT get_venue_details('00000000-0000-0000-0000-000000000001');
-- SELECT can_delete_venue('00000000-0000-0000-0000-000000000009');

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Expected results:
-- ✅ 3 new functions created (get_admin_venues_stats, get_venue_details, can_delete_venue)
-- ✅ 1 trigger created (update_venues_updated_at)
-- ✅ 8 additional sample venues inserted (total 16 venues)
-- ✅ Permissions granted
