import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Approve a campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { notes } = body;

    // Get campaign to check dates
    const { data: campaign } = await supabase
      .from('business_campaigns')
      .select('start_date, end_date')
      .eq('id', id)
      .single();

    if (!campaign) {
      return NextResponse.json({ success: false, error: 'Campaign not found' }, { status: 404 });
    }

    // Determine status based on dates
    const now = new Date();
    const startDate = new Date(campaign.start_date);
    const endDate = new Date(campaign.end_date);

    let newStatus = 'pending_approval';
    if (now >= startDate && now <= endDate) {
      newStatus = 'active';
    } else if (now < startDate) {
      newStatus = 'pending_approval'; // Will auto-activate on start date
    } else {
      newStatus = 'completed';
    }

    // Update campaign
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('business_campaigns')
      .update({
        admin_approved: true,
        status: newStatus,
        admin_reviewed_by: user.id,
        admin_reviewed_at: new Date().toISOString(),
        admin_notes: notes,
        rejection_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error approving campaign:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      message: 'Campaign approved successfully'
    });

  } catch (error: any) {
    console.error('Approve campaign error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to approve campaign'
    }, { status: 500 });
  }
}
