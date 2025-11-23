import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

type HistoryQuery = {
  limit: number;
  page: number;
  from?: string;
  to?: string;
  method?: string;
  search?: string;
};

function parseQuery(request: NextRequest): HistoryQuery {
  const searchParams = request.nextUrl.searchParams;
  const limit = Math.min(
    Math.max(Number(searchParams.get("limit")) || 50, 1),
    200,
  );
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const method = searchParams.get("method") || undefined;
  const search = searchParams.get("search") || undefined;

  return { limit, page, from, to, method, search };
}

export async function GET(request: NextRequest) {
  try {
    const { limit, page, from, to, method, search } = parseQuery(request);
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
      .select("id, business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (accountError) throw accountError;

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
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
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
          validation_location,
          purchased_pass_id,
          purchased_passes (
            id,
            pass_name,
            pass_type,
            activation_code,
            customer_id,
            usage_count,
            max_usage,
            expiry_date
          )
        `,
        { count: "exact" },
      )
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (from) {
      query = query.gte("created_at", new Date(from).toISOString());
    }

    if (to) {
      const toDate = new Date(to);
      if (!Number.isNaN(toDate.getTime())) {
        // Include entire day
        toDate.setUTCHours(23, 59, 59, 999);
        query = query.lte("created_at", toDate.toISOString());
      }
    }

    if (method) {
      query = query.eq("validation_method", method);
    }

    if (search) {
      query = query.or(
        [
          `notes.ilike.%${search}%`,
          `validation_location.ilike.%${search}%`,
        ].join(","),
      );
    }

    const { data: usageRows, error: historyError, count } = await query;

    if (historyError) throw historyError;

    const usageRowsData = (usageRows ?? []) as any[];

    const passIds = Array.from(
      new Set(
        usageRowsData.map((row) => row.purchased_pass_id).filter((id): id is string => Boolean(id)),
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

    const items = usageRowsData.map((row) => {
      const purchasedPass = row.purchased_passes;
      const passRecord = purchasedPasses.find(
        (pass) => pass.id === row.purchased_pass_id,
      );
      const customerId =
        purchasedPass?.customer_id ?? passRecord?.customer_id ?? null;
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
        notes: row.notes,
        validationLocation: row.validation_location,
        pass: {
          id: purchasedPass?.id ?? row.purchased_pass_id,
          name: purchasedPass?.pass_name ?? "N/A",
          type: purchasedPass?.pass_type ?? null,
          activationCode: purchasedPass?.activation_code ?? null,
          usageCount: purchasedPass?.usage_count ?? null,
          maxUsage: purchasedPass?.max_usage ?? null,
          expiryDate: purchasedPass?.expiry_date ?? null,
        },
        customer: customer
          ? {
              id: customer.id,
              name: fullName || customer.email || "Customer",
              email: customer.email,
            }
          : null,
      };
    });

    const totalCount = count ?? items.length;
    const totalPages = Math.max(Math.ceil(totalCount / limit), 1);

    return NextResponse.json({
      success: true,
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error: any) {
    console.error("Business history API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message ?? "Failed to load history",
      },
      { status: 500 },
    );
  }
}
