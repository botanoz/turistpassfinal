-- =====================================================
-- Hero Section Settings
-- =====================================================
-- Description: Add hero section configuration settings
-- Date: 2025-01-24
-- =====================================================

-- Hero Title & Description
INSERT INTO settings (key, category, value, data_type, label, description, placeholder, is_required, is_public) VALUES
  ('hero_title', 'site', 'The Smartest Way', 'string', 'Hero Title', 'Main hero section title', 'The Smartest Way', true, true),
  ('hero_subtitle', 'site', 'To Explore', 'string', 'Hero Subtitle', 'Hero section subtitle (highlighted text)', 'To Explore', true, true),
  ('hero_description', 'site', 'Unlimited access to the city''s most popular attractions and special advantages with a single digital pass', 'string', 'Hero Description', 'Hero section description text', 'Unlimited access...', true, true),

  -- Hero Stats
  ('hero_stat1_value', 'site', '50K+', 'string', 'Stat 1 - Value', 'First statistic value', '50K+', false, true),
  ('hero_stat1_label', 'site', 'Happy Users', 'string', 'Stat 1 - Label', 'First statistic label', 'Happy Users', false, true),

  ('hero_stat2_value', 'site', '4.8/5', 'string', 'Stat 2 - Value', 'Second statistic value', '4.8/5', false, true),
  ('hero_stat2_label', 'site', 'User Rating', 'string', 'Stat 2 - Label', 'Second statistic label', 'User Rating', false, true),

  ('hero_stat3_value', 'site', '40+', 'string', 'Stat 3 - Value', 'Third statistic value', '40+', false, true),
  ('hero_stat3_label', 'site', 'Premium Venues', 'string', 'Stat 3 - Label', 'Third statistic label', 'Premium Venues', false, true),

  ('hero_stat4_value', 'site', '35%', 'string', 'Stat 4 - Value', 'Fourth statistic value', '35%', false, true),
  ('hero_stat4_label', 'site', 'Average Savings', 'string', 'Stat 4 - Label', 'Fourth statistic label', 'Average Savings', false, true),

  -- Hero Features
  ('hero_feature1_text', 'site', '40+ Popular Places', 'string', 'Feature 1 - Text', 'First feature text', '40+ Popular Places', false, true),
  ('hero_feature1_icon', 'site', 'Compass', 'string', 'Feature 1 - Icon', 'First feature icon name (Lucide icon)', 'Compass', false, true),

  ('hero_feature2_text', 'site', 'Special Benefits', 'string', 'Feature 2 - Text', 'Second feature text', 'Special Benefits', false, true),
  ('hero_feature2_icon', 'site', 'Star', 'string', 'Feature 2 - Icon', 'Second feature icon name (Lucide icon)', 'Star', false, true),

  ('hero_feature3_text', 'site', '24/7 Valid', 'string', 'Feature 3 - Text', 'Third feature text', '24/7 Valid', false, true),
  ('hero_feature3_icon', 'site', 'Clock', 'string', 'Feature 3 - Icon', 'Third feature icon name (Lucide icon)', 'Clock', false, true),

  ('hero_feature4_text', 'site', 'Skip The Lines', 'string', 'Feature 4 - Text', 'Fourth feature text', 'Skip The Lines', false, true),
  ('hero_feature4_icon', 'site', 'Ticket', 'string', 'Feature 4 - Icon', 'Fourth feature icon name (Lucide icon)', 'Ticket', false, true),

  ('hero_feature5_text', 'site', '3 Month Validity', 'string', 'Feature 5 - Text', 'Fifth feature text', '3 Month Validity', false, true),
  ('hero_feature5_icon', 'site', 'Calendar', 'string', 'Feature 5 - Icon', 'Fifth feature icon name (Lucide icon)', 'Calendar', false, true),

  -- Hero CTA Button
  ('hero_cta_text', 'site', 'Buy Pass Now', 'string', 'CTA Button Text', 'Hero section call-to-action button text', 'Buy Pass Now', true, true),
  ('hero_cta_url', 'site', '#passes-section', 'string', 'CTA Button URL', 'Hero section call-to-action button URL or anchor', '#passes-section', true, true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  placeholder = EXCLUDED.placeholder,
  is_public = EXCLUDED.is_public,
  updated_at = NOW();

-- Add comment
COMMENT ON COLUMN settings.key IS 'Unique setting identifier. Hero settings use hero_* prefix';
