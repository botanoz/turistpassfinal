import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { deviceId } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    // Verify device belongs to user
    const { data: device } = await supabase
      .from('user_devices')
      .select('customer_id')
      .eq('id', deviceId)
      .single();

    if (!device || device.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .rpc('force_logout_device', {
        p_device_id: deviceId,
        p_admin_id: user.id
      });

    if (error) {
      console.error('Logout device error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Logout device error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout device' },
      { status: 500 }
    );
  }
}
