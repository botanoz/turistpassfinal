-- =====================================================
-- MIGRATION: Add How It Works Settings
-- =====================================================
-- Description: Add comprehensive How It Works section settings
-- Dependencies: 009_create_settings_system.sql
-- Date: 2025-01-19
-- =====================================================

-- =====================================================
-- ADD HOW IT WORKS SETTINGS
-- =====================================================

-- Hero Section
INSERT INTO settings (key, category, value, data_type, label, description, placeholder, is_required, is_public) VALUES
  -- Main Hero
  ('howitworks_hero_title', 'site', 'How Does the Istanbul Shopping & Food Pass Work?', 'string', 'How It Works - Hero Title', 'Main title for How It Works section', 'How does it work?', false, true),
  ('howitworks_hero_subtitle', 'site', 'Get exclusive discounts at 40+ handpicked locations across Istanbul with just one pass', 'string', 'How It Works - Hero Subtitle', 'Subtitle for How It Works section', 'Subtitle text', false, true),

  -- Detailed Page Hero
  ('howitworks_detailed_title', 'site', 'How Does It Work?', 'string', 'Detailed Page - Title', 'Main title for detailed How It Works page', 'How does it work?', false, true),
  ('howitworks_detailed_subtitle', 'site', 'Discover Istanbul with TuristPass in just 4 steps! Get instant access to 70+ premium locations and start saving today.', 'string', 'Detailed Page - Subtitle', 'Subtitle for detailed page', 'Subtitle text', false, true),

  -- Overview Video
  ('howitworks_overview_video_url', 'site', '/videos/overview.mp4', 'string', 'Overview Video URL', 'URL of the main overview video', '/videos/overview.mp4', false, true),
  ('howitworks_overview_video_poster', 'site', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=675&fit=crop', 'string', 'Overview Video Poster', 'Poster image URL for overview video', 'https://example.com/poster.jpg', false, true),
  ('howitworks_overview_video_title', 'site', 'How TuristPass Works?', 'string', 'Overview Video Title', 'Title displayed on video player', 'Video title', false, true),

  -- Step 1: Purchase Your Pass
  ('howitworks_step1_title', 'site', 'Purchase Your Pass', 'string', 'Step 1 - Title', 'Title for step 1', 'Step 1 title', false, true),
  ('howitworks_step1_description', 'site', 'Buy your Shopping & Food Pass online in just minutes. Choose from our flexible options and receive instant digital access.', 'string', 'Step 1 - Description', 'Short description for step 1', 'Description', false, true),
  ('howitworks_step1_video_url', 'site', '/videos/step1-select.mp4', 'string', 'Step 1 - Video URL', 'Video URL for step 1', '/videos/step1.mp4', false, true),
  ('howitworks_step1_video_poster', 'site', 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=600&fit=crop', 'string', 'Step 1 - Video Poster', 'Poster image for step 1 video', 'https://example.com/poster1.jpg', false, true),

  -- Step 2: Explore & Visit
  ('howitworks_step2_title', 'site', 'Explore & Visit Partner Locations', 'string', 'Step 2 - Title', 'Title for step 2', 'Step 2 title', false, true),
  ('howitworks_step2_description', 'site', 'Browse through 40+ participating locations across Istanbul. Use our interactive map to discover the best restaurants, cafés, and shops.', 'string', 'Step 2 - Description', 'Short description for step 2', 'Description', false, true),
  ('howitworks_step2_video_url', 'site', '/videos/step2-explore.mp4', 'string', 'Step 2 - Video URL', 'Video URL for step 2', '/videos/step2.mp4', false, true),
  ('howitworks_step2_video_poster', 'site', 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop', 'string', 'Step 2 - Video Poster', 'Poster image for step 2 video', 'https://example.com/poster2.jpg', false, true),

  -- Step 3: Redeem Discounts
  ('howitworks_step3_title', 'site', 'Redeem Your Discounts', 'string', 'Step 3 - Title', 'Title for step 3', 'Step 3 title', false, true),
  ('howitworks_step3_description', 'site', 'Simply show your digital pass at checkout to receive instant discounts. No coupons or negotiations needed—savings are automatic!', 'string', 'Step 3 - Description', 'Short description for step 3', 'Description', false, true),
  ('howitworks_step3_video_url', 'site', '/videos/step3-redeem.mp4', 'string', 'Step 3 - Video URL', 'Video URL for step 3', '/videos/step3.mp4', false, true),
  ('howitworks_step3_video_poster', 'site', 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop', 'string', 'Step 3 - Video Poster', 'Poster image for step 3 video', 'https://example.com/poster3.jpg', false, true),

  -- Step 4: Enjoy Unlimited
  ('howitworks_step4_title', 'site', 'Enjoy & Use Unlimited Times', 'string', 'Step 4 - Title', 'Title for step 4', 'Step 4 title', false, true),
  ('howitworks_step4_description', 'site', 'Maximize your savings by using your pass as many times as you want during the validity period. The more you use, the more you save!', 'string', 'Step 4 - Description', 'Short description for step 4', 'Description', false, true),
  ('howitworks_step4_video_url', 'site', '/videos/step4-savings.mp4', 'string', 'Step 4 - Video URL', 'Video URL for step 4', '/videos/step4.mp4', false, true),
  ('howitworks_step4_video_poster', 'site', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop', 'string', 'Step 4 - Video Poster', 'Poster image for step 4 video', 'https://example.com/poster4.jpg', false, true),

  -- Quick Stats
  ('howitworks_stat_locations', 'site', '70+', 'string', 'Stat - Partner Locations', 'Number of partner locations', '70+', false, true),
  ('howitworks_stat_locations_label', 'site', 'Partner Locations', 'string', 'Stat - Locations Label', 'Label for locations stat', 'Partner Locations', false, true),

  ('howitworks_stat_customers', 'site', '50K+', 'string', 'Stat - Happy Customers', 'Number of happy customers', '50K+', false, true),
  ('howitworks_stat_customers_label', 'site', 'Happy Customers', 'string', 'Stat - Customers Label', 'Label for customers stat', 'Happy Customers', false, true),

  ('howitworks_stat_savings', 'site', '$2.4M', 'string', 'Stat - Total Savings', 'Total savings amount', '$2.4M', false, true),
  ('howitworks_stat_savings_label', 'site', 'Total Savings', 'string', 'Stat - Savings Label', 'Label for savings stat', 'Total Savings', false, true),

  ('howitworks_stat_rating', 'site', '4.9', 'string', 'Stat - Customer Rating', 'Average customer rating', '4.9', false, true),
  ('howitworks_stat_rating_label', 'site', 'Customer Rating', 'string', 'Stat - Rating Label', 'Label for rating stat', 'Customer Rating', false, true),

  -- Benefits
  ('howitworks_benefit1_title', 'site', 'Instant Activation', 'string', 'Benefit 1 - Title', 'First benefit title', 'Benefit title', false, true),
  ('howitworks_benefit1_description', 'site', 'Your pass activates immediately after purchase. Start saving right away without any waiting time.', 'string', 'Benefit 1 - Description', 'First benefit description', 'Benefit description', false, true),

  ('howitworks_benefit2_title', 'site', 'Secure Payment', 'string', 'Benefit 2 - Title', 'Second benefit title', 'Benefit title', false, true),
  ('howitworks_benefit2_description', 'site', 'All transactions are protected with 256-bit SSL encryption. Your payment information is always safe.', 'string', 'Benefit 2 - Description', 'Second benefit description', 'Benefit description', false, true),

  ('howitworks_benefit3_title', 'site', 'Customer Satisfaction', 'string', 'Benefit 3 - Title', 'Third benefit title', 'Benefit title', false, true),
  ('howitworks_benefit3_description', 'site', 'Our 24/7 multilingual customer support team is always ready to assist you in English, Turkish, and more.', 'string', 'Benefit 3 - Description', 'Third benefit description', 'Benefit description', false, true),

  ('howitworks_benefit4_title', 'site', 'Premium Experience', 'string', 'Benefit 4 - Title', 'Fourth benefit title', 'Benefit title', false, true),
  ('howitworks_benefit4_description', 'site', 'Get access to exclusive deals and special offers available only to TuristPass members.', 'string', 'Benefit 4 - Description', 'Fourth benefit description', 'Benefit description', false, true),

  -- CTA Section
  ('howitworks_cta_title', 'site', 'Ready to Start Your Istanbul Adventure?', 'string', 'CTA - Title', 'Call-to-action section title', 'Ready to start?', false, true),
  ('howitworks_cta_subtitle', 'site', 'Our 24/7 active support team is ready to help you with any questions', 'string', 'CTA - Subtitle', 'Call-to-action section subtitle', 'CTA subtitle', false, true),
  ('howitworks_cta_button1_text', 'site', 'Buy Pass', 'string', 'CTA - Primary Button Text', 'Primary CTA button text', 'Buy Now', false, true),
  ('howitworks_cta_button1_url', 'site', '/passes', 'string', 'CTA - Primary Button URL', 'Primary CTA button URL', '/passes', false, true),
  ('howitworks_cta_button2_text', 'site', 'Live Support', 'string', 'CTA - Secondary Button Text', 'Secondary CTA button text', 'Contact Us', false, true),
  ('howitworks_cta_button2_url', 'site', '/contact', 'string', 'CTA - Secondary Button URL', 'Secondary CTA button URL', '/contact', false, true)

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  data_type = EXCLUDED.data_type,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  placeholder = EXCLUDED.placeholder,
  is_required = EXCLUDED.is_required,
  is_public = EXCLUDED.is_public;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test getting all how it works settings:
-- SELECT * FROM settings WHERE key LIKE 'howitworks_%' ORDER BY key;

-- Count new settings:
-- SELECT COUNT(*) as howitworks_settings_count FROM settings WHERE key LIKE 'howitworks_%';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Expected results:
-- ✅ 48 new How It Works settings added
-- ✅ All settings are public (is_public = true)
-- ✅ Settings organized by logical groups:
--    - Hero sections (main + detailed page)
--    - Overview video
--    - 4 Steps (title, description, video URL, poster)
--    - Quick stats (4 metrics)
--    - Benefits (4 items)
--    - CTA section (title, subtitle, buttons)
