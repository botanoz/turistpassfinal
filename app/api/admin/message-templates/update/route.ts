import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function PUT(request: Request) {
  try {
    const supabase = createAdminClient();
    const body = await request.json();
    const { id, title_template, content_template } = body;

    if (!id || !title_template || !content_template) {
      return NextResponse.json({
        success: false,
        error: 'ID, title_template, and content_template are required'
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('message_templates')
      .update({
        title_template,
        content_template,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
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
    console.error('Update template API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update template'
    }, { status: 500 });
  }
}
