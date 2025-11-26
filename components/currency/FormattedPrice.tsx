'use client';

import { useCurrency } from '@/hooks/useCurrency';
import { formatCurrency, convertPrice } from '@/lib/utils/currency';

interface FormattedPriceProps {
  price: number; // TRY cinsinden fiyat
  className?: string;
}

export function FormattedPrice({ price, className = '' }: FormattedPriceProps) {
  const { currency, loading } = useCurrency();

  if (loading || !currency) {
    // Loading state - show TRY default
    return <span className={className}>{price}₺</span>;
  }

  // Convert price to selected currency
  const convertedPrice = convertPrice(price, currency);
  const formatted = formatCurrency(convertedPrice, currency);

  return <span className={className}>{formatted}</span>;
}
