import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Get customer's refund requests
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customerId = session.user.id;

    // Use the helper function to get refund requests
    const { data: refundRequests, error } = await supabase
      .rpc('get_customer_refund_requests', { p_customer_id: customerId });

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
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/refund-requests:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new refund request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = createAdminClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customerId = session.user.id;
    const body = await request.json();
    const { orderId, reasonType, reasonText, requestedAmount } = body;

    // Validate input
    if (!orderId || !reasonType || !reasonText || !requestedAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify order belongs to customer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total_amount, status')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Check if order is eligible for refund
    if (order.status === 'refunded') {
      return NextResponse.json(
        { success: false, error: 'Order has already been refunded' },
        { status: 400 }
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot refund a cancelled order' },
        { status: 400 }
      );
    }

    // Check if refund request already exists (including completed status)
    const { data: existingRequest } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'under_review', 'approved', 'completed'])
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'A refund request for this order is already in progress or has been completed' },
        { status: 400 }
      );
    }

    // CRITICAL: Check if any passes have been used
    const { data: passes, error: passesError } = await supabase
      .from('purchased_passes')
      .select('id, status, usage_count, metadata')
      .eq('order_id', orderId);

    if (passesError) {
      console.error('Error checking passes:', passesError);
      return NextResponse.json(
        { success: false, error: 'Failed to verify pass usage' },
        { status: 500 }
      );
    }

    // Check if any pass has been used (check both usage_count column and metadata)
    if (passes && passes.length > 0) {
      const hasUsedPasses = passes.some(pass => {
        // Suspended passes are OK (they were suspended by previous refund request)
        // Active, pending, and pending_activation passes are OK (not used yet)
        // Cancelled, expired, or used passes are NOT OK
        if (pass.status === 'cancelled' || pass.status === 'expired' || pass.status === 'used') {
          return true;
        }

        // Allow suspended status (pass is already in refund process)
        if (pass.status === 'suspended') {
          return false;
        }

        // Allow pending_activation status (pass not started yet)
        if (pass.status === 'pending_activation') {
          return false;
        }

        // Check usage_count column (primary source of truth)
        const usageCount = (pass as any).usage_count || 0;
        if (usageCount > 0) return true;

        // Also check metadata for usage indicators (if metadata exists)
        const metadata = pass.metadata as any;
        if (metadata) {
          if (metadata.used_count && metadata.used_count > 0) return true;
          if (metadata.visit_count && metadata.visit_count > 0) return true;
          if (metadata.scans && metadata.scans > 0) return true;
          if (metadata.redemptions && metadata.redemptions > 0) return true;
        }

        return false;
      });

      if (hasUsedPasses) {
        return NextResponse.json(
          { success: false, error: 'Cannot request refund for passes that have already been used' },
          { status: 400 }
        );
      }
    }

    // Also check venue_visits table for any visits with this order's passes
    const { data: visits, error: visitsError } = await supabase
      .from('venue_visits')
      .select('id')
      .eq('customer_id', customerId)
      .in('purchased_pass_id', passes?.map(p => p.id) || [])
      .limit(1);

    if (!visitsError && visits && visits.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot request refund - passes have been used at venues' },
        { status: 400 }
      );
    }

    // Generate refund request number
    const { data: requestNumber } = await supabase
      .rpc('generate_refund_request_number');

    // Create refund request
    const { data: refundRequest, error: createError } = await supabase
      .from('refund_requests')
      .insert({
        request_number: requestNumber,
        order_id: orderId,
        customer_id: customerId,
        reason_type: reasonType,
        reason_text: reasonText,
        requested_amount: requestedAmount,
        status: 'pending',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating refund request:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create refund request' },
        { status: 500 }
      );
    }

    // CRITICAL: Suspend all passes for this order immediately
    // First, get the passes to store their previous status
    const { data: passesToSuspend } = await serviceSupabase
      .from('purchased_passes')
      .select('id, status, metadata')
      .eq('order_id', orderId)
      .in('status', ['active', 'pending', 'pending_activation']);

    if (passesToSuspend && passesToSuspend.length > 0) {
      // Update each pass to suspended and store previous status in metadata
      const now = new Date().toISOString();

      for (const pass of passesToSuspend) {
        const updatedMetadata = {
          ...(pass.metadata || {}),
          previous_status: (pass.metadata as any)?.previous_status || pass.status
        };

        const { error: suspendError } = await serviceSupabase
          .from('purchased_passes')
          .update({
            status: 'suspended',
            metadata: updatedMetadata,
            updated_at: now
          })
          .eq('id', pass.id);

        if (suspendError) {
          console.error(`Error suspending pass ${pass.id}:`, suspendError);
        }
      }

      console.log(`Suspended ${passesToSuspend.length} pass(es) for order ${orderId}`);
    }

    // Log customer activity
    await supabase.from('activity_logs').insert({
      user_type: 'customer',
      user_id: customerId,
      action: 'refund_request_created',
      description: `Created refund request ${requestNumber} for order ${order.id}`,
      category: 'refunds',
      metadata: {
        refund_request_id: refundRequest.id,
        order_id: orderId,
        reason_type: reasonType,
        requested_amount: requestedAmount
      }
    });

    return NextResponse.json({
      success: true,
      refundRequest,
      message: 'Refund request submitted successfully. We will review it within 2-3 business days.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/refund-requests:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
