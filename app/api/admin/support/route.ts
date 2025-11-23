import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupportResponseRow = {
  id: string;
  ticket_id: string;
  sender: "business" | "admin";
  message: string;
  created_at: string;
};

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
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("support_tickets")
      .select(`id, subject, priority, status, created_at, updated_at, business:businesses(name)`)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.ilike("subject", `%${search}%`);
    }

    const { data: tickets, error } = await query;
    if (error) throw error;

    const ticketIds = (tickets ?? []).map((t) => t.id);
    let responsesByTicket: Record<string, SupportResponseRow[]> = {};
    if (ticketIds.length > 0) {
      const { data: responses, error: respErr } = await supabase
        .from("support_responses")
        .select("id, ticket_id, sender, message, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });
      if (respErr) throw respErr;
      responsesByTicket = (responses ?? []).reduce<Record<string, SupportResponseRow[]>>((acc, r) => {
        (acc[r.ticket_id] ||= []).push(r);
        return acc;
      }, {});
    }

    return NextResponse.json({
      success: true,
      tickets: (tickets ?? []).map((t) => {
        const ticketResponses = responsesByTicket[t.id] ?? [];
        const lastUpdate = ticketResponses.length > 0
          ? ticketResponses[ticketResponses.length - 1].created_at
          : t.updated_at;
        const businessField: any = t.business;
        const businessName = Array.isArray(businessField)
          ? businessField[0]?.name
          : businessField?.name;

        return {
          id: t.id,
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          date: t.created_at,
          lastUpdate,
          from: businessName ?? "Business",
          type: "business",
          responses: ticketResponses.map((r) => ({
            id: r.id,
            sender: r.sender,
            message: r.message,
            createdAt: r.created_at,
          })),
        };
      }),
    });
  } catch (error: any) {
    console.error("Admin support GET error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, message, status } = body as { ticketId?: string; message?: string; status?: string };
    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ success: false, error: "Missing ticketId or message" }, { status: 400 });
    }

    const { error: insertErr } = await supabase
      .from("support_responses")
      .insert({ ticket_id: ticketId, sender: "admin", message: message.trim() });
    if (insertErr) throw insertErr;

    if (status && ["open", "in_progress", "resolved"].includes(status)) {
      const { error: updateErr } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);
      if (updateErr) throw updateErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin support POST error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to send response" }, { status: 500 });
  }
}
