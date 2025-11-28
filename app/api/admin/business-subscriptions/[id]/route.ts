import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Update subscription status
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
    const { status } = body;

    if (!status) {
      return NextResponse.json({
        success: false,
        error: 'Status is required'
      }, { status: 400 });
    }

    // Update subscription status
    const { data: subscription, error: updateError } = await supabase
      .from('business_subscriptions')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      subscription,
      message: `Subscription ${status === 'active' ? 'reactivated' : 'updated'} successfully`
    });

  } catch (error: any) {
    console.error('Update subscription error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update subscription'
    }, { status: 500 });
  }
}
