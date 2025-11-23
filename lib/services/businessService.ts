/**
 * Business Service
 * Handles all business-related data fetching from Supabase
 */

import { createClient } from '@/lib/supabase/client';

export interface Business {
  id: string;
  name: string;
  category: string;
  description: string | null;
  short_description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  gallery_images: string[] | null;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  business_accounts?: Array<{
    metadata: {
      profile?: {
        images?: string[];
      };
    } | null;
  }>;
}

/**
 * Fetch all active businesses
 */
export async function getActiveBusinesses(): Promise<Business[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      business_accounts(
        metadata
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching businesses:', error);
    throw error;
  }

  return data || [];
}

/**
 * Fetch all businesses for Popular Places section (all categories)
 */
export async function getAllBusinessesForPlaces(): Promise<Business[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('businesses')
    .select(`
      *,
      business_accounts(
        metadata
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching businesses for places:', error);
    throw error;
  }

  return data || [];
}
