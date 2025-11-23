-- =====================================================
-- MIGRATION: Add Contact Settings
-- =====================================================
-- Description: Add comprehensive contact information settings
-- Dependencies: 009_create_settings_system.sql
-- Date: 2025-01-19
-- =====================================================

-- =====================================================
-- ADD CONTACT SETTINGS
-- =====================================================

-- Contact Methods
INSERT INTO settings (key, category, value, data_type, label, description, placeholder, is_required, is_public) VALUES
  -- WhatsApp
  ('contact_whatsapp', 'site', '+90 555 123 4567', 'string', 'WhatsApp Number', 'WhatsApp contact number with country code', '+90 555 XXX XXXX', false, true),
  ('contact_whatsapp_availability', 'site', '24/7 Available', 'string', 'WhatsApp Availability', 'WhatsApp support availability hours', '24/7 Available', false, true),
  ('contact_whatsapp_description', 'site', 'Quick responses for all your questions', 'string', 'WhatsApp Description', 'Short description for WhatsApp contact', 'Quick responses', false, true),

  -- Phone
  ('contact_phone_description', 'site', 'Call us directly', 'string', 'Phone Description', 'Short description for phone contact', 'Call us directly', false, true),
  ('contact_phone_availability', 'site', '9 AM - 10 PM', 'string', 'Phone Availability', 'Phone support availability hours', '9 AM - 10 PM', false, true),

  -- Email
  ('contact_email_description', 'site', 'Send us your questions', 'string', 'Email Description', 'Short description for email contact', 'Send us your questions', false, true),
  ('contact_email_response_time', 'site', 'Response within 4 hours', 'string', 'Email Response Time', 'Expected email response time', 'Response within 4 hours', false, true),

  -- Office Information
  ('office_name', 'site', 'TuristPass Istanbul Office', 'string', 'Office Name', 'Official office name', 'TuristPass Istanbul Office', false, true),
  ('office_address', 'site', 'Sultanahmet Square, Eminönü', 'string', 'Office Address', 'Office street address', 'Street address', false, true),
  ('office_city', 'site', 'Istanbul', 'string', 'Office City', 'Office city name', 'Istanbul', false, true),
  ('office_country', 'site', 'Turkey', 'string', 'Office Country', 'Office country name', 'Turkey', false, true),
  ('office_hours_weekdays', 'site', 'Monday - Friday: 9:00 AM - 6:00 PM', 'string', 'Office Hours (Weekdays)', 'Office hours for Monday to Friday', 'Monday - Friday: 9:00 AM - 6:00 PM', false, true),
  ('office_hours_weekend', 'site', 'Saturday - Sunday: 10:00 AM - 4:00 PM', 'string', 'Office Hours (Weekend)', 'Office hours for Saturday and Sunday', 'Saturday - Sunday: 10:00 AM - 4:00 PM', false, true),
  ('office_latitude', 'site', '41.0082', 'string', 'Office Latitude', 'Office location latitude coordinate', '41.0082', false, true),
  ('office_longitude', 'site', '28.9784', 'string', 'Office Longitude', 'Office location longitude coordinate', '28.9784', false, true),
  ('office_image_url', 'site', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&h=600&fit=crop', 'string', 'Office Image URL', 'Office location image URL', 'https://example.com/office.jpg', false, true),

  -- Support Statistics
  ('support_response_time', 'site', '< 4 hrs', 'string', 'Support Response Time', 'Average response time for support', '< 4 hrs', false, true),
  ('support_satisfaction_rate', 'site', '98%', 'string', 'Customer Satisfaction Rate', 'Customer satisfaction percentage', '98%', false, true),
  ('support_happy_customers', 'site', '50K+', 'string', 'Happy Customers Count', 'Total happy customers count', '50K+', false, true),
  ('support_whatsapp_available', 'site', '24/7', 'string', 'WhatsApp Support Availability', 'WhatsApp support availability', '24/7', false, true),

  -- Social Media (Additional)
  ('social_youtube', 'site', '', 'string', 'YouTube URL', 'YouTube channel URL', 'https://youtube.com/@yourpage', false, true),
  ('social_tiktok', 'site', '', 'string', 'TikTok URL', 'TikTok profile URL', 'https://tiktok.com/@yourpage', false, true),
  ('social_whatsapp_url', 'site', 'https://wa.me/905551234567', 'string', 'WhatsApp URL', 'WhatsApp direct message URL', 'https://wa.me/90XXXXXXXXXX', false, true),

  -- Newsletter
  ('newsletter_title', 'site', 'Free Istanbul travel plans in your inbox!', 'string', 'Newsletter Title', 'Newsletter subscription section title', 'Newsletter title', false, true),
  ('newsletter_description', 'site', 'Subscribe now for expert itineraries and insider tips.', 'string', 'Newsletter Description', 'Newsletter subscription section description', 'Newsletter description', false, true),

  -- Brand Information
  ('brand_tagline', 'site', 'The smartest and most economical way to explore the city', 'string', 'Brand Tagline', 'Short brand tagline for footer', 'Brand tagline', false, true),
  ('brand_description', 'site', 'Unlimited access to all the beauty of the city with a single pass.', 'string', 'Brand Description', 'Extended brand description for footer', 'Brand description', false, true),

  -- FAQs
  ('faq_urgent_contact', 'site', 'For urgent matters, use our WhatsApp which is available 24/7, or call us during business hours.', 'string', 'FAQ: Urgent Contact', 'FAQ answer for urgent contact question', 'FAQ answer', false, true),
  ('faq_lost_pass', 'site', 'Don''t worry! Your pass is saved digitally in your account. Simply log in to access it again.', 'string', 'FAQ: Lost Pass', 'FAQ answer for lost pass question', 'FAQ answer', false, true),
  ('faq_languages', 'site', 'Yes! We provide support in English, Turkish, and several other languages to assist international visitors.', 'string', 'FAQ: Languages', 'FAQ answer for language support question', 'FAQ answer', false, true),
  ('faq_office_visit', 'site', 'Absolutely! We''re located in Sultanahmet Square, Eminönü, Istanbul. Visit us during office hours for in-person assistance.', 'string', 'FAQ: Office Visit', 'FAQ answer for office visit question', 'FAQ answer', false, true)

ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  data_type = EXCLUDED.data_type,
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  placeholder = EXCLUDED.placeholder,
  is_required = EXCLUDED.is_required,
  is_public = EXCLUDED.is_public;

-- =====================================================
-- UPDATE EXISTING SETTINGS
-- =====================================================

-- Update existing contact email to be more descriptive
UPDATE settings
SET label = 'Contact Email (General)',
    description = 'General contact email address for inquiries'
WHERE key = 'contact_email';

UPDATE settings
SET label = 'Contact Email (Support)',
    description = 'Customer support email for assistance'
WHERE key = 'support_email';

UPDATE settings
SET label = 'Contact Phone (Main)',
    description = 'Main office phone number',
    value = '+90 212 345 6789'
WHERE key = 'contact_phone';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Test getting all site settings:
-- SELECT * FROM settings WHERE category = 'site' ORDER BY label;

-- Test getting contact-related settings:
-- SELECT * FROM settings WHERE key LIKE 'contact_%' OR key LIKE 'office_%' OR key LIKE 'support_%' ORDER BY key;

-- Count new settings:
-- SELECT COUNT(*) as new_contact_settings FROM settings WHERE key LIKE 'contact_%' OR key LIKE 'office_%' OR key LIKE 'support_%' OR key LIKE 'newsletter_%' OR key LIKE 'brand_%' OR key LIKE 'faq_%';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Expected results:
-- ✅ 33 new contact-related settings added
-- ✅ 3 existing settings updated
-- ✅ All settings are public (is_public = true)
-- ✅ Settings organized by logical groups:
--    - Contact methods (WhatsApp, Phone, Email)
--    - Office information
--    - Support statistics
--    - Social media links
--    - Newsletter info
--    - Brand information
--    - FAQ content
