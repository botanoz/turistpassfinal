import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

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

    if (businessError || !business) {
      console.error('Error fetching business:', businessError);
      return NextResponse.json(
        {
          success: false,
          error: 'Business not found'
        },
        { status: 404 }
      );
    }

    // Fetch reviews with service role to bypass RLS and build customer display info
    const { data: reviewsData, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('id, business_id, user_id, rating, comment, created_at')
      .eq('business_id', id)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching business reviews:', reviewsError);
    }

    const userIds = Array.from(
      new Set((reviewsData || []).map((r) => r.user_id).filter(Boolean))
    ) as string[];

    let profilesMap: Record<string, { first_name?: string | null; last_name?: string | null; avatar_url?: string | null }> = {};

    if (userIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('customer_profiles')
        .select('id, first_name, last_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching review authors:', profilesError);
      } else {
        profiles?.forEach((p) => {
          profilesMap[p.id] = {
            first_name: p.first_name,
            last_name: p.last_name,
            avatar_url: p.avatar_url,
          };
        });
      }
    }

    const reviewCount = reviewsData?.length ?? 0;
    const averageRating =
      reviewCount > 0
        ? Number(
            ((reviewsData || []).reduce((sum, r) => sum + (r.rating || 0), 0) / reviewCount).toFixed(1)
          )
        : 0;

    const reviews = (reviewsData || []).map((r) => {
      const profile = r.user_id ? profilesMap[r.user_id] : undefined;
      const fullName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
        : '';

      return {
        id: r.id,
        userId: r.user_id,
        userName: fullName || 'TuristPass User',
        userAvatar: profile?.avatar_url || '',
        rating: r.rating,
        comment: r.comment,
        date: r.created_at,
      };
    });

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
      rating: averageRating,
      reviewCount,
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
      reviews,
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
