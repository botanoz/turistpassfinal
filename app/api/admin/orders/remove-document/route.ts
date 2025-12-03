import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Admin access required'
      }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { orderId, type } = body;

    if (!orderId || !type) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 });
    }

    if (type !== 'invoice' && type !== 'receipt') {
      return NextResponse.json({
        success: false,
        error: 'Invalid document type'
      }, { status: 400 });
    }

    // Get current document URL
    const urlField = type === 'invoice' ? 'invoice_url' : 'receipt_url';
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`id, order_number, ${urlField}`)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({
        success: false,
        error: 'Order not found'
      }, { status: 404 });
    }

    const documentUrl = order[urlField as keyof typeof order];

    // Update order to remove document URL
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        [urlField]: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json({
        success: false,
        error: 'Failed to update order'
      }, { status: 500 });
    }

    // Try to delete file from storage (if URL exists)
    if (documentUrl && typeof documentUrl === 'string') {
      try {
        // Extract file path from URL
        const url = new URL(documentUrl);
        const pathParts = url.pathname.split('/documents/');
        if (pathParts.length > 1) {
          const filePath = pathParts[1];

          const supabaseAdmin = createAdminClient();
          await supabaseAdmin.storage
            .from('documents')
            .remove([filePath]);
        }
      } catch (storageError) {
        // Log but don't fail - document URL already removed from database
        console.error('Storage deletion error:', storageError);
      }
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: `remove_${type}`,
        description: `Removed ${type} from order ${order.order_number}`,
        category: 'orders',
        metadata: { orderId, type }
      });

    return NextResponse.json({
      success: true
    });

  } catch (error: any) {
    console.error('Remove document error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
