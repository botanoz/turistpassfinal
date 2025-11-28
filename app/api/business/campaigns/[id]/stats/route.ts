import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get campaign statistics
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify campaign belongs to business
    const { data: campaign } = await supabase
      .from('business_campaigns')
      .select('business_id')
      .eq('id', id)
      .single();

    if (!campaign || campaign.business_id !== businessAccount.business_id) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Get campaign stats using RPC function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_campaign_stats', { campaign_uuid: id });

    if (statsError) {
      console.error('Error fetching campaign stats:', statsError);
      throw statsError;
    }

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get campaign stats error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch campaign statistics'
    }, { status: 500 });
  }
}
