import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get all invoices for admin
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

    // Get all invoices with business details
    const { data: invoices, error } = await supabase
      .from('business_invoices')
      .select(`
        *,
        businesses!business_invoices_business_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      invoices
    });

  } catch (error: any) {
    console.error('Get invoices error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch invoices'
    }, { status: 500 });
  }
}
