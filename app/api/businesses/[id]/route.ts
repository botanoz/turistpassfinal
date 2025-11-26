import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    console.log('Fetching business with id:', id);

    // Fetch business details
    // Only fetch columns that exist in database
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select(`
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
        gallery_images,
        created_at
      `)
      .eq('id', id)
      .single();

    if (businessError) {
      console.error('Error fetching business:', businessError);
      return NextResponse.json({
        success: false,
        error: 'Business not found'
      }, { status: 404 });
    }

    // Get passes this business is included in
    const { data: passBusinesses, error: passError } = await supabase
      .from('pass_businesses')
      .select(`
        pass:passes(
          id,
          name,
          description,
          short_description
        )
      `)
      .eq('business_id', id);

    const passes = passBusinesses?.map((pb: any) => pb.pass).filter(Boolean) || [];

    // Transform to match expected format
    const transformedBusiness = {
      id: business.id,
      name: business.name,
      slug: business.id, // Using ID as slug for now
      description: business.description,
      shortDescription: business.description?.substring(0, 150) + '...' || '',
      categoryId: business.category || 'restaurant',
      passIds: passes.map((p: any) => p.id),
      images: [
        ...(business.image_url ? [{
          url: business.image_url,
          alt: business.name,
          type: 'main'
        }] : []),
        ...(business.gallery_images || []).map((url: string, idx: number) => ({
          url,
          alt: `${business.name} ${idx + 1}`,
          type: 'gallery'
        }))
      ],
      rating: 4.5, // Default rating
      reviewCount: 0, // Default review count
      location: {
        district: business.district || business.city || '',
        address: business.address || '',
        city: business.city || '',
        coordinates: {
          lat: business.latitude || 0,
          lng: business.longitude || 0
        }
      },
      contact: {
        email: '', // Default empty - column doesn't exist in database
        phone: '', // Default empty - column doesn't exist in database
        website: '' // Default empty - column doesn't exist in database
      },
      openHours: {}, // Default empty
      amenities: [], // Default empty
      tags: [], // Default empty
      priceRange: '$$', // Default
      passes: passes,
      businessInfo: {
        type: business.category || 'Business',
        established: business.created_at ? new Date(business.created_at).getFullYear().toString() : undefined
      },
      // Empty defaults for other fields
      offerDescription: undefined,
      activities: [],
      menu: [],
      needToKnowInfo: undefined,
      announcements: [],
      reviews: [],
      branches: []
    };

    return NextResponse.json({
      success: true,
      business: transformedBusiness
    });

  } catch (error: any) {
    console.error('Business fetch error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch business'
    }, { status: 500 });
  }
}
