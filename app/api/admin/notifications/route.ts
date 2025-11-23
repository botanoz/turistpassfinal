import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const onlyUnread = searchParams.get("unread") === "true";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    // Build query
    let query = supabase
      .from("admin_notifications")
      .select("*")
      .eq("admin_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (onlyUnread) {
      query = query.eq("read", false);
    }

    const { data: notifications, error } = await query;

    if (error) throw error;

    // Get unread count
    const { count: unreadCount } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("admin_id", user.id)
      .eq("read", false);

    return NextResponse.json({
      success: true,
      notifications: notifications ?? [],
      unreadCount: unreadCount ?? 0,
    });
  } catch (error: any) {
    console.error("Admin notifications GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { notificationId, markAllAsRead } = body as {
      notificationId?: string;
      markAllAsRead?: boolean;
    };

    if (markAllAsRead) {
      // Mark all notifications as read
      const { error: updateError } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("admin_id", user.id)
        .eq("read", false);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true });
    }

    if (notificationId) {
      // Mark single notification as read
      const { error: updateError } = await supabase
        .from("admin_notifications")
        .update({ read: true })
        .eq("id", notificationId)
        .eq("admin_id", user.id);

      if (updateError) throw updateError;

      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { success: false, error: "Missing notificationId or markAllAsRead" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("Admin notifications PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update notification" },
      { status: 500 }
    );
  }
}
