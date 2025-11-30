import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

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

    const businessIds = new Set<string>();
    passData.businesses?.forEach((pb: any) => {
      if (pb?.business?.id) businessIds.add(pb.business.id);
    });

    let reviewStats: Record<string, { average: number; count: number }> = {};

    if (businessIds.size > 0) {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: reviews, error: reviewsError } = await supabaseAdmin
          .from('reviews')
          .select('business_id, rating')
          .in('business_id', Array.from(businessIds));

        if (reviewsError) {
          console.error('Error fetching review data for pass businesses:', reviewsError);
        } else {
          const grouped: Record<string, number[]> = {};
          (reviews || []).forEach((row: any) => {
            if (!row.business_id) return;
            (grouped[row.business_id] ||= []).push(Number(row.rating || 0));
          });

          Object.entries(grouped).forEach(([bizId, ratings]) => {
            const count = ratings.length;
            const avg = count > 0 ? ratings.reduce((s, r) => s + r, 0) / count : 0;
            reviewStats[bizId] = {
              average: Number(avg.toFixed(1)),
              count,
            };
          });
        }
      } catch (aggError) {
        console.error('Failed to load review stats for pass businesses:', aggError);
      }
    }

    // Extract businesses from the nested structure and transform data
    const businesses = passData.businesses?.map((pb: any) => {
      const business = pb.business;
      if (!business) return null;

      const stats = reviewStats[business.id] || { average: 0, count: 0 };

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
        rating: stats.average,
        reviewCount: stats.count,
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
