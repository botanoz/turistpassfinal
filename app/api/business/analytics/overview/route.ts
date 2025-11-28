import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get business analytics overview
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get business account
    const { data: businessAccount } = await supabase
      .from('business_accounts')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!businessAccount) {
      return NextResponse.json({ success: false, error: 'Business account not found' }, { status: 404 });
    }

    // Get all campaigns for the business
    const { data: campaigns } = await supabase
      .from('business_campaigns')
      .select('id, status')
      .eq('business_id', businessAccount.business_id);

    const totalCampaigns = campaigns?.length || 0;
    const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;

    // Get aggregated stats from campaign_analytics_daily
    const { data: analyticsData } = await supabase
      .from('campaign_analytics_daily')
      .select('views, clicks, redemptions, total_discount_given, total_revenue_generated')
      .eq('business_id', businessAccount.business_id);

    let totalViews = 0;
    let totalClicks = 0;
    let totalRedemptions = 0;
    let totalDiscountGiven = 0;
    let totalRevenueGenerated = 0;

    if (analyticsData) {
      analyticsData.forEach(row => {
        totalViews += row.views || 0;
        totalClicks += row.clicks || 0;
        totalRedemptions += row.redemptions || 0;
        totalDiscountGiven += parseFloat(row.total_discount_given?.toString() || '0');
        totalRevenueGenerated += parseFloat(row.total_revenue_generated?.toString() || '0');
      });
    }

    const avgConversionRate = totalClicks > 0 ? (totalRedemptions / totalClicks) * 100 : 0;

    const stats = {
      total_campaigns: totalCampaigns,
      active_campaigns: activeCampaigns,
      total_views: totalViews,
      total_clicks: totalClicks,
      total_redemptions: totalRedemptions,
      total_discount_given: totalDiscountGiven,
      total_revenue_generated: totalRevenueGenerated,
      avg_conversion_rate: avgConversionRate
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get analytics overview error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch analytics overview'
    }, { status: 500 });
  }
}
