-- =====================================================
-- MIGRATION: Add New Business Categories
-- =====================================================
-- Description: Adds new category options for businesses
-- Date: 2025-10-31
-- =====================================================

-- =====================================================
-- 1. ADD NEW CATEGORY CHECK CONSTRAINT
-- =====================================================

-- First, drop the existing check constraint if it exists
ALTER TABLE businesses DROP CONSTRAINT IF EXISTS businesses_category_check;

-- Add new check constraint with expanded categories
ALTER TABLE businesses ADD CONSTRAINT businesses_category_check
  CHECK (category IN (
    'Historical',
    'Museum',
    'Restaurant',
    'Cafe',
    'Spa & Massage',
    'Shopping',
    'Activity',
    'Beauty',
    'Auto Service'
  ));

-- =====================================================
-- 2. ADD SAMPLE DATA FOR NEW CATEGORIES
-- =====================================================

INSERT INTO businesses (id, name, category, description, short_description, address, latitude, longitude, status) VALUES
  -- Restaurants
  (
    gen_random_uuid(),
    'Mikla Restaurant',
    'Restaurant',
    'Contemporary Anatolian cuisine with panoramic views of Istanbul. Chef Mehmet Gürs creates innovative dishes using traditional Turkish ingredients with modern techniques. The restaurant features an open kitchen and stunning rooftop terrace overlooking the city.',
    'Contemporary Anatolian cuisine with stunning city views',
    'The Marmara Pera, Meşrutiyet Caddesi No:15, Beyoğlu, Istanbul',
    41.0325,
    28.9779,
    'active'
  ),
  (
    gen_random_uuid(),
    'Nusr-Et Steakhouse',
    'Restaurant',
    'World-famous steakhouse owned by celebrity chef Nusret Gökçe, known for theatrical meat cutting and seasoning. Offers premium cuts of meat, Ottoman-style kebabs, and luxurious dining atmosphere. Reservations highly recommended.',
    'Celebrity chef steakhouse with theatrical service',
    'Etiler Mahallesi, Nişbetiye Cd., Beşiktaş, Istanbul',
    41.0800,
    29.0267,
    'active'
  ),

  -- Cafes
  (
    gen_random_uuid(),
    'Mandabatmaz',
    'Cafe',
    'A legendary Istanbul cafe famous for serving the best Turkish coffee in the city. This tiny establishment has been brewing perfect cups since 1967, using a secret technique passed down through generations. Despite its small size, it is always packed with locals and visitors seeking an authentic Turkish coffee experience.',
    'Iconic Turkish coffee house since 1967',
    'Olivia Geçidi No:1/A, Beyoğlu, Istanbul',
    41.0325,
    28.9779,
    'active'
  ),
  (
    gen_random_uuid(),
    'Kronotrop Coffee',
    'Cafe',
    'Specialty coffee roaster and cafe serving single-origin beans from around the world. Features modern brewing methods, barista training center, and minimalist design. Perfect for coffee enthusiasts and digital nomads.',
    'Specialty coffee roaster and modern cafe',
    'Multiple Locations, Istanbul',
    41.0370,
    28.9851,
    'active'
  ),

  -- Spa & Massage
  (
    gen_random_uuid(),
    'Ayasofya Hürrem Sultan Hamamı',
    'Spa & Massage',
    'Traditional Turkish hamam experience in a 16th-century bathhouse commissioned by Süleyman the Magnificent. Offers authentic Turkish bath rituals, aromatherapy massages, and rejuvenating beauty treatments in a luxurious historical setting inspired by Ottoman palace baths.',
    'Historic Ottoman-era Turkish bath and spa',
    'Cankurtaran Mahallesi, Bab-ı Hümayun Caddesi, Fatih, Istanbul',
    41.0086,
    28.9802,
    'active'
  ),
  (
    gen_random_uuid(),
    'Les Ottomans Spa',
    'Spa & Massage',
    'Located in a historic mansion on the Bosphorus, this exclusive spa offers world-class treatments blending Eastern and Western wellness traditions. Features include private treatment suites, a traditional hamam, sauna, and relaxation areas with stunning water views.',
    'Bosphorus-view luxury spa and wellness center',
    'Muallim Naci Cd., Kuruçeşme, Beşiktaş, Istanbul',
    41.0522,
    29.0336,
    'active'
  ),

  -- Shopping
  (
    gen_random_uuid(),
    'Grand Bazaar',
    'Shopping',
    'One of the largest and oldest covered markets in the world, with over 4,000 shops spread across 61 covered streets. Shop for Turkish carpets, jewelry, ceramics, spices, textiles, and traditional handicrafts. A must-visit historical shopping destination.',
    'Historic covered market with 4,000+ shops',
    'Beyazıt, Fatih, Istanbul',
    41.0108,
    28.9680,
    'active'
  ),
  (
    gen_random_uuid(),
    'Istinye Park',
    'Shopping',
    'Luxury shopping mall featuring high-end international brands, designer boutiques, gourmet restaurants, and entertainment facilities. Modern architecture with open-air sections and indoor climate-controlled areas.',
    'Luxury shopping mall with premium brands',
    'İstinye, Sarıyer, Istanbul',
    41.1085,
    29.0552,
    'active'
  ),

  -- Activity
  (
    gen_random_uuid(),
    'Bosphorus Cruise Tours',
    'Activity',
    'Experience Istanbul from the water with guided Bosphorus cruises. Tours include stops at historic waterfront mansions, fortresses, and palaces. Available in various durations from short sunset cruises to full-day explorations including meals and entertainment.',
    'Scenic Bosphorus boat tours and cruises',
    'Eminönü Pier, Fatih, Istanbul',
    41.0170,
    28.9700,
    'active'
  ),
  (
    gen_random_uuid(),
    'Istanbul Cooking School',
    'Activity',
    'Learn to prepare authentic Turkish dishes with professional chefs. Classes include market tours, hands-on cooking instruction, and a communal meal. Perfect for food enthusiasts wanting to bring Turkish flavors home.',
    'Hands-on Turkish cooking classes and food tours',
    'Asmalı Mescit, Beyoğlu, Istanbul',
    41.0310,
    28.9751,
    'active'
  ),

  -- Beauty
  (
    gen_random_uuid(),
    'Divarese Beauty Studio',
    'Beauty',
    'Full-service beauty salon offering hair styling, makeup, manicure, pedicure, and skincare treatments. Uses premium international products and employs skilled beauticians trained in the latest techniques.',
    'Premium beauty salon and styling center',
    'Nişantaşı, Şişli, Istanbul',
    41.0461,
    28.9942,
    'active'
  ),
  (
    gen_random_uuid(),
    'Glow Beauty Lounge',
    'Beauty',
    'Modern beauty lounge specializing in skincare treatments, professional makeup application, and beauty consultations. Features private treatment rooms and uses organic, cruelty-free products.',
    'Modern beauty and skincare lounge',
    'Bağdat Caddesi, Kadıköy, Istanbul',
    40.9823,
    29.0602,
    'active'
  ),

  -- Auto Service
  (
    gen_random_uuid(),
    'Istanbul Premium Car Rental',
    'Auto Service',
    'Premium car rental service offering a wide range of vehicles from economy to luxury. Includes airport pickup/delivery, GPS navigation, and 24/7 roadside assistance. All vehicles are regularly maintained and fully insured.',
    'Premium car rental with delivery service',
    'Atatürk Airport Area, Bakırköy, Istanbul',
    40.9769,
    28.8150,
    'active'
  ),
  (
    gen_random_uuid(),
    'Express Car Wash & Detailing',
    'Auto Service',
    'Professional car wash and detailing center offering everything from quick exterior washes to complete interior and exterior detailing. Uses eco-friendly products and modern equipment.',
    'Professional car wash and detailing center',
    'Maslak, Sarıyer, Istanbul',
    41.1085,
    29.0185,
    'active'
  );

-- =====================================================
-- 3. UPDATE COMMENTS
-- =====================================================

COMMENT ON COLUMN businesses.category IS 'Business category: Historical, Museum, Restaurant, Cafe, Spa & Massage, Shopping, Activity, Beauty, Auto Service';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Expected results:
-- ✅ Category constraint updated with new categories
-- ✅ Sample data added for all new categories
-- ✅ Comments updated
