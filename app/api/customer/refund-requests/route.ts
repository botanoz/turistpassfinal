import { createClient } from '@/lib/supabase/server';
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

    // Check if refund request already exists
    const { data: existingRequest } = await supabase
      .from('refund_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'under_review', 'approved'])
      .single();

    if (existingRequest) {
      return NextResponse.json(
        { success: false, error: 'A refund request for this order is already in progress' },
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
