import { useState, useCallback } from 'react';

interface UseCurrencyFormatterProps {
  initialValue?: string;
  currency?: string;
}

export function useCurrencyFormatter({
  initialValue = 'R$ 0,00',
  currency = 'BRL'
}: UseCurrencyFormatterProps = {}) {
  const [displayValue, setDisplayValue] = useState(initialValue);

  // Format cents to currency display
  const formatCentsToCurrency = useCallback((cents: number): string => {
    const amountInReais = cents / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(amountInReais);
  }, [currency]);

  // Convert currency display to cents
  const formatCurrencyToCents = useCallback((value: string): number => {
    if (!value) return 0;

    try {
      const cleaned = value
        .replace(/[^\d,.-]/g, '') // remove QUALQUER símbolo
        .replace(/\./g, '')
        .replace(',', '.');

      const parsed = parseFloat(cleaned);

      if (isNaN(parsed) || !isFinite(parsed)) {
        return 0;
      }

      return Math.round(parsed * 100);
    } catch (error) {
      console.error('Erro ao converter valor para centavos:', error);
      return 0;
    }
  }, []);

  // Handle currency input change
  const handleCurrencyChange = useCallback((value: string) => {
    const numericValue = value.replace(/\D/g, "");
    
    if (!numericValue) {
      setDisplayValue('R$ 0,00');
      return;
    }

    const cents = parseInt(numericValue);
    const amountInReais = cents / 100;
    
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(amountInReais);

    setDisplayValue(formattedValue);
  }, [currency]);

  return {
    displayValue,
    setDisplayValue,
    formatCentsToCurrency,
    formatCurrencyToCents,
    handleCurrencyChange
  };
};

export type FormatCurrencyOptions = {
  locale?: string
  currency?: string
  fromCents?: boolean
  minimumFractionDigits?: number
};

export const formatCurrency = (
  amount: number,
  options?: string | FormatCurrencyOptions
): string => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return ''
  }

  let config: FormatCurrencyOptions = {
    locale: 'pt-BR',
    currency: 'BRL',
    fromCents: true,
  }

  if (typeof options === 'string') {
    config.currency = options
  } else if (typeof options === 'object') {
    config = { ...config, ...options }
  }

  const value = config.fromCents ? amount / 100 : amount

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.minimumFractionDigits,
  }).format(value)
};