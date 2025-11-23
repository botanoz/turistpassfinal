import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticketId: string }> }
) {
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

    const { data: account, error: accountError } = await supabase
      .from("business_accounts")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (accountError || !account?.business_id) {
      return NextResponse.json({ success: false, error: "Business not linked" }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id, subject, priority, status, created_at, updated_at")
      .eq("id", ticketId)
      .eq("business_id", account.business_id)
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

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.created_at,
        updatedAt: ticket.updated_at,
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
