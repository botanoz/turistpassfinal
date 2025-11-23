import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { customer_id, type, title, content } = body;

    if (!title || !content) {
      return NextResponse.json({
        success: false,
        error: 'Title and content are required'
      }, { status: 400 });
    }

    // If customer_id is provided, send to that customer
    // Otherwise, send to all customers
    if (customer_id) {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          customer_id,
          type: type || 'notification',
          title,
          content,
          read: false
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating message:', error);
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: data
      });
    } else {
      // Send to all customers
      const { data: customers, error: customersError } = await supabase
        .from('customer_profiles')
        .select('id');

      if (customersError) {
        console.error('Error fetching customers:', customersError);
        return NextResponse.json({
          success: false,
          error: customersError.message
        }, { status: 500 });
      }

      const messages = customers.map(customer => ({
        customer_id: customer.id,
        type: type || 'notification',
        title,
        content,
        read: false
      }));

      const { error: insertError } = await supabase
        .from('messages')
        .insert(messages);

      if (insertError) {
        console.error('Error creating messages:', insertError);
        return NextResponse.json({
          success: false,
          error: insertError.message
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        count: customers.length
      });
    }
  } catch (error: any) {
    console.error('Send message API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to send message'
    }, { status: 500 });
  }
}
