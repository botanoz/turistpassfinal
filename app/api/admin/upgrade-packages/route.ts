import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - List all upgrade packages
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
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build query
    let query = supabase
      .from("upgrade_packages")
      .select(
        `
        *,
        from_pass:passes!from_pass_id(id, name, status),
        to_pass:passes!to_pass_id(id, name, status)
      `,
        { count: "exact" }
      )
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: packages, error: packagesError, count } = await query;

    if (packagesError) {
      console.error("Error fetching upgrade packages:", packagesError);
      return NextResponse.json(
        { error: "Failed to fetch upgrade packages" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      packages: packages || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Unexpected error in upgrade packages GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new upgrade package
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

    // Get request body
    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.to_pass_id) {
      return NextResponse.json(
        { error: "Name and target pass are required" },
        { status: 400 }
      );
    }

    if (body.upgrade_price < 0) {
      return NextResponse.json(
        { error: "Upgrade price must be non-negative" },
        { status: 400 }
      );
    }

    // Create package
    const { data: newPackage, error: createError } = await supabaseAdmin
      .from("upgrade_packages")
      .insert([
        {
          name: body.name,
          description: body.description || null,
          short_description: body.short_description || null,
          from_pass_id: body.from_pass_id || null,
          to_pass_id: body.to_pass_id,
          upgrade_price: body.upgrade_price,
          discount_percentage: body.discount_percentage || 0,
          additional_days: body.additional_days || 0,
          features: body.features || [],
          status: body.status || "draft",
          featured: body.featured || false,
          display_order: body.display_order || 0,
          badge_text: body.badge_text || null,
        },
      ])
      .select(
        `
        *,
        from_pass:passes!from_pass_id(id, name, status),
        to_pass:passes!to_pass_id(id, name, status)
      `
      )
      .single();

    if (createError) {
      console.error("Error creating upgrade package:", createError);
      return NextResponse.json(
        { error: "Failed to create upgrade package" },
        { status: 500 }
      );
    }

    return NextResponse.json({ package: newPackage }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error in upgrade package POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
