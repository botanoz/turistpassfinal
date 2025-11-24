import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    console.log('=== Starting passes fetch ===');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
    console.log('SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

    // Try using regular client first (with RLS)
    console.log('Trying regular client with RLS...');
    let supabase = await createClient();
    console.log('Regular client created successfully');

    // First, try a simple query to see if passes exist
    console.log('Attempting simple query...');
    const { data: simplePasses, error: simpleError } = await supabase
      .from('passes')
      .select('id, name, status')
      .eq('status', 'active');

    console.log('Simple query result:', {
      count: simplePasses?.length || 0,
      passes: simplePasses,
      error: simpleError,
      errorDetails: simpleError ? JSON.stringify(simpleError, null, 2) : null
    });

    if (simpleError) {
      console.error('Simple query failed:', simpleError);
      console.error('Error code:', simpleError.code);
      console.error('Error hint:', simpleError.hint);
      console.error('Error details:', simpleError.details);
      throw simpleError;
    }

    // If no passes found, return empty array
    if (!simplePasses || simplePasses.length === 0) {
      console.log('No active passes found in database');
      return NextResponse.json({
        success: true,
        passes: []
      });
    }

    // Now try the full query (only fetch columns that definitely exist)
    const { data, error } = await supabase
      .from('passes')
      .select(`
        *,
        pricing:pass_pricing(*),
        businesses:pass_businesses(
          business_id,
          pass_id,
          business:businesses(
            id,
            name,
            description,
            category,
            address,
            district,
            city,
            latitude,
            longitude,
            image_url,
            gallery_images
          )
        )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching passes:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to fetch passes',
        details: error
      }, { status: 500 });
    }

    console.log('Fetched passes count:', data?.length || 0);

    // Transform business data to match expected format
    const transformedPasses = data?.map(pass => ({
      ...pass,
      businesses: pass.businesses?.map((pb: any) => {
        const business = pb.business;
        if (!business) return null;

        return {
          ...pb,
          business: {
            id: business.id,
            name: business.name,
            description: business.description,
            category: business.category,
            location: {
              address: business.address,
              district: business.district,
              city: business.city,
              coordinates: {
                lat: business.latitude,
                lng: business.longitude
              }
            },
            images: business.gallery_images || (business.image_url ? [business.image_url] : []),
            rating: 4.5, // Default rating
            opening_hours: {}, // Default empty object
            amenities: [], // Default empty array
            tags: [], // Default empty array
            price_range: '$$' // Default price range
          }
        };
      }).filter(Boolean) || []
    })) || [];

    return NextResponse.json({
      success: true,
      passes: transformedPasses
    });

  } catch (error: any) {
    console.error('=== Passes fetch error ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    console.error('Full error:', JSON.stringify(error, null, 2));

    // Return empty passes array as fallback instead of error
    // This allows the Places page to load even if there's a database issue
    console.log('Returning empty passes array as fallback');
    return NextResponse.json({
      success: true,
      passes: [],
      warning: 'Could not fetch passes from database',
      error: error?.message
    });
  }
}
