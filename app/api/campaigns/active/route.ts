import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET - Get active campaign for banner display
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Call the database function to get active banner campaign
    const { data, error } = await supabase.rpc("get_active_banner_campaigns");

    if (error) {
      console.error("Error fetching active campaigns:", error);
      // Return empty result instead of error - banner should gracefully handle no campaigns
      return NextResponse.json({ campaign: null });
    }

    // The function returns an array, but we only need the first (highest priority) one
    const campaign = data && data.length > 0 ? data[0] : null;

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error("Unexpected error in active campaigns GET:", error);
    // Return empty result instead of error
    return NextResponse.json({ campaign: null });
  }
}
