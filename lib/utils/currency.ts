/**
 * Currency Utilities
 * Handles all currency-related formatting and conversions
 */

export interface Currency {
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  exchange_rate: number;
  is_default: boolean;
  decimal_places?: number;
  symbol_position?: 'before' | 'after';
}

export interface CurrencyFormatOptions {
  decimals?: number;
  symbolPosition?: 'before' | 'after';
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

/**
 * Format a number as currency with the given currency code and options
 */
export function formatCurrency(
  amount: number,
  currency: Currency,
  options?: CurrencyFormatOptions
): string {
  const decimals = options?.decimals ?? currency.decimal_places ?? 2;
  const symbolPosition = options?.symbolPosition ?? currency.symbol_position ?? 'before';
  const thousandsSeparator = options?.thousandsSeparator ?? ',';
  const decimalSeparator = options?.decimalSeparator ?? '.';

  // Format the number
  const parts = amount.toFixed(decimals).split('.');
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
  const formatted = decimals > 0 ? `${integerPart}${decimalSeparator}${parts[1]}` : integerPart;

  // Add currency symbol
  if (symbolPosition === 'before') {
    return `${currency.currency_symbol}${formatted}`;
  } else {
    return `${formatted}${currency.currency_symbol}`;
  }
}

/**
 * Convert price from TRY to target currency
 */
export function convertPrice(priceTRY: number, targetCurrency: Currency): number {
  if (targetCurrency.currency_code === 'TRY') {
    return priceTRY;
  }
  return priceTRY / targetCurrency.exchange_rate;
}

/**
 * Convert price from any currency to TRY
 */
export function convertToTRY(price: number, fromCurrency: Currency): number {
  if (fromCurrency.currency_code === 'TRY') {
    return price;
  }
  return price * fromCurrency.exchange_rate;
}

/**
 * Get price in specific currency from a multi-currency pricing object
 */
export function getPriceInCurrency(
  pricing: any,
  currencyCode: string
): number {
  const fieldMap: Record<string, string> = {
    TRY: 'price',
    USD: 'price_usd',
    EUR: 'price_eur',
    GBP: 'price_gbp',
    JPY: 'price_jpy',
  };

  const field = fieldMap[currencyCode] || 'price';
  return pricing[field] || pricing.price || 0;
}

/**
 * Format price with currency from pricing object
 */
export function formatPriceWithCurrency(
  pricing: any,
  currency: Currency,
  options?: CurrencyFormatOptions
): string {
  const price = getPriceInCurrency(pricing, currency.currency_code);
  return formatCurrency(price, currency, options);
}

/**
 * Get default currency from localStorage or use TRY
 */
export function getStoredCurrency(): string {
  if (typeof window === 'undefined') return 'TRY';
  return localStorage.getItem('selectedCurrency') || 'TRY';
}

/**
 * Store selected currency in localStorage
 */
export function setStoredCurrency(currencyCode: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('selectedCurrency', currencyCode);
}

/**
 * Parse currency amount from formatted string
 */
export function parseCurrencyAmount(formatted: string): number {
  // Remove all non-numeric characters except decimal separator
  const cleaned = formatted.replace(/[^0-9.,]/g, '');
  // Replace comma with dot for parsing
  const normalized = cleaned.replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Compare prices in different currencies (converts to TRY for comparison)
 */
export function comparePrices(
  price1: number,
  currency1: Currency,
  price2: number,
  currency2: Currency
): number {
  const price1InTRY = convertToTRY(price1, currency1);
  const price2InTRY = convertToTRY(price2, currency2);
  return price1InTRY - price2InTRY;
}

/**
 * Calculate discount in selected currency
 */
export function calculateDiscount(
  originalPrice: number,
  discountPercentage: number,
  currency: Currency
): { discountAmount: number; finalPrice: number; formatted: string } {
  const discountAmount = (originalPrice * discountPercentage) / 100;
  const finalPrice = originalPrice - discountAmount;

  return {
    discountAmount,
    finalPrice,
    formatted: formatCurrency(finalPrice, currency),
  };
}

/**
 * Get currency flag emoji (for display purposes)
 */
export function getCurrencyFlag(currencyCode: string): string {
  const flags: Record<string, string> = {
    TRY: '🇹🇷',
    USD: '🇺🇸',
    EUR: '🇪🇺',
    GBP: '🇬🇧',
    JPY: '🇯🇵',
  };
  return flags[currencyCode] || '🌍';
}

/**
 * Get currency name in Turkish
 */
export function getCurrencyNameTR(currencyCode: string): string {
  const names: Record<string, string> = {
    TRY: 'Türk Lirası',
    USD: 'Amerikan Doları',
    EUR: 'Euro',
    GBP: 'İngiliz Sterlini',
    JPY: 'Japon Yeni',
  };
  return names[currencyCode] || currencyCode;
}

/**
 * Validate currency code
 */
export function isValidCurrency(currencyCode: string): boolean {
  const validCurrencies = ['TRY', 'USD', 'EUR', 'GBP', 'JPY'];
  return validCurrencies.includes(currencyCode);
}

/**
 * Round to currency decimal places
 */
export function roundToCurrency(amount: number, currency: Currency): number {
  const decimals = currency.decimal_places ?? 2;
  const multiplier = Math.pow(10, decimals);
  return Math.round(amount * multiplier) / multiplier;
}
