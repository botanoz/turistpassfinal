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
        order_items (
          id,
          pass_id,
          pass_name,
          pass_type,
          quantity,
          unit_price,
          total_price,
          passes (
            id,
            name,
            description,
            image_url
          )
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

    return NextResponse.json({
      success: true,
      orders: orders || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/orders:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
