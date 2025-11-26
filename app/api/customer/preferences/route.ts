import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get preferences from customer_profiles
    const { data: profile, error } = await supabase
      .from('customer_profiles')
      .select('preferred_language, preferred_currency, notification_preferences, phone')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching preferences:', error);
      return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      preferences: {
        language: profile?.preferred_language || 'tr',
        currency: profile?.preferred_currency || 'TRY',
        notifications: profile?.notification_preferences || {
          email_marketing: true,
          email_updates: true,
          email_offers: true,
          sms_marketing: false,
          sms_reminders: true,
          push_notifications: true,
        },
        phone: profile?.phone || '',
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/customer/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update user preferences
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { language, currency, notifications, phone } = body;

    // Validate language
    if (language && !['tr', 'en', 'de'].includes(language)) {
      return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    // Validate currency
    if (currency && !['TRY', 'USD', 'EUR', 'GBP', 'JPY'].includes(currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (language) updates.preferred_language = language;
    if (currency) updates.preferred_currency = currency;
    if (notifications) updates.notification_preferences = notifications;
    if (phone !== undefined) updates.phone = phone;

    // Update preferences
    const { data, error } = await supabase
      .from('customer_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating preferences:', error);
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: {
        language: data.preferred_language,
        currency: data.preferred_currency,
        notifications: data.notification_preferences,
        phone: data.phone,
      },
    }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/customer/preferences:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
