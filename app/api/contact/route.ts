import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST - Submit contact form
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required' },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Get current user (if logged in)
    const { data: { user } } = await supabase.auth.getUser();

    // Get IP address and user agent
    const ip_address = request.headers.get('x-forwarded-for') ||
                       request.headers.get('x-real-ip') ||
                       'unknown';
    const user_agent = request.headers.get('user-agent') || 'unknown';

    // Insert contact message
    const { data, error } = await supabase
      .from('contact_messages')
      .insert({
        name,
        email,
        phone: phone || null,
        subject,
        message,
        customer_id: user?.id || null,
        status: 'new',
        priority: 'normal',
        ip_address,
        user_agent,
        source: 'website',
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting contact message:', error);
      return NextResponse.json(
        { error: 'Failed to submit contact form' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully! We will respond within 4 hours.',
      data,
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get user's contact messages (if logged in)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's contact messages
    const { data: messages, error } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching contact messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/contact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
