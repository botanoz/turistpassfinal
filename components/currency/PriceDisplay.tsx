'use client';

import { useState, useEffect } from 'react';
import { Currency, formatPriceWithCurrency, getStoredCurrency } from '@/lib/utils/currency';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceDisplayProps {
  pricing: any; // Pass pricing object with price, price_usd, price_eur, etc.
  className?: string;
  showOriginal?: boolean; // Show original TRY price
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function PriceDisplay({
  pricing,
  className = '',
  showOriginal = false,
  size = 'md',
}: PriceDisplayProps) {
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurrency();
  }, []);

  const fetchCurrency = async () => {
    try {
      const storedCode = getStoredCurrency();
      const response = await fetch('/api/currency');
      const data = await response.json();

      if (response.ok && data.currencies) {
        const selectedCurrency =
          data.currencies.find((c: Currency) => c.currency_code === storedCode) ||
          data.currencies.find((c: Currency) => c.is_default) ||
          data.currencies[0];

        setCurrency(selectedCurrency);
      }
    } catch (error) {
      console.error('Error fetching currency:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !currency) {
    return <Skeleton className={`h-8 w-24 ${className}`} />;
  }

  const formattedPrice = formatPriceWithCurrency(pricing, currency);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg font-semibold',
    xl: 'text-2xl font-bold',
  };

  return (
    <div className={`${className}`}>
      <span className={`${sizeClasses[size]} text-primary`}>{formattedPrice}</span>
      {showOriginal && currency.currency_code !== 'TRY' && (
        <span className="text-xs text-muted-foreground ml-2">
          (≈{pricing.price}₺)
        </span>
      )}
    </div>
  );
}
