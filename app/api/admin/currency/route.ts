import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY'];
const MONTHLY_LIMIT = 250; // monthly provider quota
const DAY_START_HOUR = 9;
const NIGHT_START_HOUR = 23; // 23:00-09:00 uses longer interval
const DAY_INTERVAL_MIN = 180; // 3 hours
const NIGHT_INTERVAL_MIN = 720; // 12 hours

type UsageStats = {
  month_requests: number;
  month_limit: number;
  remaining: number;
  last_success?: string | null;
  last_error?: string | null;
};

type AdminContext =
  | { supabase: any; session: any }
  | { error: NextResponse };

async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: adminProfile } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!adminProfile) {
    return { error: NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 }) };
  }

  return { supabase, session: { user } };
}

const getIstanbulHour = (date: Date) =>
  Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Istanbul',
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date)
  );

const intervalForNow = (date: Date) => {
  const hour = getIstanbulHour(date);
  return hour >= DAY_START_HOUR && hour < NIGHT_START_HOUR ? DAY_INTERVAL_MIN : NIGHT_INTERVAL_MIN;
};

async function getUsageStats(supabase: any): Promise<UsageStats> {
  const { data } = await supabase.rpc('get_currency_refresh_stats');
  const stats = data?.[0];
  const used = stats?.month_requests ?? 0;
  return {
    month_requests: used,
    month_limit: stats?.month_limit ?? MONTHLY_LIMIT,
    remaining: stats?.remaining ?? Math.max(MONTHLY_LIMIT - used, 0),
    last_success: stats?.last_success ?? null,
    last_error: stats?.last_error ?? null,
  };
}

async function logProviderCall(
  supabase: any,
  entry: {
    source: string;
    status: 'success' | 'error' | 'skipped';
    requested_by: string;
    provider_called: boolean;
    response_code?: number | null;
    error_message?: string | null;
    currencies?: string[];
    payload?: any;
  }
) {
  await supabase.from('currency_rate_logs').insert({
    provider: 'currencyapi',
    source: entry.source,
    status: entry.status,
    provider_called: entry.provider_called,
    response_code: entry.response_code ?? null,
    error_message: entry.error_message ?? null,
    requested_by: entry.requested_by,
    currencies: entry.currencies ?? SUPPORTED_CURRENCIES,
    payload: entry.payload ?? null,
  });
}

async function fetchLiveRatesFromProvider() {
  const apiKeyRaw = process.env.CURRENCY_API_KEY || process.env.NEXT_PUBLIC_CURRENCY_API_KEY;
  const apiKey = apiKeyRaw?.trim();
  if (!apiKey) {
    throw new Error('CURRENCY_API_KEY not set');
  }

  const baseUrl = process.env.CURRENCY_API_BASE_URL || 'https://api.currencyapi.com/v3/latest';
  const params = new URLSearchParams({
    apikey: apiKey,
    // base_currency is paid planda, free için default USD; TRY dahil edip çapraz hesaplıyoruz
    currencies: ['TRY', ...SUPPORTED_CURRENCIES].join(','),
  });
  const url = `${baseUrl}?${params.toString()}`;

  const response = await fetch(url, {
    cache: 'no-store',
    headers: { apikey: apiKey },
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.message || payload?.error || `Live rate call failed (status: ${response.status})`;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).payload = payload;
    throw error;
  }

  const rates: Record<string, number> = {};
  const tryValue = payload?.data?.TRY?.value;

  if (typeof tryValue !== 'number' || tryValue <= 0) {
    throw new Error('Provider response missing TRY rate');
  }

  // API default base USD: data[TRY].value = 1 USD in TRY
  const usdToTry = Number(tryValue);

  for (const code of SUPPORTED_CURRENCIES) {
    const value = payload?.data?.[code]?.value;
    if (code === 'USD') {
      rates.USD = usdToTry; // 1 USD = TRY
      continue;
    }
    if (typeof value === 'number' && value > 0) {
      // value = 1 USD in <code>; so 1 <code> = (usdToTry / value) TRY
      rates[code] = Number((usdToTry / value).toFixed(6));
    }
  }

  for (const code of SUPPORTED_CURRENCIES) {
    if (typeof rates[code] !== 'number' || rates[code] <= 0) {
      throw new Error(`Provider missing rate for ${code}`);
    }
  }

  if (Object.keys(rates).length === 0) {
    throw new Error('Provider returned no valid rates');
  }

  return { rates, payload, statusCode: response.status };
}

