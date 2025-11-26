import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

// Get customer's support tickets
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customerId = session.user.id;

    // Use the helper function to get support tickets
    const { data: supportTickets, error } = await supabase
      .rpc('get_customer_support_tickets', { p_customer_id: customerId });

    if (error) {
      console.error('Error fetching support tickets:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch support tickets' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      supportTickets: supportTickets || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/customer/support-tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new support ticket
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const customerId = session.user.id;
    const body = await request.json();
    const { orderId, issueType, subject, description, priority = 'normal', category = 'customer' } = body;

    // Validate input
    if (!orderId || !issueType || !subject || !description) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify order belongs to customer
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    // Generate ticket number
    const { data: ticketNumber } = await supabase
      .rpc('generate_ticket_number');

    // Auto-categorize based on issue type
    let autoCategory = category;
    if (issueType === 'activation_issue' || issueType === 'pass_not_working') {
      autoCategory = 'technical';
    } else if (issueType === 'billing_question') {
      autoCategory = 'business';
    }

    // Create support ticket
    const { data: ticket, error: createError } = await supabase
      .from('order_support_tickets')
      .insert({
        ticket_number: ticketNumber,
        order_id: orderId,
        customer_id: customerId,
        issue_type: issueType,
        subject,
        description,
        priority,
        category: autoCategory,
        status: 'open',
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating support ticket:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create support ticket' },
        { status: 500 }
      );
    }

    // Add initial message to ticket
    await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'customer',
        sender_id: customerId,
        message: description,
      });

    return NextResponse.json({
      success: true,
      ticket,
      message: 'Support ticket created successfully. Our team will respond within 24 hours.',
    });
  } catch (error: any) {
    console.error('Error in POST /api/customer/support-tickets:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
