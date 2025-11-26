import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET - Get all currencies
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    // Get all currencies
    const { data: currencies, error } = await supabase
      .from('currency_settings')
      .select('*')
      .order('is_default', { ascending: false })
      .order('currency_code', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ currencies }, { status: 200 });
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currencies' },
      { status: 500 }
    );
  }
}

// PUT - Update currency settings
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { id, exchange_rate, is_active, is_default } = body;

    if (!id) {
      return NextResponse.json({ error: 'Currency ID is required' }, { status: 400 });
    }

    // If setting as default, unset other defaults first
    if (is_default === true) {
      await supabase
        .from('currency_settings')
        .update({ is_default: false })
        .neq('id', id);
    }

    // Update the currency
    const { data: currency, error } = await supabase
      .from('currency_settings')
      .update({
        exchange_rate: exchange_rate,
        is_active: is_active,
        is_default: is_default,
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ currency, message: 'Currency updated successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error updating currency:', error);
    return NextResponse.json(
      { error: 'Failed to update currency' },
      { status: 500 }
    );
  }
}

// POST - Bulk update exchange rates
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!adminProfile) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { rates } = body; // { USD: 34.5, EUR: 37.5, GBP: 43.5, JPY: 0.23 }

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ error: 'Invalid rates format' }, { status: 400 });
    }

    // Update each currency rate
    const updates = [];
    for (const [currencyCode, rate] of Object.entries(rates)) {
      if (typeof rate === 'number' && rate > 0) {
        updates.push(
          supabase
            .from('currency_settings')
            .update({
              exchange_rate: rate,
              last_updated: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('currency_code', currencyCode)
        );
      }
    }

    await Promise.all(updates);

    // Trigger price recalculation
    const { error: recalcError } = await supabase.rpc('update_exchange_rates', {
      p_usd_rate: rates.USD || null,
      p_eur_rate: rates.EUR || null,
      p_gbp_rate: rates.GBP || null,
      p_jpy_rate: rates.JPY || null,
    });

    if (recalcError) {
      console.error('Error recalculating prices:', recalcError);
    }

    return NextResponse.json(
      { message: 'Exchange rates updated and prices recalculated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating exchange rates:', error);
    return NextResponse.json(
      { error: 'Failed to update exchange rates' },
      { status: 500 }
    );
  }
}
