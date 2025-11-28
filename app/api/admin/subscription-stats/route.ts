import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get subscription statistics for admin dashboard
export async function GET() {
  try {
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

    // Get subscription stats using RPC function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_subscription_stats');

    if (statsError) {
      console.error('Error fetching subscription stats:', statsError);
      throw statsError;
    }

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get subscription stats error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch subscription statistics'
    }, { status: 500 });
  }
}
