'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { Currency, getStoredCurrency, setStoredCurrency, getCurrencyFlag } from '@/lib/utils/currency';
import { useToast } from '@/hooks/use-toast';

interface CurrencySelectorProps {
  onCurrencyChange?: (currency: Currency) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function CurrencySelector({
  onCurrencyChange,
  className,
  variant = 'outline',
  size = 'default',
}: CurrencySelectorProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/currency');
      const data = await response.json();

      if (response.ok && data.currencies) {
        setCurrencies(data.currencies);

        // Set initial currency from localStorage or default
        const storedCode = getStoredCurrency();
        const initialCurrency =
          data.currencies.find((c: Currency) => c.currency_code === storedCode) ||
          data.currencies.find((c: Currency) => c.is_default) ||
          data.currencies[0];

        setSelectedCurrency(initialCurrency);
        onCurrencyChange?.(initialCurrency);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast({
        title: 'Hata',
        description: 'Error loading currencies.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCurrencySelect = (currency: Currency) => {
    setSelectedCurrency(currency);
    setStoredCurrency(currency.currency_code);
    onCurrencyChange?.(currency);

    // Trigger page reload to update all prices
    window.location.reload();
  };

  if (loading || !selectedCurrency) {
    return (
      <Button variant={variant} size={size} className={className} disabled>
        <Globe className="w-4 h-4 mr-2" />
        Loading...
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <span className="mr-2">{getCurrencyFlag(selectedCurrency.currency_code)}</span>
          <span className="font-medium">{selectedCurrency.currency_code}</span>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Select Currency</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {currencies.map((currency) => (
          <DropdownMenuItem
            key={currency.currency_code}
            onClick={() => handleCurrencySelect(currency)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCurrencyFlag(currency.currency_code)}</span>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {currency.currency_symbol} {currency.currency_code}
                  </span>
                  <span className="text-xs text-muted-foreground">{currency.currency_name}</span>
                </div>
              </div>
              {selectedCurrency.currency_code === currency.currency_code && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
