import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get all payments for admin
export async function GET() {
  try {
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

    // Get all payments with business and invoice details
    const { data: payments, error } = await supabase
      .from('business_payments')
      .select(`
        *,
        businesses!business_payments_business_id_fkey(name),
        business_invoices!business_payments_invoice_id_fkey(invoice_number)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching payments:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      payments
    });

  } catch (error: any) {
    console.error('Get payments error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch payments'
    }, { status: 500 });
  }
}
