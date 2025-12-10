import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function PATCH(
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

    const { isTrusted } = await request.json();

    if (typeof isTrusted !== 'boolean') {
      return NextResponse.json({ error: 'Invalid trust status' }, { status: 400 });
    }

    const { id: deviceId } = await params;

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('user_devices')
      .update({ is_trusted: isTrusted })
      .eq('id', deviceId);

    if (error) {
      console.error('Toggle trust error:', error);
      throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Toggle trust error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update device' },
      { status: 500 }
    );
  }
}
