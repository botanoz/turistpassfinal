import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TicketMessageRow = {
  id: string;
  ticket_id: string;
  sender_type: "customer" | "admin";
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("id, role")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ success: false, error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const category = searchParams.get("category") || "all";
    const search = searchParams.get("search") || "";

    let query = supabase
      .from("order_support_tickets")
      .select(`
        id,
        ticket_number,
        subject,
        status,
        priority,
        category,
        created_at,
        last_reply_at,
        response_sla_minutes,
        resolution_sla_minutes,
        orders(order_number),
        customer_profiles(first_name, last_name, email)
      `)
      .order("last_reply_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (category !== "all") {
      query = query.eq("category", category);
    }

    if (search) {
      query = query.or(
        `subject.ilike.%${search}%,ticket_number.ilike.%${search}%,orders.order_number.ilike.%${search}%`,
      );
    }

    const { data: tickets, error } = await query;
    if (error) throw error;

    const ticketIds = (tickets ?? []).map((t: any) => t.id);
    let messagesByTicket: Record<string, TicketMessageRow[]> = {};

    if (ticketIds.length > 0) {
      const { data: messages, error: messagesError } = await supabase
        .from("ticket_messages")
        .select("id, ticket_id, sender_type, message, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });

      if (messagesError) throw messagesError;

      messagesByTicket = (messages ?? []).reduce<Record<string, TicketMessageRow[]>>((acc, msg) => {
        (acc[msg.ticket_id] ||= []).push(msg as TicketMessageRow);
        return acc;
      }, {});
    }

    return NextResponse.json({
      success: true,
      tickets: (tickets ?? []).map((t: any) => {
        const orderField: any = t.orders;
        const orderNumber = Array.isArray(orderField) ? orderField[0]?.order_number : orderField?.order_number;
        const customerField: any = t.customer_profiles;
        const customerName = customerField
          ? [customerField.first_name, customerField.last_name].filter(Boolean).join(" ").trim()
          : "";
        const from = customerName || customerField?.email || "Customer";
        const responses = (messagesByTicket[t.id] ?? []).map((r) => ({
          id: r.id,
          sender: r.sender_type as "customer" | "admin",
          message: r.message,
          createdAt: r.created_at,
        }));
        const lastUpdate = responses.length > 0
          ? responses[responses.length - 1].createdAt
          : t.last_reply_at || t.created_at;

        return {
          id: t.id,
          ticketNumber: t.ticket_number,
          orderNumber,
          from,
          type: "customer",
          subject: t.subject,
          status: t.status,
          priority: t.priority,
          category: t.category,
          date: t.created_at,
          lastUpdate,
          responseSlaMinutes: t.response_sla_minutes,
          resolutionSlaMinutes: t.resolution_sla_minutes,
          responses,
        };
      }),
    });
  } catch (error: any) {
    console.error("Admin order support GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch customer tickets" },
      { status: 500 },
    );
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
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile, error: profileError } = await supabase
      .from("admin_profiles")
      .select("id")
      .eq("id", user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ success: false, error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { ticketId, message, status } = body as { ticketId?: string; message?: string; status?: string };

    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ success: false, error: "Missing ticketId or message" }, { status: 400 });
    }

    const { error: insertErr } = await supabase
      .from("ticket_messages")
      .insert({ ticket_id: ticketId, sender_type: "admin", sender_id: adminProfile.id, message: message.trim() });

    if (insertErr) throw insertErr;

    const allowedStatuses = ["open", "in_progress", "waiting_customer", "resolved", "closed"];
    if (status && allowedStatuses.includes(status)) {
      const { error: updateErr } = await supabase
        .from("order_support_tickets")
        .update({ status })
        .eq("id", ticketId);

      if (updateErr) throw updateErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin order support POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send response" },
      { status: 500 },
    );
  }
}
