import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Get order statistics
    const { data: orders, error } = await supabase
      .from('orders')
      .select('status, payment_status, total_amount, invoice_url, receipt_url');

    if (error) {
      console.error('Error fetching order stats:', error);
      return NextResponse.json({
        success: false,
        error: error.message || 'Failed to fetch order stats'
      }, { status: 500 });
    }

    // Calculate stats
    const stats = {
      total_orders: orders.length,
      pending_amount: orders
        .filter(o => o.payment_status === 'pending')
        .reduce((sum, o) => sum + Number(o.total_amount), 0),
      completed_amount: orders
        .filter(o => o.payment_status === 'completed')
        .reduce((sum, o) => sum + Number(o.total_amount), 0),
      pending_invoice_count: orders
        .filter(o => o.payment_status === 'completed' && !o.invoice_url)
        .length,
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Error in order stats API:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
