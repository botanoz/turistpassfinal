import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/analytics/revenue-chart
// Returns revenue data for charts (daily, weekly, monthly)
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
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('end_date') || new Date().toISOString();
    const intervalType = searchParams.get('interval') || 'day'; // day, week, month
    const targetCurrency = searchParams.get('currency');

    // Validate interval type
    if (!['day', 'week', 'month'].includes(intervalType)) {
      return NextResponse.json({ error: "Invalid interval type" }, { status: 400 });
    }

    // Resolve target currency (fall back to default currency setting)
    let resolvedCurrency = targetCurrency;
    if (!resolvedCurrency) {
      const { data: defaultCurrency } = await supabase.rpc('get_default_currency');
      resolvedCurrency = defaultCurrency || 'TRY';
    }

    // Get revenue data
    const { data: revenueData, error: revenueError } = await supabase
      .rpc('get_revenue_by_date', {
        start_date: startDate,
        end_date: endDate,
        interval_type: intervalType,
        target_currency: resolvedCurrency
      });

    if (revenueError) {
      console.error('Revenue chart fetch error:', revenueError);
      return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 });
    }

    return NextResponse.json({
      data: revenueData || [],
      revenueData: revenueData || [],
      interval: intervalType,
      dateRange: {
        start: startDate,
        end: endDate
      },
      currency: resolvedCurrency
    });

  } catch (error) {
    console.error('Revenue chart API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