async function writeLiveRates(supabase: any, rates: Record<string, number>) {
  const nowIso = new Date().toISOString();
  const updates: Promise<any>[] = [];

  for (const [code, rate] of Object.entries(rates)) {
    updates.push(
      supabase
        .from('currency_settings')
        .update({
          live_rate: rate,
          live_rate_at: nowIso,
          live_rate_source: 'currencyapi',
          last_fetch_status: 'success',
          last_fetch_error: null,
        })
        .eq('currency_code', code)
    );

    updates.push(
      supabase
        .from('currency_settings')
        .update({
          exchange_rate: rate,
          last_updated: nowIso,
          updated_at: nowIso,
        })
        .eq('currency_code', code)
        .eq('rate_mode', 'live')
    );

    updates.push(
      supabase
        .from('currency_settings')
        .update({
          rate_mode: 'live',
          exchange_rate: rate,
          manual_expires_at: null,
          last_updated: nowIso,
          updated_at: nowIso,
        })
        .eq('currency_code', code)
        .not('manual_expires_at', 'is', null)
        .lte('manual_expires_at', nowIso)
    );
  }

  await Promise.all(updates);

  await supabase.rpc('update_exchange_rates', {
    p_usd_rate: null,
    p_eur_rate: null,
    p_gbp_rate: null,
    p_jpy_rate: null,
  });
}

async function maybeRefreshCurrencies(
  supabase: any,
  userId: string,
  opts: { source: string; force?: boolean; usage?: UsageStats }
) {
  const now = new Date();
  const usage = opts.usage || (await getUsageStats(supabase));
  const remaining = usage.remaining ?? Math.max(MONTHLY_LIMIT - (usage.month_requests || 0), 0);

  if (remaining <= 0) {
    return { status: 'skipped', reason: 'limit', stats: usage };
  }

  const minInterval = intervalForNow(now);
  const lastSuccessDate = usage.last_success ? new Date(usage.last_success) : null;
  const nextAllowedAt =
    lastSuccessDate && !opts.force
      ? new Date(lastSuccessDate.getTime() + minInterval * 60000)
      : now;

  if (!opts.force && lastSuccessDate && nextAllowedAt > now) {
    return {
      status: 'skipped',
      reason: 'cooldown',
      stats: usage,
      next_allowed_at: nextAllowedAt.toISOString(),
      interval_minutes: minInterval,
    };
  }

  try {
    const liveResult = await fetchLiveRatesFromProvider();
    await writeLiveRates(supabase, liveResult.rates);

    await logProviderCall(supabase, {
      source: opts.source,
      status: 'success',
      provider_called: true,
      response_code: liveResult.statusCode,
      requested_by: userId,
      currencies: Object.keys(liveResult.rates),
      payload: { base: 'TRY', rates: liveResult.rates },
    });

    const refreshedUsage = await getUsageStats(supabase);

    return {
      status: 'success',
      rates: liveResult.rates,
      stats: refreshedUsage,
      fetched_at: now.toISOString(),
      interval_minutes: minInterval,
    };
  } catch (err: any) {
    const message = err?.message || 'Live rate fetch failed';
    const providerCalled = !(message.includes('not set'));

    await supabase
      .from('currency_settings')
      .update({ last_fetch_status: 'error', last_fetch_error: message })
      .in('currency_code', SUPPORTED_CURRENCIES);

    await logProviderCall(supabase, {
      source: opts.source,
      status: 'error',
      provider_called: providerCalled,
      requested_by: userId,
      error_message: message,
      response_code: (err as any)?.status ?? null,
      payload: (err as any)?.payload ?? null,
    });

    return { status: 'error', error: message, stats: usage };
  }
}

