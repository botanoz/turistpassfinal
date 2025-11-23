import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SettingsCategory = 'contact' | 'footer' | 'social' | 'general';

const VALID_CATEGORIES: SettingsCategory[] = ['contact', 'footer', 'social', 'general'];

// GET /api/admin/settings/[category]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;

    if (!VALID_CATEGORIES.includes(category as SettingsCategory)) {
      return NextResponse.json(
        { error: "Invalid category. Must be one of: contact, footer, social, general" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Fetch settings for this category
    const { data: settings, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('category', category)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Settings fetch error:', error);
      return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
    }

    // If no settings found, return default structure
    if (!settings) {
      return NextResponse.json({
        category,
        key: getDefaultKey(category as SettingsCategory),
        value: getDefaultValue(category as SettingsCategory)
      });
    }

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Settings GET error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/admin/settings/[category]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ category: string }> }
) {
  try {
    const { category } = await params;

    if (!VALID_CATEGORIES.includes(category as SettingsCategory)) {
      return NextResponse.json(
        { error: "Invalid category. Must be one of: contact, footer, social, general" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check admin authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify admin status with settings permission
    const { data: adminProfile, error: profileError } = await supabase
      .from('admin_profiles')
      .select('id, role, permissions')
      .eq('id', user.id)
      .single();

    if (profileError || !adminProfile) {
      return NextResponse.json({ error: "Unauthorized - Admin access required" }, { status: 403 });
    }

    // Check if admin has settings permission (super_admin always has access)
    if (adminProfile.role !== 'super_admin' && !adminProfile.permissions?.settings) {
      return NextResponse.json({ error: "Forbidden - Settings permission required" }, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { value } = body;

    if (!value) {
      return NextResponse.json({ error: "Value is required" }, { status: 400 });
    }

    // Validate value based on category
    const validationError = validateSettingsValue(category as SettingsCategory, value);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const key = getDefaultKey(category as SettingsCategory);

    // Upsert settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('site_settings')
      .upsert({
        category,
        key,
        value,
        updated_by: user.id
      }, {
        onConflict: 'category,key'
      })
      .select()
      .single();

    if (updateError) {
      console.error('Settings update error:', updateError);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        user_type: 'admin',
        user_id: user.id,
        action: 'update_settings',
        description: `Updated ${category} settings`,
        category: 'settings',
        metadata: { category }
      });

    return NextResponse.json(updatedSettings);

  } catch (error) {
    console.error('Settings PUT error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Helper functions
function getDefaultKey(category: SettingsCategory): string {
  const keyMap: Record<SettingsCategory, string> = {
    contact: 'info',
    footer: 'content',
    social: 'links',
    general: 'site'
  };
  return keyMap[category];
}

function getDefaultValue(category: SettingsCategory): any {
  const defaultValues: Record<SettingsCategory, any> = {
    contact: {
      email: "info@turistpass.com",
      phone: "+90 212 123 4567",
      address: "Istanbul, Turkey",
      website: "https://turistpass.com"
    },
    footer: {
      about: "TuristPass - Your gateway to exploring Istanbul",
      copyright: "© 2024 TuristPass. All rights reserved.",
      links: [
        { label: "About Us", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Terms", href: "/terms" },
        { label: "Privacy", href: "/privacy" }
      ]
    },
    social: {
      instagram: "https://instagram.com/turistpass",
      facebook: "https://facebook.com/turistpass",
      twitter: "https://twitter.com/turistpass",
      linkedin: ""
    },
    general: {
      title: "TuristPass",
      description: "Discover Istanbul with exclusive passes and discounts",
      supportEmail: "support@turistpass.com",
      businessEmail: "business@turistpass.com"
    }
  };
  return defaultValues[category];
}

function validateSettingsValue(category: SettingsCategory, value: any): string | null {
  try {
    switch (category) {
      case 'contact':
        if (!value.email || !value.phone) {
          return "Contact info must include email and phone";
        }
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email)) {
          return "Invalid email format";
        }
        break;

      case 'footer':
        if (!value.about || !value.copyright) {
          return "Footer must include about and copyright text";
        }
        if (value.links && !Array.isArray(value.links)) {
          return "Footer links must be an array";
        }
        break;

      case 'social':
        // Validate URLs if provided
        const socialFields = ['instagram', 'facebook', 'twitter', 'linkedin'];
        for (const field of socialFields) {
          if (value[field] && value[field].trim() !== '') {
            try {
              new URL(value[field]);
            } catch {
              return `Invalid URL format for ${field}`;
            }
          }
        }
        break;

      case 'general':
        if (!value.title || !value.description) {
          return "General settings must include title and description";
        }
        if (value.supportEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.supportEmail)) {
          return "Invalid support email format";
        }
        if (value.businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.businessEmail)) {
          return "Invalid business email format";
        }
        break;
    }

    return null;
  } catch (error) {
    return "Invalid settings value format";
  }
}
