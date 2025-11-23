/**
 * Pass Service
 * Handles all pass-related data fetching from Supabase
 */

import { createClient } from '@/lib/supabase/client';

export interface PassPricing {
  id: string;
  pass_id: string;
  days: number;
  age_group: 'adult' | 'child' | 'student' | 'senior';
  price: number;
  created_at: string;
}

export interface PassBusiness {
  id: string;
  pass_id: string;
  business_id: string;
  discount: number;
  usage_type: 'once' | 'unlimited' | 'limited';
  max_usage: number | null;
  created_at: string;
  business?: {
    id: string;
    name: string;
    category: string;
    image_url: string | null;
    gallery_images: string[] | null;
    address: string | null;
  };
}

export interface Pass {
  id: string;
  name: string;
  description: string;
  short_description: string | null;
  status: 'active' | 'inactive' | 'draft';
  featured: boolean;
  popular: boolean;
  features: string[];
  benefits: string[];
  hero_title: string | null;
  hero_subtitle: string | null;
  about_content: string | null;
  cancellation_policy: string | null;
  image_url: string | null;
  gallery_images: string[] | null;
  total_sold: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
  pricing?: PassPricing[];
  businesses?: PassBusiness[];
}

/**
 * Fetch all active passes with their pricing and businesses
 */
export async function getActivePasses(): Promise<Pass[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('passes')
    .select(`
      *,
      pricing:pass_pricing(*),
      businesses:pass_businesses(
        *,
        business:businesses(*)
      )
    `)
    .eq('status', 'active')
    .order('popular', { ascending: false })
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching passes:', error);
    throw error;
  }

  return data || [];
}
