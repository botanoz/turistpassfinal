'use client';

import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Loader2,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Star,
  Clock,
  DollarSign,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Currency {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  exchange_rate: number;
  live_rate?: number | null;
  live_rate_at?: string | null;
  manual_rate?: number | null;
  manual_rate_at?: string | null;
  manual_expires_at?: string | null;
  rate_mode?: 'live' | 'manual';
  decimal_places: number;
  symbol_position: string;
  is_active: boolean;
  is_default: boolean;
  is_admin_display: boolean;
  last_updated?: string;
  last_fetch_status?: string | null;
  last_fetch_error?: string | null;
}

interface Stats {
  month_requests: number;
  month_limit: number;
  remaining: number;
  last_success?: string | null;
  last_error?: string | null;
}

interface MetaInfo {
  interval_minutes?: number;
  next_allowed_at?: string | null;
  monthly_limit?: number;
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-US', { hour12: false });
};

function CurrencySettingsContent() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [meta, setMeta] = useState<MetaInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    code: '',
    name: '',
    symbol: '',
    exchange_rate: '',
    decimal_places: 2,
    symbol_position: 'before',
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/currency');
      const data = await response.json();

      if (response.ok) {
        setCurrencies(data.currencies || []);
        setStats(data.stats || null);
        setMeta(data.meta || null);
      } else {
        throw new Error(data.error || 'Failed to fetch currencies');
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast({
        title: 'Error',
        description: 'Failed to load rates.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (currency: Currency) => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currency.id,
          currency_code: currency.currency_code,
          exchange_rate: currency.exchange_rate,
          manual_rate: currency.manual_rate ?? currency.exchange_rate,
          manual_expires_at: currency.manual_expires_at,
          rate_mode: currency.rate_mode,
          is_active: currency.is_active,
          is_default: currency.is_default,
          is_admin_display: currency.is_admin_display,
          live_rate: currency.live_rate,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
        title: 'Updated',
        description: `${currency.currency_code} rate updated.`,
        });
        await fetchCurrencies();
      } else {
        throw new Error(data.error || 'Failed to update currency');
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rate.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateRates = async () => {
    try {
      setBulkSaving(true);
      const rates: Record<string, number> = {};

      currencies.forEach((currency) => {
        if (currency.currency_code !== 'TRY') {
          const value = currency.manual_rate ?? currency.exchange_rate;
          if (value && value > 0) {
            rates[currency.currency_code] = value;
          }
        }
      });

      const response = await fetch('/api/admin/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
        title: 'Saved',
        description: 'Manual rates applied and prices recalculated.',
        });
        await fetchCurrencies();
      } else {
        throw new Error(data.error || 'Failed to update rates');
      }
    } catch (error) {
      console.error('Error updating rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to update rates.',
        variant: 'destructive',
      });
    } finally {
      setBulkSaving(false);
    }
  };

  const handleCreateCurrency = async () => {
    try {
      setCreating(true);
      const payload = {
        action: 'create',
        currency: {
          code: newCurrency.code,
          name: newCurrency.name,
          symbol: newCurrency.symbol,
          exchange_rate: Number(newCurrency.exchange_rate),
          decimal_places: Number(newCurrency.decimal_places),
          symbol_position: newCurrency.symbol_position,
        },
      };
      const response = await fetch('/api/admin/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Currency could Note be created');
      }
      toast({
        title: 'Created',
        description: `${newCurrency.code.toUpperCase()} created.`,
      });
      setNewCurrency({
        code: '',
        name: '',
        symbol: '',
        exchange_rate: '',
        decimal_places: 2,
        symbol_position: 'before',
      });
      await fetchCurrencies();
    } catch (error) {
      console.error('Error creating currency:', error);
      toast({
        title: 'Error',
        description: 'Failed to create currency.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleManualRateChange = (currencyCode: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;
    setCurrencies((prev) =>
      prev.map((c) =>
        c.currency_code === currencyCode
          ? { ...c, manual_rate: numValue, exchange_rate: numValue }
          : c
      )
    );
  };

  const handleRateModeChange = async (currency: Currency, mode: 'live' | 'manual') => {
    const updated: Currency = { ...currency, rate_mode: mode };
    if (mode === 'live') {
      updated.manual_expires_at = null;
      updated.exchange_rate = currency.live_rate || currency.exchange_rate;
    } else {
      updated.manual_rate = currency.manual_rate ?? currency.exchange_rate;
      updated.exchange_rate = updated.manual_rate || currency.exchange_rate;
    }
    await updateCurrency(updated);
  };

  const handleActiveToggle = async (currency: Currency) => {
    const updatedCurrency = { ...currency, is_active: !currency.is_active };
    await updateCurrency(updatedCurrency);
  };

  const handleDefaultToggle = async (currency: Currency) => {
    if (!currency.is_default) {
      const updatedCurrency = { ...currency, is_default: true };
      await updateCurrency(updatedCurrency);
    }
  };

  const handleAdminDisplayToggle = async (currency: Currency) => {
    const updatedCurrency = { ...currency, is_admin_display: true };
    await updateCurrency(updatedCurrency);
  };

  const handleRefreshLive = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/admin/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      });
      const data = await response.json();

      if (response.ok) {
        toast({
        title: 'Live rates pulled',
        description: data.message || 'Latest rates applied.',
        });
        await fetchCurrencies();
      } else {
        toast({
        title: 'Refresh skipped',
        description: data.message || 'Skipped due to limit/cooldown.',
        });
      }
    } catch (error) {
      console.error('Error refreshing rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch live rates.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  const usedPercent = useMemo(() => {
    if (!stats?.month_limit) return 0;
    return Math.min(Math.round((stats.month_requests / stats.month_limit) * 100), 100);
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Currency Settings</h1>
          <p className="text-muted-foreground">
            Live refresh every 3h between 09:00-23:00 and every 12h overnight; manual rates apply instantly.
            
          </p>
        </div>
        <Button onClick={handleRefreshLive} disabled={refreshing} variant="outline" size="lg">
          {refreshing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Refreshing
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Live
            </>
          )}
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add New Currency</CardTitle>
              <CardDescription>Start a new currency with a manual rate.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCurrency(!showAddCurrency)}
            >
              {showAddCurrency ? 'Hide' : 'Show Form'}
            </Button>
          </div>
        </CardHeader>
        {showAddCurrency && (
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input
              id="code"
              placeholder="e.g. CAD"
              value={newCurrency.code}
              onChange={(e) => setNewCurrency((p) => ({ ...p, code: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Canadian Dollar"
              value={newCurrency.name}
              onChange={(e) => setNewCurrency((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              placeholder="$"
              value={newCurrency.symbol}
              onChange={(e) => setNewCurrency((p) => ({ ...p, symbol: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="exchange_rate">Exchange Rate (1 unit = ? TRY)</Label>
            <Input
              id="exchange_rate"
              type="number"
              step="0.0001"
              min="0"
              value={newCurrency.exchange_rate}
              onChange={(e) => setNewCurrency((p) => ({ ...p, exchange_rate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="decimal_places">Decimals</Label>
            <Input
              id="decimal_places"
              type="number"
              min="0"
              max="4"
              value={newCurrency.decimal_places}
              onChange={(e) => setNewCurrency((p) => ({ ...p, decimal_places: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="symbol_position">Symbol Position</Label>
            <select
              id="symbol_position"
              className="border rounded px-3 py-2 text-sm"
              value={newCurrency.symbol_position}
              onChange={(e) => setNewCurrency((p) => ({ ...p, symbol_position: e.target.value }))}
            >
              <option value="before">Before</option>
              <option value="after">After</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button onClick={handleCreateCurrency} disabled={creating} className="w-full">
              {creating ? 'Adding...' : 'Add Currency'}
            </Button>
          </div>
        </CardContent>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Quota
            </CardTitle>
            <CardDescription>Monthly limit {stats?.month_limit ?? meta?.monthly_limit ?? 250}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Used</span>
              <span>
                {stats?.month_requests ?? 0} / {stats?.month_limit ?? meta?.monthly_limit ?? 250}
              </span>
            </div>
            <Progress value={usedPercent} />
            <p className="text-xs text-muted-foreground mt-2">
              Remaining: {stats?.remaining ?? (meta?.monthly_limit ?? 250) - (stats?.month_requests ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Schedule
            </CardTitle>
            <CardDescription>Last / Next live fetch</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              <div className="flex justify-between">
                <span>Last success</span>
                <span>{formatDateTime(stats?.last_success)}</span>
              </div>
              <div className="flex justify-between">
                <span>Last error</span>
                <span>{formatDateTime(stats?.last_error)}</span>
              </div>
              <div className="flex justify-between">
                <span>Next allowed</span>
                <span>{formatDateTime(meta?.next_allowed_at)}</span>
              </div>
              <div className="flex justify-between">
                <span>Interval</span>
                <span>{meta?.interval_minutes || 0} min</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Note
            </CardTitle>
            <CardDescription>Short info</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-1">
            <p>- TRY is fixed at 1 and not fetched.</p>
            <p>- Manual mode: value applies instantly.</p>
            <p>- Live mode: latest fetched rate; manual overrides switch mode.</p>
          </CardContent>
        </Card>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Changing a rate recalculates all prices. Live refresh is skipped if quota or cooldown is hit.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {currencies.map((currency) => {
          const isManual = (currency.rate_mode || 'live') === 'manual' || currency.currency_code === 'TRY';
          const manualValue = currency.manual_rate ?? currency.exchange_rate;
          const liveValue = currency.live_rate ?? currency.exchange_rate;
          return (
            <Card key={currency.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-2xl">{currency.currency_symbol}</span>
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {currency.currency_name} ({currency.currency_code})
                      </CardTitle>
                      <CardDescription>
                        Last updated: {formatDateTime(currency.last_updated)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{(currency.rate_mode || 'live').toUpperCase()}</Badge>
                    {currency.is_admin_display && (
                      <Badge variant="default" className="bg-amber-500">
                        <Star className="w-3 h-3 mr-1" />
                        Admin
                      </Badge>
                    )}
                    {currency.is_default && <Badge variant="default">Default</Badge>}
                    {currency.is_active ? (
                      <Badge variant="default" className="bg-green-500">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div>
                      <Label className="mb-1 block">Mode</Label>
                      <div className="flex gap-2">
                        <Button
                          variant={isManual ? 'outline' : 'default'}
                          size="sm"
                          onClick={() => handleRateModeChange(currency, 'live')}
                          disabled={currency.currency_code === 'TRY' || saving}
                        >
                          Live
                        </Button>
                        <Button
                          variant={isManual ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleRateModeChange(currency, 'manual')}
                          disabled={saving}
                        >
                          Manual
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`rate-${currency.id}`}>
                        Manual Rate (1 {currency.currency_code} = ? TRY)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={`rate-${currency.id}`}
                          type="number"
                          step="0.0001"
                          min="0"
                          value={manualValue || ''}
                          onChange={(e) => handleManualRateChange(currency.currency_code, e.target.value)}
                          disabled={!isManual || saving}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => updateCurrency(currency)}
                          disabled={saving}
                          size="icon"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Effective rate: {currency.exchange_rate?.toFixed(4)} TRY
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Live rate: {liveValue?.toFixed(4)} TRY | {formatDateTime(currency.live_rate_at)}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={`active-${currency.id}`}>Active</Label>
                        <p className="text-xs text-muted-foreground">Visible to customers</p>
                      </div>
                      <Switch
                        id={`active-${currency.id}`}
                        checked={currency.is_active}
                        onCheckedChange={() => handleActiveToggle(currency)}
                        disabled={currency.currency_code === 'TRY' || saving}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={`default-${currency.id}`}>Default</Label>
                        <p className="text-xs text-muted-foreground">Initial for new users</p>
                      </div>
                      <Switch
                        id={`default-${currency.id}`}
                        checked={currency.is_default}
                        onCheckedChange={() => handleDefaultToggle(currency)}
                        disabled={currency.is_default || saving}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor={`admin-display-${currency.id}`} className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-amber-500" />
                          Admin Panel
                        </Label>
                        <p className="text-xs text-muted-foreground">Dashboard currency</p>
                      </div>
                      <Switch
                        id={`admin-display-${currency.id}`}
                        checked={currency.is_admin_display}
                        onCheckedChange={() => handleAdminDisplayToggle(currency)}
                        disabled={currency.is_admin_display || saving}
                      />
                    </div>

                    <div className="pt-2 text-xs text-muted-foreground space-y-1">
                      <p>Decimal: {currency.decimal_places}</p>
                      <p>Symbol position: {currency.symbol_position === 'before' ? 'Before' : 'After'}</p>
                      <p>Fetch status: {currency.last_fetch_status || '-'}</p>
                      {currency.last_fetch_error && <p className="text-red-500">Error: {currency.last_fetch_error}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Example:</p>
                  <div className="flex gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">100 TRY = </span>
                      <span className="font-bold">
                        {currency.symbol_position === 'before' && currency.currency_symbol}
                        {(100 / currency.exchange_rate).toFixed(currency.decimal_places)}
                        {currency.symbol_position === 'after' && currency.currency_symbol}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">100 {currency.currency_code} = </span>
                      <span className="font-bold">
                        {(100 * currency.exchange_rate).toFixed(2)} TRY
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Save Manual Rates
          </CardTitle>
          <CardDescription>Saves the manual values above in bulk.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={bulkUpdateRates}
            disabled={bulkSaving}
            size="lg"
            className="w-full md:w-auto"
          >
            {bulkSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Save and Recalculate Prices
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            All prices will be recalculated using the current manual-mode values.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CurrencySettingsPage() {
  return (
    <AdminLayout>
      <CurrencySettingsContent />
    </AdminLayout>
  );
}
