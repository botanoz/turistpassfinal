import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
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

    const { ticketId } = await params;

    const { data: ticket, error: ticketError } = await supabase
      .from("order_support_tickets")
      .select(`
        id,
        ticket_number,
        subject,
        status,
        priority,
        category,
        created_at,
        orders(order_number),
        customer_profiles(first_name, last_name, email)
      `)
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const { data: messages, error: messagesError } = await supabase
      .from("ticket_messages")
      .select("id, sender_type, message, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (messagesError) throw messagesError;

    const orderField: any = ticket.orders;
    const orderNumber = Array.isArray(orderField) ? orderField[0]?.order_number : orderField?.order_number;
    const customerField: any = ticket.customer_profiles;
    const customerName = customerField
      ? [customerField.first_name, customerField.last_name].filter(Boolean).join(" ").trim()
      : "";

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticket_number,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        category: ticket.category,
        createdAt: ticket.created_at,
        from: customerName || customerField?.email || "Customer",
        orderNumber,
      },
      messages: (messages ?? []).map((msg) => ({
        id: msg.id,
        sender: msg.sender_type,
        message: msg.message,
        createdAt: msg.created_at,
      })),
    });
  } catch (error: any) {
    console.error("Admin order support detail error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load ticket conversation" },
      { status: 500 },
    );
  }
}
