import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get single campaign
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

    // Get campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*, created_by_profile:admin_profiles!created_by(email)")
      .eq("id", id)
      .single();

    if (campaignError) {
      console.error("Error fetching campaign:", campaignError);
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Unexpected error in campaign GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update campaign
export async function PATCH(
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

    const body = await request.json();

    // Validate dates if provided
    if (body.start_date && body.end_date) {
      const startDate = new Date(body.start_date);
      const endDate = new Date(body.end_date);

      if (endDate <= startDate) {
        return NextResponse.json(
          { error: "End date must be after start date" },
          { status: 400 }
        );
      }
    }

    // Update campaign using admin client
    const { data: campaign, error: updateError } = await supabaseAdmin
      .from("campaigns")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating campaign:", updateError);
      return NextResponse.json(
        { error: "Failed to update campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error("Unexpected error in campaign PATCH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete campaign
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

    // Delete campaign using admin client
    const { error: deleteError } = await supabaseAdmin
      .from("campaigns")
      .delete()
      .eq("id", id);

    if (deleteError) {
      console.error("Error deleting campaign:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete campaign" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Campaign deleted successfully",
    });
  } catch (error) {
    console.error("Unexpected error in campaign DELETE:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
