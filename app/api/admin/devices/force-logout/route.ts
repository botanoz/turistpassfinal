import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
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

    const { deviceId } = await request.json();

    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .rpc('force_logout_device', {
        p_device_id: deviceId,
        p_admin_id: user.id
      });

    if (error) {
      console.error('Admin force logout error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Admin force logout error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to logout device' },
      { status: 500 }
    );
  }
}
