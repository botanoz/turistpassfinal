import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Mark invoice as paid
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    // Update invoice status
    const { data: invoice, error: updateError } = await supabase
      .from('business_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_method: 'manual',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating invoice:', updateError);
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      invoice,
      message: 'Invoice marked as paid successfully'
    });

  } catch (error: any) {
    console.error('Mark invoice paid error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to mark invoice as paid'
    }, { status: 500 });
  }
}
