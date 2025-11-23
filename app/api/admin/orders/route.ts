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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('orders')
      .select(`
        id,
        order_number,
        customer_id,
        status,
        total_amount,
        currency,
        payment_method,
        payment_status,
        created_at,
        completed_at,
        customer_profiles (
          first_name,
          last_name,
          email
        )
      `, { count: 'exact' });

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
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

    // Get order items for each order
    const ordersWithItems = await Promise.all(
      (orders || []).map(async (order: any) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);

        const customer = order.customer_profiles;
        const customerName = customer
          ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || customer.email
          : 'Unknown';

        // Get pass name from first item
        const passName = items && items.length > 0 ? items[0].pass_name : 'Unknown Pass';

        return {
          id: order.order_number,
          orderId: order.id,
          customer: customerName,
          customerEmail: customer?.email || '',
          pass: passName,
          amount: order.total_amount,
          currency: order.currency || 'TRY',
          date: order.created_at,
          status: order.status,
          payment_status: order.payment_status,
          items: items || [],
          itemCount: items?.length || 0
        };
      })
    );

    // Apply search filter (after fetching customer names)
    const filteredOrders = search
      ? ordersWithItems.filter(order =>
          order.id.toLowerCase().includes(search.toLowerCase()) ||
          order.customer.toLowerCase().includes(search.toLowerCase()) ||
          order.customerEmail.toLowerCase().includes(search.toLowerCase())
        )
      : ordersWithItems;

    // Get stats using the database function
    const { data: statsData, error: statsError } = await supabase
      .rpc('get_admin_orders_stats');

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

    return NextResponse.json({
      orders: filteredOrders,
      stats: formattedStats,
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