// GET - fetch currencies + stats (auto refresh if interval allows)
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) return admin.error;
    const { supabase, session } = admin;

    const autoRefresh = request.nextUrl.searchParams.get('auto') !== 'false';
    let stats = await getUsageStats(supabase);
    let refreshResult: any = null;

    if (autoRefresh) {
      refreshResult = await maybeRefreshCurrencies(supabase, session.user.id, {
        source: 'auto_view',
        usage: stats,
      });
      if (refreshResult?.stats) {
        stats = refreshResult.stats;
      }
    }

    const { data: currencies, error } = await supabase
      .from('currency_settings')
      .select('*')
      .order('is_default', { ascending: false })
      .order('currency_code', { ascending: true });

    if (error) throw error;

    const intervalMinutes = intervalForNow(new Date());
    const nextAllowedAt = stats.last_success
      ? new Date(new Date(stats.last_success).getTime() + intervalMinutes * 60000).toISOString()
      : null;

    return NextResponse.json(
      {
        currencies,
        stats,
        refresh: refreshResult,
        meta: {
          interval_minutes: intervalMinutes,
          next_allowed_at: nextAllowedAt,
          monthly_limit: MONTHLY_LIMIT,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching currencies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch currencies' },
      { status: 500 }
    );
  }
}

