import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Fetch pass with its businesses (only columns that exist)
    const { data: passData, error: passError } = await supabase
      .from('passes')
      .select(`
        id,
        name,
        description,
        short_description,
        status,
        businesses:pass_businesses(
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
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (passError) {
      console.error('Error fetching pass businesses:', passError);
      return NextResponse.json({
        success: false,
        error: 'Pass not found'
      }, { status: 404 });
    }

    // Extract businesses from the nested structure and transform data
    const businesses = passData.businesses?.map((pb: any) => {
      const business = pb.business;
      if (!business) return null;

      // Transform to match expected format
      return {
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
      };
    }).filter(Boolean) || [];

    return NextResponse.json({
      success: true,
      pass: {
        id: passData.id,
        name: passData.name,
        description: passData.description,
        short_description: passData.short_description
      },
      businesses
    });

  } catch (error: any) {
    console.error('Pass businesses fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch pass businesses'
    }, { status: 500 });
  }
}
