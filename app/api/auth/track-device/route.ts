import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      deviceFingerprint,
      deviceType,
      osName,
      osVersion,
      browserName,
      browserVersion,
      ipAddress,
      country,
      city,
      userAgent
    } = body;

    // Validate required fields
    if (!deviceFingerprint || !deviceType || !osName || !browserName) {
      return NextResponse.json(
        { error: 'Missing required device information' },
        { status: 400 }
      );
    }

    // Get session ID
    const { data: session } = await supabase.auth.getSession();
    const sessionId = session?.session?.access_token || '';

    // Register device using admin client (to bypass RLS for function execution)
    const adminClient = createAdminClient();
    const { data: deviceData, error: deviceError } = await adminClient
      .rpc('register_device', {
        p_customer_id: user.id,
        p_device_fingerprint: deviceFingerprint,
        p_device_type: deviceType,
        p_os_name: osName,
        p_os_version: osVersion || '',
        p_browser_name: browserName,
        p_browser_version: browserVersion || '',
        p_ip_address: ipAddress || '',
        p_country: country || '',
        p_city: city || '',
        p_session_id: sessionId,
        p_user_agent: userAgent || ''
      });

    if (deviceError) {
      console.error('Device registration error:', deviceError);
      throw deviceError;
    }

    const result = deviceData?.[0];

    return NextResponse.json({
      success: true,
      deviceId: result?.device_id,
      shouldLogoutOthers: result?.should_logout_others || false,
      devicesToLogout: result?.devices_to_logout || []
    });

  } catch (error: any) {
    console.error('Track device error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to track device' },
      { status: 500 }
    );
  }
}
