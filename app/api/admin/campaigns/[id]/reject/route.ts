import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Reject a campaign
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
    const { notes, rejection_reason } = body;

    if (!rejection_reason) {
      return NextResponse.json({
        success: false,
        error: 'Rejection reason is required'
      }, { status: 400 });
    }

    // Update campaign
    const { data: updatedCampaign, error: updateError } = await supabase
      .from('business_campaigns')
      .update({
        admin_approved: false,
        status: 'rejected',
        admin_reviewed_by: user.id,
        admin_reviewed_at: new Date().toISOString(),
        admin_notes: notes,
        rejection_reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error rejecting campaign:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      campaign: updatedCampaign,
      message: 'Campaign rejected'
    });

  } catch (error: any) {
    console.error('Reject campaign error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to reject campaign'
    }, { status: 500 });
  }
}
