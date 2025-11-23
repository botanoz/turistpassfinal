import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type UsageRow = {
  id: string;
  created_at: string;
  validation_method: string | null;
  discount_percentage: number | null;
  original_amount: number | null;
  discounted_amount: number | null;
  notes: string | null;
  purchased_pass_id: string;
  purchased_passes: {
    id: string;
    pass_name: string;
    pass_type: string;
    customer_id: string;
    usage_count: number | null;
    max_usage: number | null;
    expiry_date: string | null;
  } | null;
};

export async function GET() {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { data: account, error: accountError } = await supabaseAdmin
      .from("business_accounts")
      .select("id, business_id, business_name, metadata")
      .eq("id", user.id)
      .maybeSingle();

    if (accountError) {
      console.error("Dashboard account lookup error:", accountError);
      throw accountError;
    }

    if (!account?.business_id) {
      return NextResponse.json(
        {
          success: false,
          error: "Business profile is not linked yet. Please complete onboarding.",
        },
        { status: 400 },
      );
    }

    const businessId = account.business_id;
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

    // Total visits
    const { count: totalVisits, error: totalError } = await supabaseAdmin
      .from("pass_usage_history")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId);

    if (totalError) throw totalError;

    const { count: monthVisits, error: monthError } = await supabaseAdmin
      .from("pass_usage_history")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", monthStart.toISOString());

    if (monthError) throw monthError;

    const { count: todayVisits, error: todayError } = await supabaseAdmin
      .from("pass_usage_history")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("created_at", todayStart.toISOString())
      .lt("created_at", tomorrowStart.toISOString());

    if (todayError) throw todayError;

    const { data: usageRowsData, error: usageError } = await supabaseAdmin
      .from("pass_usage_history")
      .select(
        `
          id,
          created_at,
          validation_method,
          discount_percentage,
          original_amount,
          discounted_amount,
          notes,
          purchased_pass_id,
          purchased_passes (
            id,
            pass_name,
            pass_type,
            customer_id,
            usage_count,
            max_usage,
            expiry_date
          )
        `,
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (usageError) throw usageError;

    const usageRows = (usageRowsData ?? []) as unknown as UsageRow[];

    const passIds = Array.from(
      new Set(
        usageRows.map((row) => row.purchased_pass_id).filter((id): id is string => Boolean(id)),
      ),
    );

    let purchasedPasses: { id: string; customer_id: string }[] = [];
    if (passIds.length > 0) {
      const { data: passRows, error: passLookupError } = await supabaseAdmin
        .from("purchased_passes")
        .select("id, customer_id")
        .in("id", passIds);

      if (passLookupError) throw passLookupError;
      purchasedPasses = passRows ?? [];
    }

    const customerIds = Array.from(
      new Set(purchasedPasses.map((row) => row.customer_id).filter(Boolean)),
    );

    let customerProfiles: Record<
      string,
      { id: string; first_name: string | null; last_name: string | null; email: string | null }
    > = {};

    if (customerIds.length > 0) {
      const { data: customers, error: customerError } = await supabaseAdmin
        .from("customer_profiles")
        .select("id, first_name, last_name, email")
        .in("id", customerIds);

      if (customerError) throw customerError;

      customerProfiles = Object.fromEntries(
        (customers ?? []).map((customer) => [
          customer.id,
          {
            id: customer.id,
            first_name: customer.first_name ?? null,
            last_name: customer.last_name ?? null,
            email: customer.email ?? null,
          },
        ]),
      );
    }

    const uniqueCustomers = new Set(customerIds).size;

    let totalOriginal = 0;
    let totalDiscounted = 0;
    usageRows.forEach((row) => {
      if (row.original_amount) {
        totalOriginal += Number(row.original_amount);
      }
      if (row.discounted_amount) {
        totalDiscounted += Number(row.discounted_amount);
      }
    });

    const recentScans = usageRows.slice(0, 5).map((row) => {
      const purchasedPass = row.purchased_passes;
      const customerId =
        purchasedPass?.customer_id ??
        purchasedPasses.find((p) => p.id === row.purchased_pass_id)?.customer_id ??
        null;
      const customer = customerId ? customerProfiles[customerId] : undefined;
      const fullName =
        customer && (customer.first_name || customer.last_name)
          ? `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim()
          : null;

      return {
        id: row.id,
        createdAt: row.created_at,
        validationMethod: row.validation_method,
        discountPercentage: row.discount_percentage,
        originalAmount: row.original_amount,
        discountedAmount: row.discounted_amount,
        passName: purchasedPass?.pass_name ?? "N/A",
        passType: purchasedPass?.pass_type ?? null,
        customer: customer
          ? {
              id: customer.id,
              name: fullName || customer.email || "Customer",
              email: customer.email,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalVisits: totalVisits ?? 0,
        monthVisits: monthVisits ?? 0,
        todayVisits: todayVisits ?? 0,
        uniqueCustomers,
        totalOriginalAmount: totalOriginal,
        totalDiscountedAmount: totalDiscounted,
        totalSavings: Math.max(totalOriginal - totalDiscounted, 0),
      },
      recentScans,
    });
  } catch (error: any) {
    console.error("Business dashboard API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Failed to load dashboard data",
      },
      { status: 500 },
    );
  }
}
