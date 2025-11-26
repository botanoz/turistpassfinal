import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get single upgrade package
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const { data: package_, error: packageError } = await supabase
      .from("upgrade_packages")
      .select(
        `
        *,
        from_pass:passes!from_pass_id(id, name, status),
        to_pass:passes!to_pass_id(id, name, status)
      `
      )
      .eq("id", id)
      .single();

    if (packageError) {
      console.error("Error fetching upgrade package:", packageError);
      return NextResponse.json(
        { error: "Upgrade package not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ package: package_ });
  } catch (error) {
    console.error("Unexpected error in upgrade package GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT - Update upgrade package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Update package
    const { data: updatedPackage, error: updateError } = await supabaseAdmin
      .from("upgrade_packages")
      .update({
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
      })
      .eq("id", id)
      .select(
        `
        *,
        from_pass:passes!from_pass_id(id, name, status),
        to_pass:passes!to_pass_id(id, name, status)
      `
      )
      .single();

    if (updateError) {
      console.error("Error updating upgrade package:", updateError);
      return NextResponse.json(
        { error: "Failed to update upgrade package" },
        { status: 500 }
      );
    }

    return NextResponse.json({ package: updatedPackage });
  } catch (error) {
    console.error("Unexpected error in upgrade package PUT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete upgrade package
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Delete package
    const { error: deleteError } = await supabaseAdmin
      .from("upgrade_packages")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting upgrade package:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete upgrade package" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in upgrade package DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