// PUT - update a single currency (manual/live modes)
export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) return admin.error;
    const { supabase, session } = admin;

    const body = await request.json();
    const {
      id,
      currency_code,
      exchange_rate,
      manual_rate,
      manual_expires_at,
      rate_mode,
      is_active,
      is_default,
      is_admin_display,
      live_rate,
    } = body;

    if (!id && !currency_code) {
      return NextResponse.json({ error: 'Currency ID or code is required' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const updateData: Record<string, any> = {
      last_updated: nowIso,
      updated_at: nowIso,
    };

    const isManualMode = rate_mode === 'manual' || currency_code === 'TRY';
    const effectiveRate = typeof manual_rate === 'number' ? manual_rate : exchange_rate;

    if (isManualMode) {
      if (!effectiveRate || effectiveRate <= 0) {
        return NextResponse.json({ error: 'Manual rate must be greater than 0' }, { status: 400 });
      }
      updateData.rate_mode = 'manual';
      updateData.manual_rate = effectiveRate;
      updateData.manual_rate_at = nowIso;
      updateData.manual_expires_at = manual_expires_at ? new Date(manual_expires_at).toISOString() : null;
      updateData.exchange_rate = effectiveRate;
      updateData.last_fetch_status = 'manual';
      updateData.last_fetch_error = null;
    }

    if (rate_mode === 'live' && currency_code !== 'TRY') {
      updateData.rate_mode = 'live';
      updateData.manual_expires_at = null;
      updateData.last_fetch_status = 'live';
      if (typeof live_rate === 'number' && live_rate > 0) {
        updateData.exchange_rate = live_rate;
      }
    }

    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_default !== undefined) updateData.is_default = is_default;
    if (is_admin_display !== undefined) updateData.is_admin_display = is_admin_display;

    if (is_default === true) {
      await supabase
        .from('currency_settings')
        .update({ is_default: false })
        .neq('id', id ?? '')
        .neq('currency_code', currency_code ?? '');
    }
    if (is_admin_display === true) {
      await supabase
        .from('currency_settings')
        .update({ is_admin_display: false })
        .neq('id', id ?? '')
        .neq('currency_code', currency_code ?? '');
    }

    const { data: currency, error } = await supabase
      .from('currency_settings')
      .update(updateData)
      .match(id ? { id } : { currency_code })
      .select()
      .single();

    if (error) throw error;

    await supabase.rpc('update_exchange_rates', {
      p_usd_rate: null,
      p_eur_rate: null,
      p_gbp_rate: null,
      p_jpy_rate: null,
    });

    await logProviderCall(supabase, {
      source: 'manual_override',
      status: 'success',
      provider_called: false,
      requested_by: session.user.id,
      currencies: [currency.currency_code],
      payload: { updateData },
    });

    return NextResponse.json(
      { currency, message: 'Currency updated successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating currency:', error);
    return NextResponse.json(
      { error: 'Failed to update currency' },
      { status: 500 }
    );
  }
}

// POST - live refresh or bulk manual update
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) return admin.error;
    const { supabase, session } = admin;

    const body = await request.json();
    const { action, rates, manual_expires_at, currency } = body;

    if (action === 'create') {
      const { code, name, symbol, exchange_rate, decimal_places, symbol_position } = currency || {};
      if (!code || !name || !symbol || !exchange_rate || Number(exchange_rate) <= 0) {
        return NextResponse.json({ error: 'code, name, symbol, exchange_rate gerekli' }, { status: 400 });
      }

      const insertData = {
        currency_code: String(code).toUpperCase().trim(),
        currency_name: name,
        currency_symbol: symbol,
        exchange_rate: Number(exchange_rate),
        decimal_places: Number(decimal_places ?? 2),
        symbol_position: symbol_position === 'after' ? 'after' : 'before',
        is_active: true,
        is_default: false,
        rate_mode: 'manual',
        manual_rate: Number(exchange_rate),
        manual_rate_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error } = await supabase
        .from('currency_settings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating currency:', error);
        return NextResponse.json({ error: 'Currency could not be created' }, { status: 400 });
      }

      await logProviderCall(supabase, {
        source: 'manual_create',
        status: 'success',
        provider_called: false,
        requested_by: session.user.id,
        currencies: [insertData.currency_code],
        payload: insertData,
      });

      return NextResponse.json(
        { message: 'Currency created', currency: created },
        { status: 200 }
      );
    }

    if (action === 'refresh') {
      const refreshResult = await maybeRefreshCurrencies(supabase, session.user.id, {
        source: 'manual_refresh',
        force: true,
      });

      const statusCode =
        refreshResult.status === 'success'
          ? 200
          : refreshResult.status === 'skipped'
            ? 429
            : 500;

      return NextResponse.json(
        {
          message:
            refreshResult.status === 'success'
              ? 'Live rates updated'
              : refreshResult.reason || refreshResult.error || 'Refresh skipped',
          refresh: refreshResult,
        },
        { status: statusCode }
      );
    }

    if (!rates || typeof rates !== 'object') {
      return NextResponse.json({ error: 'Invalid rates format' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const updates: Promise<any>[] = [];
    const affected: string[] = [];

    for (const [currencyCode, rate] of Object.entries(rates)) {
      if (
        typeof rate === 'number' &&
        rate > 0 &&
        SUPPORTED_CURRENCIES.includes(currencyCode)
      ) {
        affected.push(currencyCode);
        updates.push(
          supabase
            .from('currency_settings')
            .update({
              rate_mode: 'manual',
              manual_rate: rate,
              manual_rate_at: nowIso,
              manual_expires_at: manual_expires_at ? new Date(manual_expires_at).toISOString() : null,
              exchange_rate: rate,
              last_updated: nowIso,
              updated_at: nowIso,
              last_fetch_status: 'manual',
              last_fetch_error: null,
            })
            .eq('currency_code', currencyCode)
        );
      }
    }

    await Promise.all(updates);

    await supabase.rpc('update_exchange_rates', {
      p_usd_rate: null,
      p_eur_rate: null,
      p_gbp_rate: null,
      p_jpy_rate: null,
    });

    await logProviderCall(supabase, {
      source: 'manual_bulk',
      status: 'success',
      provider_called: false,
      requested_by: session.user.id,
      currencies: affected,
      payload: { rates, manual_expires_at },
    });

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
