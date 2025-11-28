import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - List all campaigns
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

    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const type = searchParams.get("type"); // 'platform' or 'business'
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // If type is business, get business campaigns
    if (type === 'business') {
      let query = supabase
        .from("business_campaigns")
        .select(`
          *,
          businesses!business_campaigns_business_id_fkey(name, email)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (status && status !== "all") {
        query = query.eq("status", status);
      }

      const { data: campaigns, error: campaignsError } = await query;

      if (campaignsError) {
        console.error("Error fetching business campaigns:", campaignsError);
        return NextResponse.json(
          { success: false, error: "Failed to fetch campaigns" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        campaigns: campaigns || []
      });
    }

    // Otherwise, get platform campaigns (default behavior)
    let query = supabase
      .from("campaigns")
      .select("*, created_by_profile:admin_profiles!created_by(email)", {
        count: "exact",
      })
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: campaigns, error: campaignsError, count } = await query;

    if (campaignsError) {
      console.error("Error fetching campaigns:", campaignsError);
      return NextResponse.json(
        { error: "Failed to fetch campaigns" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      campaigns: campaigns || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Unexpected error in campaigns GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new campaign
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
      title,
      subtitle,
      description,
      banner_text,
      banner_type,
      show_banner,
      start_date,
      end_date,
      discount_type,
      discount_value,
      status,
      priority,
      target_audience,
    } = body;

    // Validation
    if (!title || !banner_text || !start_date || !end_date) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, banner_text, start_date, end_date",
        },
        { status: 400 }
      );
    }

    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    if (endDate <= startDate) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Create campaign using admin client to bypass RLS
    const { data: campaign, error: createError } = await supabaseAdmin
      .from("campaigns")
      .insert({
        title,
        subtitle: subtitle || null,
        description: description || null,
        banner_text,
        banner_type: banner_type || "promotion",
        show_banner: show_banner !== false,
        start_date,
        end_date,
        discount_type: discount_type || "none",
        discount_value: discount_value || null,
        status: status || "draft",
        priority: priority || 0,
        target_audience: target_audience || {},
        created_by: user.id,
      })
      .select()
      .single();

    if (createError) {
      console.error("Error creating campaign:", createError);
      return NextResponse.json(
        { error: "Failed to create campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Unexpected error in campaigns POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
