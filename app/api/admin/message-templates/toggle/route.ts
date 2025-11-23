import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PATCH(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { id, enabled } = body;

    if (!id || typeof enabled !== 'boolean') {
      return NextResponse.json({
        success: false,
        error: 'ID and enabled status are required'
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('message_templates')
      .update({
        enabled,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error toggling template:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      template: data
    });
  } catch (error: any) {
    console.error('Toggle template API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to toggle template'
    }, { status: 500 });
  }
}
