'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Save, RefreshCw, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Currency {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  exchange_rate: number;
  decimal_places: number;
  symbol_position: string;
  is_active: boolean;
  is_default: boolean;
  last_updated: string;
}

function CurrencySettingsContent() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingRates, setUpdatingRates] = useState(false);
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
      } else {
        throw new Error(data.error || 'Failed to fetch currencies');
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast({
        title: 'Hata',
        description: 'Error loading exchange rates.',
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
          exchange_rate: currency.exchange_rate,
          is_active: currency.is_active,
          is_default: currency.is_default,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Exchange rate updated.',
        });
        await fetchCurrencies();
      } else {
        throw new Error(data.error || 'Failed to update currency');
      }
    } catch (error) {
      console.error('Error updating currency:', error);
      toast({
        title: 'Hata',
        description: 'Error updating exchange rate.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const bulkUpdateRates = async () => {
    try {
      setUpdatingRates(true);
      const rates: Record<string, number> = {};

      currencies.forEach((currency) => {
        if (currency.currency_code !== 'TRY') {
          rates[currency.currency_code] = currency.exchange_rate;
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
          title: 'Success',
          description: 'All exchange rates updated and prices recalculated.',
        });
        await fetchCurrencies();
      } else {
        throw new Error(data.error || 'Failed to update rates');
      }
    } catch (error) {
      console.error('Error updating rates:', error);
      toast({
        title: 'Hata',
        description: 'Error updating exchange rates.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingRates(false);
    }
  };

  const handleExchangeRateChange = (currencyCode: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setCurrencies((prev) =>
        prev.map((c) =>
          c.currency_code === currencyCode ? { ...c, exchange_rate: numValue } : c
        )
      );
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Currency Settings</h1>
        <p className="text-muted-foreground">
          Manage exchange rates for all currencies in the system. Rates are calculated based on TRY.
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> When you change exchange rates, all prices in the system will be automatically
          recalculated. This process may take a few seconds.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        {currencies.map((currency) => (
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
                      Last updated: {new Date(currency.last_updated).toLocaleString('tr-TR')}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currency.is_default && (
                    <Badge variant="default">Default</Badge>
                  )}
                  {currency.is_active ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Inactive</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`rate-${currency.id}`}>
                    Exchange Rate (1 {currency.currency_code} = ? TRY)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id={`rate-${currency.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={currency.exchange_rate}
                      onChange={(e) =>
                        handleExchangeRateChange(currency.currency_code, e.target.value)
                      }
                      disabled={currency.currency_code === 'TRY' || saving}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => updateCurrency(currency)}
                      disabled={saving || currency.currency_code === 'TRY'}
                      size="icon"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {currency.currency_code === 'TRY' && (
                    <p className="text-sm text-muted-foreground">
                      TRY is the base currency and cannot be changed.
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`active-${currency.id}`}>Aktif</Label>
                    <Switch
                      id={`active-${currency.id}`}
                      checked={currency.is_active}
                      onCheckedChange={() => handleActiveToggle(currency)}
                      disabled={currency.currency_code === 'TRY' || saving}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor={`default-${currency.id}`}>Default Para Birimi</Label>
                    <Switch
                      id={`default-${currency.id}`}
                      checked={currency.is_default}
                      onCheckedChange={() => handleDefaultToggle(currency)}
                      disabled={currency.is_default || saving}
                    />
                  </div>

                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground">
                      Decimal places: {currency.decimal_places}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Symbol position: {currency.symbol_position === 'before' ? 'Before' : 'After'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Preview:</p>
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
                    <span className="font-bold">{(100 * currency.exchange_rate).toFixed(2)}₺</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Bulk Operations
          </CardTitle>
          <CardDescription>
            Update all exchange rates at once and recalculate prices.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={bulkUpdateRates}
            disabled={updatingRates}
            size="lg"
            className="w-full md:w-auto"
          >
            {updatingRates ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Update All Rates and Recalculate Prices
              </>
            )}
          </Button>
          <p className="text-sm text-muted-foreground mt-2">
            This will recalculate all pass prices in the system.
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
