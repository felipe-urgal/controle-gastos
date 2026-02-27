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
