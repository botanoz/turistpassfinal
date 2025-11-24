import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/settings/public - Get all public settings (no auth required)
export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch only public settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('key, value')
      .eq('is_public', true);

    if (error) {
      console.error('Public settings fetch error:', error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Convert array to key-value object for easier access
    const settingsObject: Record<string, string> = {};
    (settings || []).forEach(setting => {
      settingsObject[setting.key] = setting.value || '';
    });

    return NextResponse.json(settingsObject);

  } catch (error) {
    console.error('Public settings API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
