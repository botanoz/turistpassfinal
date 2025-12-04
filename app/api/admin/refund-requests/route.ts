import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - List all refund requests with filters
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify admin access
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, role, permissions')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('refund_requests')
      .select(`
        id,
        request_number,
        order_id,
        customer_id,
        reason_type,
        reason_text,
        requested_amount,
        status,
        assigned_to,
        reviewed_by,
        reviewed_at,
        rejection_reason,
        refund_method,
        refund_amount,
        refund_processed_at,
        created_at,
        updated_at,
        orders (
          id,
          order_number,
          total_amount,
          currency,
          currency_code,
          payment_method,
          created_at
        ),
        customer:customer_profiles!customer_id (
          id,
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: refundRequests, error, count } = await query;

    if (error) {
      console.error('Error fetching refund requests:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch refund requests' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      refundRequests: refundRequests || [],
      pagination: {
        total: count || 0,
        limit,
        offset
      }
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/refund-requests:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
