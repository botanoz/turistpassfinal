import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

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

    // Get all orders for this customer with related data
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        subtotal,
        discount_amount,
        currency,
        payment_method,
        payment_status,
        created_at,
        completed_at,
        invoice_url,
        receipt_url,
        order_items (
          id,
          pass_id,
          pass_name,
          pass_type,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch orders',
          details: error.message || error.hint || 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Get pending refund requests for these orders
    const orderIds = (orders || []).map(o => o.id);
    let pendingRefunds: Record<string, boolean> = {};

    if (orderIds.length > 0) {
      const { data: refundRequests } = await supabase
        .from('refund_requests')
        .select('order_id, status')
        .in('order_id', orderIds)
        .in('status', ['pending', 'under_review']);

      if (refundRequests) {
        refundRequests.forEach(req => {
          pendingRefunds[req.order_id] = true;
        });
      }
    }

    // Add has_pending_refund flag to each order
    const ordersWithRefundStatus = (orders || []).map(order => ({
      ...order,
      has_pending_refund: pendingRefunds[order.id] || false
    }));

    return NextResponse.json({
      success: true,
      orders: ordersWithRefundStatus,
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
