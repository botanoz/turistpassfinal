import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
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

    // Get admin display currency (the currency selected for admin panel display)
    const { data: adminCurrency } = await supabase
      .from('currency_settings')
      .select('*')
      .eq('is_admin_display', true)
      .single();

    // Fallback to default currency if no admin display currency is set
    const displayCurrency = adminCurrency || {
      currency_code: 'TRY',
      currency_symbol: '₺',
      exchange_rate: 1,
      symbol_position: 'before',
      decimal_places: 2
    };

    // Get dashboard stats using the database function
    const { data: stats, error: statsError } = await supabase
      .rpc('get_dashboard_stats');

    if (statsError) {
      console.error('Stats error:', statsError);
      console.error('Stats error details:', JSON.stringify(statsError, null, 2));
      return NextResponse.json({
        error: "Failed to fetch stats",
        details: statsError.message || statsError.toString()
      }, { status: 500 });
    }

    // Check if stats is empty or null
    if (!stats || stats.length === 0) {
      console.warn('No stats returned from database, using default values');
    }

    // Get previous month stats for comparison (mock for now, will be real in future FAZs)
    const previousMonthStats = {
      total_customers: 2542,
      active_customers: 2103,
      total_businesses: 144,
      total_passes_sold: 3674,
      monthly_revenue: 68500
    };

    // Calculate percentage changes
    const currentStats = stats[0] || {
      total_customers: 0,
      active_customers: 0,
      total_businesses: 0,
      pending_applications: 0,
      total_passes_sold: 0,
      monthly_revenue: 0,
      pending_orders: 0,
      pending_support: 0
    };

    const calculateChange = (current: number, previous: number) => {
      if (previous === 0) return 0;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    // Convert revenue to display currency
    const revenueTRY = Number(currentStats.monthly_revenue) || 0;
    const exchangeRate = displayCurrency.exchange_rate || 1;
    const revenueInDisplayCurrency = displayCurrency.currency_code === 'TRY' 
      ? revenueTRY 
      : revenueTRY / exchangeRate;
    
    // Format revenue with proper currency symbol
    const formatCurrency = (amount: number) => {
      const formattedAmount = amount.toLocaleString(
        displayCurrency.currency_code === 'TRY' ? 'tr-TR' : 'en-US',
        { minimumFractionDigits: 2, maximumFractionDigits: 2 }
      );
      
      if (displayCurrency.symbol_position === 'before') {
        return `${displayCurrency.currency_symbol}${formattedAmount}`;
      } else {
        return `${formattedAmount}${displayCurrency.currency_symbol}`;
      }
    };

    // Main stats with change percentages
    const mainStats = [
      {
        label: "Total Customers",
        value: currentStats.total_customers.toString(),
        change: `${calculateChange(Number(currentStats.total_customers), previousMonthStats.total_customers) >= 0 ? '+' : ''}${calculateChange(Number(currentStats.total_customers), previousMonthStats.total_customers)}%`,
        icon: "Users",
        color: "text-blue-600",
        bgColor: "bg-blue-100 dark:bg-blue-950",
        href: "/admin/customers"
      },
      {
        label: "Active Businesses",
        value: currentStats.total_businesses.toString(),
        change: `${calculateChange(Number(currentStats.total_businesses), previousMonthStats.total_businesses) >= 0 ? '+' : ''}${calculateChange(Number(currentStats.total_businesses), previousMonthStats.total_businesses)}%`,
        icon: "Building2",
        color: "text-green-600",
        bgColor: "bg-green-100 dark:bg-green-950",
        href: "/admin/businesses"
      },
      {
        label: "Total Passes Sold",
        value: currentStats.total_passes_sold.toString(),
        change: `${calculateChange(Number(currentStats.total_passes_sold), previousMonthStats.total_passes_sold) >= 0 ? '+' : ''}${calculateChange(Number(currentStats.total_passes_sold), previousMonthStats.total_passes_sold)}%`,
        icon: "CreditCard",
        color: "text-purple-600",
        bgColor: "bg-purple-100 dark:bg-purple-950",
        href: "/admin/orders"
      },
      {
        label: "Monthly Revenue",
        value: formatCurrency(revenueInDisplayCurrency),
        change: `${calculateChange(Number(currentStats.monthly_revenue), previousMonthStats.monthly_revenue) >= 0 ? '+' : ''}${calculateChange(Number(currentStats.monthly_revenue), previousMonthStats.monthly_revenue)}%`,
        icon: "DollarSign",
        color: "text-emerald-600",
        bgColor: "bg-emerald-100 dark:bg-emerald-950",
        href: "/admin/analytics"
      }
    ];

    // Quick stats
    const quickStats = [
      {
        label: "Pending Orders",
        value: Number(currentStats.pending_orders),
        icon: "ShoppingCart",
        color: "text-orange-600",
        href: "/admin/orders?status=pending"
      },
      {
        label: "Pending Support",
        value: Number(currentStats.pending_support),
        icon: "AlertCircle",
        color: "text-red-600",
        href: "/admin/support?status=open"
      },
      {
        label: "Business Applications",
        value: Number(currentStats.pending_applications),
        icon: "Clock",
        color: "text-yellow-600",
        href: "/admin/businesses?status=pending"
      },
      {
        label: "Active Passes",
        value: Number(currentStats.total_passes_sold),
        icon: "CheckCircle",
        color: "text-green-600",
        href: "/admin/passes?status=active"
      }
    ];

    // Get recent activity logs
    const { data: activities, error: activitiesError } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (activitiesError) {
      console.error('Activities error:', activitiesError);
    }

    // Format recent activity
    const recentActivity = (activities || []).map((activity: any) => {
      const now = new Date();
      const activityTime = new Date(activity.created_at);
      const diffMs = now.getTime() - activityTime.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      let timeAgo;
      if (diffMins < 1) timeAgo = "Just now";
      else if (diffMins < 60) timeAgo = `${diffMins} min ago`;
      else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      return {
        type: activity.category || 'system',
        text: activity.description || activity.action,
        time: timeAgo,
        timestamp: activity.created_at
      };
    });

    // If no activities yet, return empty array (not mock data)
    const finalActivity = recentActivity.length > 0 ? recentActivity : [];

    return NextResponse.json({
      mainStats,
      quickStats,
      recentActivity: finalActivity
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
