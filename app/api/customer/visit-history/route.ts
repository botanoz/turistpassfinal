import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { data: visits, error: visitsError } = await supabase
      .from('venue_visits')
      .select(`
        id,
        visit_date,
        check_in_time,
        check_out_time,
        discount_used,
        discount_amount,
        rating,
        review,
        status,
        would_recommend,
        businesses!venue_visits_business_id_fkey(
          id,
          name,
          category,
          image_url,
          address
        ),
        purchased_passes!venue_visits_pass_id_fkey(
          id,
          pass_name,
          pass_type
        )
      `)
      .eq('customer_id', user.id)
      .eq('status', 'completed')
      .order('visit_date', { ascending: false })
      .limit(100);

    if (visitsError) {
      console.error('Error fetching visit history:', visitsError);
      throw visitsError;
    }

    const normalizedVisits = (visits || []).map((visit: any) => ({
      id: visit.id,
      visitDate: visit.visit_date,
      checkIn: visit.check_in_time,
      checkOut: visit.check_out_time,
      discountUsed: visit.discount_used || 0,
      discountAmount: Number(visit.discount_amount || 0),
      rating: visit.rating,
      review: visit.review,
      status: visit.status,
      wouldRecommend: visit.would_recommend,
      venue: visit.businesses ? {
        id: visit.businesses.id,
        name: visit.businesses.name,
        category: visit.businesses.category,
        imageUrl: visit.businesses.image_url,
        address: visit.businesses.address
      } : null,
      pass: visit.purchased_passes ? {
        id: visit.purchased_passes.id,
        name: visit.purchased_passes.pass_name,
        type: visit.purchased_passes.pass_type
      } : null
    }));

    const fallbackSummary = {
      totalVisits: normalizedVisits.length,
      uniqueVenues: new Set(normalizedVisits.map(v => v.venue?.id).filter(Boolean)).size,
      totalSavings: normalizedVisits.reduce((sum, visit) => sum + (visit.discountAmount || 0), 0),
      favoriteCategory: null as string | null,
      lastVisitDate: normalizedVisits[0]?.visitDate || null
    };

    let summary = fallbackSummary;

    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_customer_visit_summary', { customer_uuid: user.id })
      .single();

    if (summaryError) {
      console.warn('Visit summary RPC failed, using fallback:', summaryError.message);
    } else if (summaryData) {
      const data = summaryData as any;
      summary = {
        totalVisits: data.total_visits ?? fallbackSummary.totalVisits,
        uniqueVenues: data.unique_venues ?? fallbackSummary.uniqueVenues,
        totalSavings: Number(data.total_savings ?? fallbackSummary.totalSavings),
        favoriteCategory: data.favorite_category ?? fallbackSummary.favoriteCategory,
        lastVisitDate: data.last_visit_date ?? fallbackSummary.lastVisitDate
      };
    }

    return NextResponse.json({
      success: true,
      visits: normalizedVisits,
      summary
    });
  } catch (error: any) {
    console.error('Customer visit history API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch visit history'
    }, { status: 500 });
  }
}
