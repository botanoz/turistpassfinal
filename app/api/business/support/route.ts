import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SupportResponseRow = {
  id: string;
  ticket_id: string;
  sender: "business" | "admin";
  message: string;
  created_at: string;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function getBusinessAccountId(supabase: SupabaseServerClient, userId: string) {
  const { data, error } = await supabase
    .from("business_accounts")
    .select("business_id")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data?.business_id ?? null;
}

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

    const businessId = await getBusinessAccountId(supabase, user.id);
    if (!businessId) {
      return NextResponse.json({ success: true, tickets: [] });
    }

    const { data: tickets, error: ticketsError } = await supabase
      .from("support_tickets")
      .select(`
        id, subject, priority, status, category,
        created_at, updated_at,
        first_response_at, resolved_at,
        response_sla_minutes, resolution_sla_minutes
      `)
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false});

    if (ticketsError) throw ticketsError;

    const ticketIds = (tickets ?? []).map((t) => t.id);
    let responsesByTicket: Record<string, SupportResponseRow[]> = {};

    if (ticketIds.length > 0) {
      const { data: responses, error: responsesError } = await supabase
        .from("support_responses")
        .select("id, ticket_id, sender, message, created_at")
        .in("ticket_id", ticketIds)
        .order("created_at", { ascending: true });

      if (responsesError) throw responsesError;

      responsesByTicket = (responses ?? []).reduce<Record<string, SupportResponseRow[]>>((acc, r) => {
        (acc[r.ticket_id] ||= []).push(r);
        return acc;
      }, {});
    }

    return NextResponse.json({
      success: true,
      tickets: (tickets ?? []).map((t) => {
        const ticketResponses = responsesByTicket[t.id] ?? [];
        const lastResponseAt = ticketResponses.length > 0
          ? ticketResponses[ticketResponses.length - 1].created_at
          : t.updated_at;

        return {
          id: t.id,
          subject: t.subject,
          priority: t.priority,
          status: t.status,
          category: t.category,
          createdAt: t.created_at,
          lastUpdate: lastResponseAt,
          responseSlaMinutes: t.response_sla_minutes,
          resolutionSlaMinutes: t.resolution_sla_minutes,
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
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to load support tickets" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, priority, message } = body as { subject?: string; priority?: string; message?: string };

    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json({ success: false, error: "Subject and message are required" }, { status: 400 });
    }

    const businessId = await getBusinessAccountId(supabase, user.id);
    if (!businessId) {
      return NextResponse.json({ success: false, error: "Business not linked" }, { status: 400 });
    }

    const { data: ticket, error: insertTicketError } = await supabase
      .from("support_tickets")
      .insert({
        business_id: businessId,
        subject: subject.trim(),
        priority: (priority ?? "medium").toLowerCase(),
      })
      .select("id")
      .single();

    if (insertTicketError) throw insertTicketError;

    const { error: insertResponseError } = await supabase
      .from("support_responses")
      .insert({ ticket_id: ticket.id, sender: "business", message: message.trim() });

    if (insertResponseError) throw insertResponseError;

    return NextResponse.json({ success: true, ticketId: ticket.id });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to create support ticket" },
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

    const body = await request.json();
    const { ticketId, message } = body as { ticketId?: string; message?: string };

    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ success: false, error: "Ticket and message are required" }, { status: 400 });
    }

    const businessId = await getBusinessAccountId(supabase, user.id);
    if (!businessId) {
      return NextResponse.json({ success: false, error: "Business not linked" }, { status: 400 });
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("business_id", businessId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    const { error: insertError } = await supabase
      .from("support_responses")
      .insert({ ticket_id: ticket.id, sender: "business", message: message.trim() });

    if (insertError) throw insertError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message ?? "Failed to send response" },
      { status: 500 },
    );
  }
}
