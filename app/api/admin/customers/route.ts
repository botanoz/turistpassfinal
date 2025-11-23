import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/customers
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
      .from('customer_profiles')
      .select('*', { count: 'exact' });

    // Apply search filter
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: customers, error, count } = await query;

    if (error) {
      console.error('Customers fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }

    // Get orders count for each customer
    const customersWithOrders = await Promise.all(
      (customers || []).map(async (customer) => {
        const { data: ordersData } = await supabase
          .from('orders')
          .select('id, status, total_amount, payment_status', { count: 'exact' })
          .eq('customer_id', customer.id);

        const { data: passesData } = await supabase
          .from('purchased_passes')
          .select('id', { count: 'exact' })
          .eq('customer_id', customer.id)
          .eq('status', 'active');

        return {
          id: customer.id,
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'N/A',
          email: customer.email,
          phone: customer.phone || 'N/A',
          passes: passesData?.length || 0,
          totalSpent: customer.total_spent || 0,
          status: customer.status,
          joinDate: customer.joined_date,
          avatar_url: customer.avatar_url,
          created_at: customer.created_at
        };
      })
    );

    // Calculate stats
    const allCustomers = await supabase
      .from('customer_profiles')
      .select('id, status, total_spent');

    const totalCustomers = allCustomers.data?.length || 0;
    const activeCount = allCustomers.data?.filter(c => c.status === 'active').length || 0;
    const inactiveCount = allCustomers.data?.filter(c => c.status === 'inactive').length || 0;

    // Calculate total passes
    const { count: totalPassesCount } = await supabase
      .from('purchased_passes')
      .select('*', { count: 'exact', head: true });

    const avgPasses = totalCustomers > 0 ? (totalPassesCount || 0) / totalCustomers : 0;

    const stats = {
      totalCustomers,
      active: activeCount,
      inactive: inactiveCount,
      avgPasses: avgPasses.toFixed(1)
    };

    return NextResponse.json({
      customers: customersWithOrders,
      stats,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
