import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get all contact messages (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query
    let query = supabase
      .from('contact_messages')
      .select(`
        *,
        customer:customer_profiles(first_name, last_name, email),
        assigned_admin:admin_profiles!assigned_to(name, email),
        responded_admin:admin_profiles!responded_by(name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data: messages, error, count } = await query;

    if (error) {
      console.error('Error fetching contact messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    // Get stats
    const { data: stats } = await supabase.rpc('get_contact_messages_stats');

    return NextResponse.json({
      success: true,
      messages,
      total: count,
      stats: stats?.[0] || null,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/admin/contact-messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update contact message (assign, respond, change status)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, action, status, priority, response } = body;

    if (!id) {
      return NextResponse.json({ error: 'Message ID is required' }, { status: 400 });
    }

    let updateData: any = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'assign':
        updateData.assigned_to = user.id;
        updateData.assigned_at = new Date().toISOString();
        if (status) updateData.status = status;
        break;

      case 'respond':
        if (!response) {
          return NextResponse.json({ error: 'Response is required' }, { status: 400 });
        }
        updateData.admin_response = response;
        updateData.responded_by = user.id;
        updateData.responded_at = new Date().toISOString();
        updateData.status = 'resolved';
        break;

      case 'update':
        if (status) updateData.status = status;
        if (priority) updateData.priority = priority;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contact_messages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating contact message:', error);
      return NextResponse.json(
        { error: 'Failed to update message' },
        { status: 500 }
      );
    }

    // If responding, send email to customer
    if (action === 'respond' && response) {
      // TODO: Send email notification to customer
      console.log('TODO: Send email to customer:', data.email);
    }

    return NextResponse.json({
      success: true,
      message: 'Message updated successfully',
      data,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/admin/contact-messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
