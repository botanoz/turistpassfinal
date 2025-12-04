import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/orders
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const paymentStatus = searchParams.get('paymentStatus') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;
    const targetCurrency = searchParams.get('currency');

    // Resolve target currency (fall back to default)
    let resolvedCurrency = targetCurrency;
    if (!resolvedCurrency) {
      const { data: defaultCurrency } = await supabase.rpc('get_default_currency');
      resolvedCurrency = defaultCurrency || 'TRY';
    }

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        status,
        payment_status,
        payment_method,
        total_amount,
        currency,
        created_at,
        updated_at,
        completed_at,
        refunded_at,
        paid_at,
        confirmed_at,
        pass_delivered_at,
        first_used_at,
        cancelled_at,
        invoice_url,
        receipt_url,
        notes,
        admin_notes,
        customer_profiles (
          first_name,
          last_name,
          email,
          phone
        ),
        order_items (
          id,
          quantity,
          unit_price,
          total_price,
          pass_name
        ),
        refund_requests (
          id,
          request_number,
          status,
          reason_type,
          requested_amount,
          created_at
        )
      `, { count: 'exact' });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply payment status filter
    if (paymentStatus !== 'all') {
      query = query.eq('payment_status', paymentStatus);
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Orders fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
    }

    // Apply search filter (with customer names)
    const filteredOrders = search
      ? (orders || []).filter((order: any) => {
          const customer = order.customer_profiles;
          const customerName = customer
            ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim()
            : '';
          const customerEmail = customer?.email || '';

          return (
            order.order_number.toLowerCase().includes(search.toLowerCase()) ||
            customerName.toLowerCase().includes(search.toLowerCase()) ||
            customerEmail.toLowerCase().includes(search.toLowerCase())
          );
        })
      : (orders || []);

    // Get stats using the database function
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_admin_orders_stats', { target_currency: resolvedCurrency });

    if (statsError) {
      console.error('Stats error:', statsError);
    }

    const stats = statsData && statsData.length > 0 ? statsData[0] : {
      total_orders: 0,
      completed_orders: 0,
      pending_orders: 0,
      total_revenue: 0,
      today_orders: 0,
      today_revenue: 0
    };

    const formattedStats = {
      totalOrders: Number(stats.total_orders),
      completed: Number(stats.completed_orders),
      pending: Number(stats.pending_orders),
      totalRevenue: Number(stats.total_revenue)
    };

    // Format customer names and add refund status
    const formattedOrders = filteredOrders.map((order: any) => ({
      ...order,
      customer_profiles: order.customer_profiles ? {
        full_name: `${order.customer_profiles.first_name || ''} ${order.customer_profiles.last_name || ''}`.trim(),
        email: order.customer_profiles.email,
        phone: order.customer_profiles.phone
      } : null,
      purchased_passes: order.order_items || [],
      has_pending_refund: order.refund_requests?.some((r: any) =>
        ['pending', 'under_review', 'approved'].includes(r.status)
      ) || false
    }));

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      stats: formattedStats,
      currency: resolvedCurrency,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Orders API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/orders (update order status)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { orderId, status, payment_status, admin_notes } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (status) {
      if (!['pending', 'completed', 'cancelled', 'refunded'].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      updateData.status = status;

      if (status === 'completed' && !updateData.completed_at) {
        updateData.completed_at = new Date().toISOString();
      }
      if (status === 'refunded') {
        updateData.refunded_at = new Date().toISOString();
        updateData.payment_status = 'refunded';
      }
    }

    if (payment_status) {
      if (!['pending', 'completed', 'failed', 'refunded'].includes(payment_status)) {
        return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
      }
      updateData.payment_status = payment_status;
    }

    if (admin_notes !== undefined) {
      updateData.admin_notes = admin_notes;
    }

    // Update order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('Order update error:', updateError);
      return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: 'update_order',
        description: `Updated order ${updatedOrder.order_number}`,
        category: 'orders',
        metadata: { orderId, changes: updateData }
      });

    return NextResponse.json({
      success: true,
      order: updatedOrder
    });

  } catch (error) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
