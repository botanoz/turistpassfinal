import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: account } = await supabase
      .from("business_accounts")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!account?.business_id) {
      return NextResponse.json({ success: true, notifications: [] });
    }

    const { data, error } = await supabase
      .from("business_notifications")
      .select("id, type, title, content, read, created_at")
      .eq("business_id", account.business_id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      notifications: (data ?? []).map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.content,
        date: n.created_at,
        read: n.read,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to load notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: account } = await supabase
      .from("business_accounts")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!account?.business_id) {
      return NextResponse.json({ success: false, error: "Business not linked" }, { status: 400 });
    }

    const body = await request.json();
    const { notificationId, markAll } = body as { notificationId?: string; markAll?: boolean };

    if (!notificationId && !markAll) {
      return NextResponse.json(
        { success: false, error: "notificationId or markAll is required" },
        { status: 400 },
      );
    }

    let query = supabase
      .from("business_notifications")
      .update({ read: true })
      .eq("business_id", account.business_id);

    if (!markAll && notificationId) {
      query = query.eq("id", notificationId);
    }

    const { error: updateError } = await query;
    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to update notification" },
      { status: 500 },
    );
  }
}


