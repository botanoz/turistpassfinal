/**
 * Settings Service
 * Handles all settings-related data fetching from Supabase
 */

import { createClient } from '@/lib/supabase/client';

export interface Setting {
  id: string;
  key: string;
  category: string;
  value: string;
  data_type: 'string' | 'number' | 'boolean' | 'json';
  label: string;
  description: string | null;
  placeholder: string | null;
  is_required: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContactInfo {
  // Contact Methods
  whatsapp: string;
  whatsappAvailability: string;
  whatsappDescription: string;
  whatsappUrl: string;
  phone: string;
  phoneAvailability: string;
  phoneDescription: string;
  email: string;
  emailDescription: string;
  emailResponseTime: string;
  supportEmail: string;

  // Office Information
  officeName: string;
  officeAddress: string;
  officeCity: string;
  officeCountry: string;
  officeHoursWeekdays: string;
  officeHoursWeekend: string;
  officeLatitude: string;
  officeLongitude: string;
  officeImageUrl: string;

  // Support Stats
  supportResponseTime: string;
  supportSatisfactionRate: string;
  supportHappyCustomers: string;
  supportWhatsappAvailable: string;

  // Social Media
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  tiktok: string;

  // Newsletter
  newsletterTitle: string;
  newsletterDescription: string;

  // Brand
  brandTagline: string;
  brandDescription: string;
  siteName: string;

  // FAQs
  faqUrgentContact: string;
  faqLostPass: string;
  faqLanguages: string;
  faqOfficeVisit: string;
}

/**
 * Get all settings
 */
export async function getAllSettings(): Promise<Setting[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .order('category', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get settings by category
 */
export async function getSettingsByCategory(category: string): Promise<Setting[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('category', category)
    .order('label', { ascending: true });

  if (error) {
    console.error(`Error fetching ${category} settings:`, error);
    throw error;
  }

  return data || [];
}

/**
 * Get public settings only
 */
export async function getPublicSettings(): Promise<Setting[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('is_public', true)
    .order('category', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('Error fetching public settings:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single setting by key
 */
export async function getSettingByKey(key: string): Promise<string | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    console.error(`Error fetching setting ${key}:`, error);
    return null;
  }

  return data?.value || null;
}

/**
 * Get multiple settings by keys
 */
export async function getSettingsByKeys(keys: string[]): Promise<Record<string, string>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', keys);

  if (error) {
    console.error('Error fetching settings by keys:', error);
    throw error;
  }

  const settings: Record<string, string> = {};
  data?.forEach(setting => {
    settings[setting.key] = setting.value;
  });

  return settings;
}

/**
 * Update a single setting
 */
export async function updateSetting(key: string, value: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from('settings')
    .update({ value })
    .eq('key', key);

  if (error) {
    console.error(`Error updating setting ${key}:`, error);
    throw error;
  }
}

/**
 * Update multiple settings
 */
export async function updateSettings(settings: Record<string, string>): Promise<void> {
  const supabase = createClient();

  // Update each setting one by one
  // Note: Supabase doesn't support batch updates with different values,
  // so we need to do this sequentially or in parallel
  const updates = Object.entries(settings).map(([key, value]) =>
    supabase.from('settings').update({ value }).eq('key', key)
  );

  const results = await Promise.all(updates);

  const errors = results.filter(r => r.error);
  if (errors.length > 0) {
    console.error('Error updating settings:', errors);
    throw new Error('Failed to update some settings');
  }
}

/**
 * Get all contact information (formatted)
 */
export async function getContactInfo(): Promise<ContactInfo> {
  const keys = [
    // Contact Methods
    'contact_whatsapp',
    'contact_whatsapp_availability',
    'contact_whatsapp_description',
    'social_whatsapp_url',
    'contact_phone',
    'contact_phone_availability',
    'contact_phone_description',
    'contact_email',
    'contact_email_description',
    'contact_email_response_time',
    'support_email',

    // Office Info
    'office_name',
    'office_address',
    'office_city',
    'office_country',
    'office_hours_weekdays',
    'office_hours_weekend',
    'office_latitude',
    'office_longitude',
    'office_image_url',

    // Support Stats
    'support_response_time',
    'support_satisfaction_rate',
    'support_happy_customers',
    'support_whatsapp_available',

    // Social Media
    'social_facebook',
    'social_twitter',
    'social_instagram',
    'social_linkedin',
    'social_youtube',
    'social_tiktok',

    // Newsletter
    'newsletter_title',
    'newsletter_description',

    // Brand
    'brand_tagline',
    'brand_description',
    'site_name',

    // FAQs
    'faq_urgent_contact',
    'faq_lost_pass',
    'faq_languages',
    'faq_office_visit',
  ];

  const settings = await getSettingsByKeys(keys);

  return {
    // Contact Methods
    whatsapp: settings['contact_whatsapp'] || '+90 555 123 4567',
    whatsappAvailability: settings['contact_whatsapp_availability'] || '24/7 Available',
    whatsappDescription: settings['contact_whatsapp_description'] || 'Quick responses for all your questions',
    whatsappUrl: settings['social_whatsapp_url'] || 'https://wa.me/905551234567',
    phone: settings['contact_phone'] || '+90 212 345 6789',
    phoneAvailability: settings['contact_phone_availability'] || '9 AM - 10 PM',
    phoneDescription: settings['contact_phone_description'] || 'Call us directly',
    email: settings['contact_email'] || 'info@turistpass.com',
    emailDescription: settings['contact_email_description'] || 'Send us your questions',
    emailResponseTime: settings['contact_email_response_time'] || 'Response within 4 hours',
    supportEmail: settings['support_email'] || 'support@turistpass.com',

    // Office Information
    officeName: settings['office_name'] || 'TuristPass Istanbul Office',
    officeAddress: settings['office_address'] || 'Sultanahmet Square, Eminönü',
    officeCity: settings['office_city'] || 'Istanbul',
    officeCountry: settings['office_country'] || 'Turkey',
    officeHoursWeekdays: settings['office_hours_weekdays'] || 'Monday - Friday: 9:00 AM - 6:00 PM',
    officeHoursWeekend: settings['office_hours_weekend'] || 'Saturday - Sunday: 10:00 AM - 4:00 PM',
    officeLatitude: settings['office_latitude'] || '41.0082',
    officeLongitude: settings['office_longitude'] || '28.9784',
    officeImageUrl: settings['office_image_url'] || 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&h=600&fit=crop',

    // Support Stats
    supportResponseTime: settings['support_response_time'] || '< 4 hrs',
    supportSatisfactionRate: settings['support_satisfaction_rate'] || '98%',
    supportHappyCustomers: settings['support_happy_customers'] || '50K+',
    supportWhatsappAvailable: settings['support_whatsapp_available'] || '24/7',

    // Social Media
    facebook: settings['social_facebook'] || '',
    twitter: settings['social_twitter'] || '',
    instagram: settings['social_instagram'] || '',
    linkedin: settings['social_linkedin'] || '',
    youtube: settings['social_youtube'] || '',
    tiktok: settings['social_tiktok'] || '',

    // Newsletter
    newsletterTitle: settings['newsletter_title'] || 'Free Istanbul travel plans in your inbox!',
    newsletterDescription: settings['newsletter_description'] || 'Subscribe now for expert itineraries and insider tips.',

    // Brand
    brandTagline: settings['brand_tagline'] || 'The smartest and most economical way to explore the city',
    brandDescription: settings['brand_description'] || 'Unlimited access to all the beauty of the city with a single pass.',
    siteName: settings['site_name'] || 'TuristPass',

    // FAQs
    faqUrgentContact: settings['faq_urgent_contact'] || 'For urgent matters, use our WhatsApp which is available 24/7, or call us during business hours.',
    faqLostPass: settings['faq_lost_pass'] || 'Don\'t worry! Your pass is saved digitally in your account. Simply log in to access it again.',
    faqLanguages: settings['faq_languages'] || 'Yes! We provide support in English, Turkish, and several other languages to assist international visitors.',
    faqOfficeVisit: settings['faq_office_visit'] || 'Absolutely! We\'re located in Sultanahmet Square, Eminönü, Istanbul. Visit us during office hours for in-person assistance.',
  };
}

/**
 * Get site settings (for footer, header, etc.)
 */
export async function getSiteSettings() {
  return await getSettingsByCategory('site');
}

/**
 * Get email settings (for admin panel)
 */
export async function getEmailSettings() {
  return await getSettingsByCategory('email');
}

/**
 * Get payment settings (for admin panel)
 */
export async function getPaymentSettings() {
  return await getSettingsByCategory('payment');
}

/**
 * Get general settings (for admin panel)
 */
export async function getGeneralSettings() {
  return await getSettingsByCategory('general');
}

/**
 * How It Works Settings Interface
 */
export interface HowItWorksSettings {
  // Hero
  heroTitle: string;
  heroSubtitle: string;
  detailedTitle: string;
  detailedSubtitle: string;

  // Overview Video
  overviewVideoUrl: string;
  overviewVideoPoster: string;
  overviewVideoTitle: string;

  // Steps
  step1Title: string;
  step1Description: string;
  step1VideoUrl: string;
  step1VideoPoster: string;

  step2Title: string;
  step2Description: string;
  step2VideoUrl: string;
  step2VideoPoster: string;

  step3Title: string;
  step3Description: string;
  step3VideoUrl: string;
  step3VideoPoster: string;

  step4Title: string;
  step4Description: string;
  step4VideoUrl: string;
  step4VideoPoster: string;

  // Stats
  statLocations: string;
  statLocationsLabel: string;
  statCustomers: string;
  statCustomersLabel: string;
  statSavings: string;
  statSavingsLabel: string;
  statRating: string;
  statRatingLabel: string;

  // Benefits
  benefit1Title: string;
  benefit1Description: string;
  benefit2Title: string;
  benefit2Description: string;
  benefit3Title: string;
  benefit3Description: string;
  benefit4Title: string;
  benefit4Description: string;

  // CTA
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButton1Text: string;
  ctaButton1Url: string;
  ctaButton2Text: string;
  ctaButton2Url: string;
}

/**
 * Get How It Works settings (formatted)
 */
export async function getHowItWorksSettings(): Promise<HowItWorksSettings> {
  const keys = [
    // Hero
    'howitworks_hero_title',
    'howitworks_hero_subtitle',
    'howitworks_detailed_title',
    'howitworks_detailed_subtitle',

    // Overview Video
    'howitworks_overview_video_url',
    'howitworks_overview_video_poster',
    'howitworks_overview_video_title',

    // Steps
    'howitworks_step1_title',
    'howitworks_step1_description',
    'howitworks_step1_video_url',
    'howitworks_step1_video_poster',

    'howitworks_step2_title',
    'howitworks_step2_description',
    'howitworks_step2_video_url',
    'howitworks_step2_video_poster',

    'howitworks_step3_title',
    'howitworks_step3_description',
    'howitworks_step3_video_url',
    'howitworks_step3_video_poster',

    'howitworks_step4_title',
    'howitworks_step4_description',
    'howitworks_step4_video_url',
    'howitworks_step4_video_poster',

    // Stats
    'howitworks_stat_locations',
    'howitworks_stat_locations_label',
    'howitworks_stat_customers',
    'howitworks_stat_customers_label',
    'howitworks_stat_savings',
    'howitworks_stat_savings_label',
    'howitworks_stat_rating',
    'howitworks_stat_rating_label',

    // Benefits
    'howitworks_benefit1_title',
    'howitworks_benefit1_description',
    'howitworks_benefit2_title',
    'howitworks_benefit2_description',
    'howitworks_benefit3_title',
    'howitworks_benefit3_description',
    'howitworks_benefit4_title',
    'howitworks_benefit4_description',

    // CTA
    'howitworks_cta_title',
    'howitworks_cta_subtitle',
    'howitworks_cta_button1_text',
    'howitworks_cta_button1_url',
    'howitworks_cta_button2_text',
    'howitworks_cta_button2_url',
  ];

  const settings = await getSettingsByKeys(keys);

  return {
    // Hero
    heroTitle: settings['howitworks_hero_title'] || 'How Does Shopping & Food Pass Work?',
    heroSubtitle: settings['howitworks_hero_subtitle'] || 'Get exclusive discounts at 40+ handpicked locations across Istanbul with just one pass',
    detailedTitle: settings['howitworks_detailed_title'] || 'How Does It Work?',
    detailedSubtitle: settings['howitworks_detailed_subtitle'] || 'Discover Istanbul with TuristPass in just 4 steps! Get instant access to 70+ premium locations and start saving today.',

    // Overview Video
    overviewVideoUrl: settings['howitworks_overview_video_url'] || '/videos/overview.mp4',
    overviewVideoPoster: settings['howitworks_overview_video_poster'] || 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=1200&h=675&fit=crop',
    overviewVideoTitle: settings['howitworks_overview_video_title'] || 'How TuristPass Works?',

    // Steps
    step1Title: settings['howitworks_step1_title'] || 'Purchase Your Pass',
    step1Description: settings['howitworks_step1_description'] || 'Buy your Shopping & Food Pass online in just minutes.',
    step1VideoUrl: settings['howitworks_step1_video_url'] || '/videos/step1-select.mp4',
    step1VideoPoster: settings['howitworks_step1_video_poster'] || 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&h=600&fit=crop',

    step2Title: settings['howitworks_step2_title'] || 'Explore & Visit Partner Locations',
    step2Description: settings['howitworks_step2_description'] || 'Browse through 40+ participating locations across Istanbul.',
    step2VideoUrl: settings['howitworks_step2_video_url'] || '/videos/step2-explore.mp4',
    step2VideoPoster: settings['howitworks_step2_video_poster'] || 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=600&fit=crop',

    step3Title: settings['howitworks_step3_title'] || 'Redeem Your Discounts',
    step3Description: settings['howitworks_step3_description'] || 'Simply show your digital pass at checkout to receive instant discounts.',
    step3VideoUrl: settings['howitworks_step3_video_url'] || '/videos/step3-redeem.mp4',
    step3VideoPoster: settings['howitworks_step3_video_poster'] || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&h=600&fit=crop',

    step4Title: settings['howitworks_step4_title'] || 'Enjoy & Use Unlimited Times',
    step4Description: settings['howitworks_step4_description'] || 'Maximize your savings by using your pass as many times as you want.',
    step4VideoUrl: settings['howitworks_step4_video_url'] || '/videos/step4-savings.mp4',
    step4VideoPoster: settings['howitworks_step4_video_poster'] || 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&h=600&fit=crop',

    // Stats
    statLocations: settings['howitworks_stat_locations'] || '70+',
    statLocationsLabel: settings['howitworks_stat_locations_label'] || 'Partner Locations',
    statCustomers: settings['howitworks_stat_customers'] || '50K+',
    statCustomersLabel: settings['howitworks_stat_customers_label'] || 'Happy Customers',
    statSavings: settings['howitworks_stat_savings'] || '$2.4M',
    statSavingsLabel: settings['howitworks_stat_savings_label'] || 'Total Savings',
    statRating: settings['howitworks_stat_rating'] || '4.9',
    statRatingLabel: settings['howitworks_stat_rating_label'] || 'Customer Rating',

    // Benefits
    benefit1Title: settings['howitworks_benefit1_title'] || 'Instant Activation',
    benefit1Description: settings['howitworks_benefit1_description'] || 'Your pass activates immediately after purchase.',
    benefit2Title: settings['howitworks_benefit2_title'] || 'Secure Payment',
    benefit2Description: settings['howitworks_benefit2_description'] || 'All transactions are protected with 256-bit SSL encryption.',
    benefit3Title: settings['howitworks_benefit3_title'] || 'Customer Satisfaction',
    benefit3Description: settings['howitworks_benefit3_description'] || 'Our 24/7 multilingual customer support team is always ready to assist you.',
    benefit4Title: settings['howitworks_benefit4_title'] || 'Premium Experience',
    benefit4Description: settings['howitworks_benefit4_description'] || 'Get access to exclusive deals and special offers.',

    // CTA
    ctaTitle: settings['howitworks_cta_title'] || 'Ready to Start Your Istanbul Adventure?',
    ctaSubtitle: settings['howitworks_cta_subtitle'] || 'Our 24/7 active support team is ready to help you with any questions',
    ctaButton1Text: settings['howitworks_cta_button1_text'] || 'Buy Pass',
    ctaButton1Url: settings['howitworks_cta_button1_url'] || '/passes',
    ctaButton2Text: settings['howitworks_cta_button2_text'] || 'Live Support',
    ctaButton2Url: settings['howitworks_cta_button2_url'] || '/contact',
  };
}
