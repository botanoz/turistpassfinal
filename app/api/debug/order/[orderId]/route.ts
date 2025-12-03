import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get order with all fields
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found',
        details: orderError
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order: order,
      invoice_url: order.invoice_url,
      has_invoice: !!order.invoice_url,
      customer_id: session.user.id,
      order_customer_id: order.customer_id,
      is_own_order: session.user.id === order.customer_id
    });

  } catch (error: any) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
