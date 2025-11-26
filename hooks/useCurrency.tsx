'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Currency, getStoredCurrency, setStoredCurrency } from '@/lib/utils/currency';

interface CurrencyContextType {
  currency: Currency | null;
  currencies: Currency[];
  loading: boolean;
  changeCurrency: (currencyCode: string) => void;
  refreshCurrencies: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Set initial currency
        const storedCode = getStoredCurrency();
        const selectedCurrency =
          data.currencies.find((c: Currency) => c.currency_code === storedCode) ||
          data.currencies.find((c: Currency) => c.is_default) ||
          data.currencies[0];

        setCurrency(selectedCurrency);
      }
    } catch (error) {
      console.error('Error fetching currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const changeCurrency = (currencyCode: string) => {
    const newCurrency = currencies.find((c) => c.currency_code === currencyCode);
    if (newCurrency) {
      setCurrency(newCurrency);
      setStoredCurrency(currencyCode);
    }
  };

  const refreshCurrencies = async () => {
    await fetchCurrencies();
  };

  return (
    <CurrencyContext.Provider
      value={{ currency, currencies, loading, changeCurrency, refreshCurrencies }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
