import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get single refund request details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      .select('id')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const refundId = id;

    // Fetch refund request with related data
    const { data: refundRequest, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        orders (
          id,
          order_number,
          total_amount,
          subtotal,
          discount_amount,
          currency,
          currency_code,
          payment_method,
          payment_status,
          status,
          created_at,
          completed_at,
          order_items (
            id,
            pass_name,
            pass_type,
            quantity,
            unit_price,
            total_price
          )
        ),
        customer:customer_profiles!customer_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        reviewer:admin_profiles!reviewed_by (
          id,
          name,
          email
        )
      `)
      .eq('id', refundId)
      .single();

    if (error || !refundRequest) {
      return NextResponse.json(
        { success: false, error: 'Refund request not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      refundRequest
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/refund-requests/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update refund request (approve/reject/process)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;
    const refundId = id;
    const body = await request.json();
    const { action, rejection_reason, refund_method, refund_amount, admin_notes } = body;

    // Get current refund request
    const { data: refundRequest, error: fetchError } = await supabase
      .from('refund_requests')
      .select('*, orders!inner(id, status, total_amount, order_number)')
      .eq('id', refundId)
      .single();

    if (fetchError || !refundRequest) {
      return NextResponse.json(
        { success: false, error: 'Refund request not found' },
        { status: 404 }
      );
    }

    let updateData: any = {
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (admin_notes) {
      updateData.admin_notes = admin_notes;
    }

    // Handle different actions
    switch (action) {
      case 'approve':
        if (refundRequest.status !== 'pending' && refundRequest.status !== 'under_review') {
          return NextResponse.json(
            { success: false, error: 'Can only approve pending/under review requests' },
            { status: 400 }
          );
        }
        updateData.status = 'approved';
        updateData.refund_method = refund_method || 'original_payment';
        updateData.refund_amount = refund_amount || refundRequest.requested_amount;
        break;

      case 'reject':
        if (refundRequest.status !== 'pending' && refundRequest.status !== 'under_review') {
          return NextResponse.json(
            { success: false, error: 'Can only reject pending/under review requests' },
            { status: 400 }
          );
        }
        if (!rejection_reason) {
          return NextResponse.json(
            { success: false, error: 'Rejection reason is required' },
            { status: 400 }
          );
        }
        updateData.status = 'rejected';
        updateData.rejection_reason = rejection_reason;
        break;

      case 'mark_completed':
        if (refundRequest.status !== 'approved') {
          return NextResponse.json(
            { success: false, error: 'Can only mark approved requests as completed' },
            { status: 400 }
          );
        }
        updateData.status = 'completed';
        updateData.refund_processed_at = new Date().toISOString();

        // Update order status to refunded
        const { error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'refunded', payment_status: 'refunded' })
          .eq('id', refundRequest.order_id);

        if (orderUpdateError) {
          console.error('Error updating order status:', orderUpdateError);
        }
        break;

      case 'assign':
        updateData.assigned_to = user.id;
        updateData.assigned_at = new Date().toISOString();
        if (refundRequest.status === 'pending') {
          updateData.status = 'under_review';
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update refund request
    const { data: updatedRefund, error: updateError } = await supabase
      .from('refund_requests')
      .update(updateData)
      .eq('id', refundId)
      .select(`
        *,
        orders (
          id,
          order_number,
          total_amount
        ),
        customer:customer_profiles!customer_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating refund request:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update refund request' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_type: 'admin',
      user_id: user.id,
      action: `refund_${action}`,
      description: `Refund request ${refundRequest.request_number} ${action}ed`,
      category: 'refunds',
      metadata: {
        refund_request_id: refundId,
        order_id: refundRequest.order_id,
        action,
        previous_status: refundRequest.status,
        new_status: updateData.status
      }
    });

    return NextResponse.json({
      success: true,
      refundRequest: updatedRefund,
      message: `Refund request ${action}ed successfully`
    });
  } catch (error: any) {
    console.error('Error in PATCH /api/admin/refund-requests/[id]:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}