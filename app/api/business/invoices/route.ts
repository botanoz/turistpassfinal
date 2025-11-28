import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get business invoices
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get business account
    const { data: businessAccount } = await supabase
      .from('business_accounts')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (!businessAccount) {
      return NextResponse.json({ success: false, error: 'Business account not found' }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    let query = supabase
      .from('business_invoices')
      .select('*')
      .eq('business_id', businessAccount.business_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }

    // Get summary stats
    const { data: summary } = await supabase
      .from('business_invoices')
      .select('total_amount, status')
      .eq('business_id', businessAccount.business_id);

    const stats = {
      total_invoiced: summary?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0,
      pending_amount: summary?.filter((inv: any) => inv.status === 'pending')
        .reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0,
      paid_amount: summary?.filter((inv: any) => inv.status === 'paid')
        .reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0,
      overdue_amount: summary?.filter((inv: any) => inv.status === 'overdue')
        .reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0
    };

    return NextResponse.json({
      success: true,
      invoices,
      stats
    });

  } catch (error: any) {
    console.error('Get invoices error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch invoices'
    }, { status: 500 });
  }
}
