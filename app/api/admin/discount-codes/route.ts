import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - List all discount codes
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !adminProfile) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const campaignId = searchParams.get("campaign_id");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("discount_codes")
      .select(
        `
        *,
        campaign:campaigns(id, title, status),
        created_by_profile:admin_profiles!created_by(email)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data: discountCodes, error: codesError, count } = await query;

    if (codesError) {
      console.error("Error fetching discount codes:", codesError);
      return NextResponse.json(
        { error: "Failed to fetch discount codes" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      discountCodes: discountCodes || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Unexpected error in discount codes GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new discount code
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();

    // Check if user is admin
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: adminError } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (adminError || !adminProfile) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      campaign_id,
      code,
      description,
      discount_type,
      discount_value,
      max_uses,
      max_uses_per_customer,
      min_purchase_amount,
      valid_from,
      valid_until,
      applicable_pass_ids,
      applicable_pass_types,
      status,
    } = body;

    // Validation
    if (!code || !discount_type || !discount_value || !valid_from || !valid_until) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: code, discount_type, discount_value, valid_from, valid_until",
        },
        { status: 400 }
      );
    }

    // Validate discount value
    if (discount_value <= 0) {
      return NextResponse.json(
        { error: "Discount value must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate percentage
    if (discount_type === "percentage" && discount_value > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    // Validate dates
    const validFrom = new Date(valid_from);
    const validUntil = new Date(valid_until);

    if (validUntil <= validFrom) {
      return NextResponse.json(
        { error: "Valid until date must be after valid from date" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const { data: existingCode } = await supabase
      .from("discount_codes")
      .select("id")
      .eq("code", code.toUpperCase())
      .single();

    if (existingCode) {
      return NextResponse.json(
        { error: "Discount code already exists" },
        { status: 400 }
      );
    }

    // Create discount code using admin client
    const { data: discountCode, error: createError } = await supabaseAdmin
      .from("discount_codes")
      .insert({
        campaign_id: campaign_id || null,
        code: code.toUpperCase(),
        description: description || null,
        discount_type,
        discount_value,
        max_uses: max_uses || null,
        max_uses_per_customer: max_uses_per_customer || 1,
        min_purchase_amount: min_purchase_amount || 0,
        valid_from,
        valid_until,
        applicable_pass_ids: applicable_pass_ids || null,
        applicable_pass_types: applicable_pass_types || null,
        status: status || "active",
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating discount code:", createError);
      return NextResponse.json(
        { error: "Failed to create discount code" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      discountCode,
    });
  } catch (error) {
    console.error("Unexpected error in discount codes POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
