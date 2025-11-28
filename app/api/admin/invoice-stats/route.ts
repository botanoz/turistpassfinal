import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Get invoice statistics for admin dashboard
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

    // Get invoice statistics
    const { data: invoices } = await supabase
      .from('business_invoices')
      .select('status, total_amount, due_date');

    const now = new Date();
    let totalInvoices = 0;
    let pendingAmount = 0;
    let paidAmount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;

    if (invoices) {
      totalInvoices = invoices.length;

      invoices.forEach(invoice => {
        const dueDate = new Date(invoice.due_date);
        const amount = parseFloat(invoice.total_amount?.toString() || '0');

        if (invoice.status === 'paid') {
          paidAmount += amount;
        } else if (invoice.status === 'pending') {
          if (dueDate < now) {
            overdueAmount += amount;
            overdueCount++;
          } else {
            pendingAmount += amount;
          }
        } else if (invoice.status === 'overdue') {
          overdueAmount += amount;
          overdueCount++;
        }
      });
    }

    const stats = {
      total_invoices: totalInvoices,
      pending_amount: pendingAmount,
      paid_amount: paidAmount,
      overdue_amount: overdueAmount,
      overdue_count: overdueCount
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error: any) {
    console.error('Get invoice stats error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch invoice statistics'
    }, { status: 500 });
  }
}
