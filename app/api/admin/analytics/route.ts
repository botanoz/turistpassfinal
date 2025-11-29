import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/analytics
// Returns comprehensive analytics data for dashboard
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
    const targetCurrency = searchParams.get('currency');

    // Resolve target currency (fall back to admin display currency setting)
    let resolvedCurrency = targetCurrency;
    let currencyInfo = null;
    
    if (!resolvedCurrency) {
      // First try to get admin display currency
      const { data: adminCurrency } = await supabase
        .from('currency_settings')
        .select('*')
        .eq('is_admin_display', true)
        .single();
      
      if (adminCurrency) {
        resolvedCurrency = adminCurrency.currency_code;
        currencyInfo = adminCurrency;
      } else {
        // Fall back to default currency
        const { data: defaultCurrency } = await supabase.rpc('get_default_currency');
        resolvedCurrency = defaultCurrency || 'TRY';
      }
    }
    
    // Get currency info if not already fetched
    if (!currencyInfo && resolvedCurrency) {
      const { data: fetchedCurrency } = await supabase
        .from('currency_settings')
        .select('*')
        .eq('currency_code', resolvedCurrency)
        .single();
      currencyInfo = fetchedCurrency;
    }

    // Get comprehensive analytics
    const { data: analyticsData, error: analyticsError } = await supabase
      .rpc('get_comprehensive_analytics', {
        start_date: startDate,
        end_date: endDate,
        target_currency: resolvedCurrency
      });

    if (analyticsError) {
      console.error('Analytics fetch error:', analyticsError);
      return NextResponse.json({ error: "Failed to fetch analytics", details: analyticsError }, { status: 500 });
    }

    return NextResponse.json({
      analytics: analyticsData,
      dateRange: {
        start: startDate,
        end: endDate
      },
      currency: resolvedCurrency,
      currencyInfo: currencyInfo ? {
        code: currencyInfo.currency_code,
        symbol: currencyInfo.currency_symbol,
        symbolPosition: currencyInfo.symbol_position,
        decimalPlaces: currencyInfo.decimal_places,
        exchangeRate: currencyInfo.exchange_rate
      } : {
        code: 'TRY',
        symbol: '₺',
        symbolPosition: 'before',
        decimalPlaces: 2,
        exchangeRate: 1
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
