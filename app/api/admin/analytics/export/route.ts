import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/analytics/export
// Exports analytics data as CSV or JSON
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
    const format = searchParams.get('format') || 'csv'; // csv or json
    const type = searchParams.get('type') || 'sales'; // sales, passes, businesses
    const startDate = searchParams.get('start_date') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('end_date') || new Date().toISOString();
    const targetCurrency = searchParams.get('currency');

    // Resolve target currency (fall back to default currency setting)
    let resolvedCurrency = targetCurrency;
    if (!resolvedCurrency) {
      const { data: defaultCurrency } = await supabase.rpc('get_default_currency');
      resolvedCurrency = defaultCurrency || 'TRY';
    }

    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    // Fetch data based on type
    switch (type) {
      case 'sales': {
        const { data: salesData, error } = await supabase
          .rpc('get_revenue_by_date', {
            start_date: startDate,
            end_date: endDate,
            interval_type: 'day',
            target_currency: resolvedCurrency
          });

        if (error) throw error;
        data = salesData || [];
        filename = 'sales-report';
        headers = ['Date', 'Revenue', 'Orders Count'];
        break;
      }

      case 'passes': {
        const { data: passesData, error } = await supabase
          .rpc('get_top_selling_passes', {
            limit_count: 100,
            start_date: startDate,
            end_date: endDate,
            target_currency: resolvedCurrency
          });

        if (error) throw error;
        data = passesData || [];
        filename = 'passes-report';
        headers = ['Pass Name', 'Total Sold', 'Total Revenue', 'Average Price'];
        break;
      }

      case 'businesses': {
        const { data: businessesData, error } = await supabase
          .rpc('get_top_businesses', {
            limit_count: 100
          });

        if (error) throw error;
        data = businessesData || [];
        filename = 'businesses-report';
        headers = ['Business Name', 'Category', 'Pass Count', 'Total Passes Sold'];
        break;
      }

      default:
        return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
    }

    // Generate export based on format
    if (format === 'csv') {
      // Generate CSV
      let csv = headers.join(',') + '\n';

      data.forEach((row) => {
        const values = Object.values(row).map(val => {
          // Escape quotes and wrap in quotes if contains comma
          const stringVal = String(val || '');
          if (stringVal.includes(',') || stringVal.includes('"')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        });
        csv += values.join(',') + '\n';
      });

      // Return CSV file
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });

    } else {
      // Return JSON
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().split('T')[0]}.json"`
        }
      });
    }

  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
