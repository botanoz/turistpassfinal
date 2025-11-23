import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/admin/settings - Get all settings grouped by category
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    // Get query parameter for category filter
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category');

    // Build query
    let query = supabase
      .from('settings')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true });

    // Apply category filter if provided
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: settings, error } = await query;

    if (error) {
      console.error('Settings fetch error:', error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    // Group settings by category
    const groupedSettings: Record<string, any[]> = {};
    (settings || []).forEach(setting => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }

      groupedSettings[setting.category].push({
        id: setting.id,
        key: setting.key,
        value: setting.value,
        dataType: setting.data_type,
        label: setting.label,
        description: setting.description,
        placeholder: setting.placeholder,
        isRequired: setting.is_required,
        isPublic: setting.is_public,
        category: setting.category,
      });
    });

    // Get statistics
    const stats = {
      total: settings?.length || 0,
      byCategory: {
        site: groupedSettings['site']?.length || 0,
        email: groupedSettings['email']?.length || 0,
        payment: groupedSettings['payment']?.length || 0,
        general: groupedSettings['general']?.length || 0,
      }
    };

    return NextResponse.json({
      settings: groupedSettings,
      stats,
      isSuperAdmin: adminProfile.role === 'super_admin'
    });

  } catch (error) {
    console.error('Settings API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - Update settings (batch update)
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify super admin status (only super admins can modify settings)
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 403 }
      );
    }

    if (adminProfile.role !== 'super_admin') {
      return NextResponse.json(
        { error: "Forbidden - Super admin access required" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { settings } = body;

    if (!settings || !Array.isArray(settings)) {
      return NextResponse.json(
        { error: "Invalid request: settings array required" },
        { status: 400 }
      );
    }

    // Validate each setting
    for (const setting of settings) {
      if (!setting.key || setting.value === undefined) {
        return NextResponse.json(
          { error: `Invalid setting: key and value required` },
          { status: 400 }
        );
      }
    }

    // Update settings one by one
    const updatePromises = settings.map(async (setting: any) => {
      const { key, value } = setting;

      // Get current setting to check if required
      const { data: currentSetting } = await supabase
        .from('settings')
        .select('is_required, data_type')
        .eq('key', key)
        .single();

      // Validate required fields
      if (currentSetting?.is_required && (!value || value.trim() === '')) {
        throw new Error(`Setting "${key}" is required and cannot be empty`);
      }

      // Update the setting
      const { error: updateError } = await supabase
        .from('settings')
        .update({ value })
        .eq('key', key);

      if (updateError) {
        throw updateError;
      }

      return { key, success: true };
    });

    try {
      await Promise.all(updatePromises);
    } catch (err: any) {
      console.error('Settings update error:', err);
      return NextResponse.json(
        { error: err.message || "Failed to update settings" },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: 'update_settings',
      description: `Updated ${settings.length} settings`,
      metadata: {
        updated_keys: settings.map((s: any) => s.key)
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${settings.length} settings`
    });

  } catch (error) {
    console.error('Settings update API error:', error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
