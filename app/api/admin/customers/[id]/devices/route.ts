import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin
    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { id: customerId } = await params;

    const adminClient = createAdminClient();

    // Get devices
    const { data: devices, error: devicesError } = await adminClient
      .rpc('get_customer_devices', { p_customer_id: customerId });

    if (devicesError) {
      console.error('Get customer devices error:', devicesError);
      throw devicesError;
    }

    // Get login events
    const { data: loginEvents, error: eventsError } = await adminClient
      .from('device_login_events')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (eventsError) {
      console.error('Get login events error:', eventsError);
    }

    // Get suspicious alerts
    const { data: alerts, error: alertsError } = await adminClient
      .from('suspicious_activity_alerts')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (alertsError) {
      console.error('Get alerts error:', alertsError);
    }

    return NextResponse.json({
      success: true,
      devices: devices || [],
      loginEvents: loginEvents || [],
      alerts: alerts || []
    });

  } catch (error: any) {
    console.error('Get customer devices error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}
