import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin
    const { data: admin } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { orderId } = await params;

    // Get timeline using helper function
    const { data: timeline, error } = await supabase
      .rpc('get_order_timeline', { p_order_id: orderId });

    if (error) {
      console.error('Error fetching timeline:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch timeline' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      timeline: timeline || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/orders/[orderId]/timeline:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
