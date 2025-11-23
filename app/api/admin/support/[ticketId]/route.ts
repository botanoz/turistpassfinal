import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params;
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

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, subject, priority, status, created_at, updated_at, business:businesses(name)")
      .eq("id", ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const { data: responses, error: responsesError } = await supabase
      .from("support_responses")
      .select("id, sender, message, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (responsesError) throw responsesError;

    const businessField: any = ticket.business;
    const businessName = Array.isArray(businessField)
      ? businessField[0]?.name
      : businessField?.name;

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
        from: businessName ?? "Business",
      },
      messages: (responses ?? []).map((response) => ({
        id: response.id,
        sender: response.sender,
        message: response.message,
        createdAt: response.created_at,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to load ticket conversation" },
      { status: 500 },
    );
  }
}
