import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient();
    const { data: devices, error } = await adminClient
      .rpc('get_customer_devices', { p_customer_id: user.id });

    if (error) {
      console.error('Get devices error:', error);
      throw error;
    }

    return NextResponse.json({ success: true, devices: devices || [] });

  } catch (error: any) {
    console.error('Get devices error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch devices' },
      { status: 500 }
    );
  }
}
