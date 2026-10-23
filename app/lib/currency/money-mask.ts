const symbols: Record<string, string> = { BRL: 'R$', USD: 'US$', EUR: '€' };

export function currencySymbol(currency: string) {
  return symbols[currency] ?? currency;
}

/** Valor canônico dos campos monetários: decimal com vírgula e sem separador de milhar ("1234,56"). */
export function centsToMoneyValue(cents: number) {
  const absolute = Math.abs(cents);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${Math.floor(absolute / 100)},${String(absolute % 100).padStart(2, '0')}`;
}

/** Centavos de um valor já digitado, aceitando "850", "850,5", "850.50" e prefixos de moeda; `null` se inválido ou vazio. */
export function moneyValueToCents(value: string): number | null {
  const compact = value.trim().replace(/\s/g, '');
  const negative = compact.startsWith('-');
  const normalized = compact.replace(/^-/, '').replace(/^(?:R\$|US\$|€)/i, '');
  if (!/^\d+(?:[.,]\d{0,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.replace(',', '.').split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** Máscara por dígitos: cada dígito digitado entra pela direita dos centavos. Texto sem dígitos limpa o campo. */
export function maskMoneyInput(raw: string, allowNegative = false): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '').slice(0, 15);
  if (!digits) return '';
  const cents = Number(digits);
  return centsToMoneyValue(allowNegative && raw.includes('-') ? -cents : cents);
}

/** Texto exibido no campo: "R$ 1.234,56". Campo vazio exibe vazio para mostrar o placeholder. */
export function formatMoneyDisplay(value: string, currency = 'BRL', withSymbol = true) {
  const cents = moneyValueToCents(value);
  if (cents === null) return '';
  const number = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(cents) / 100);
  const sign = cents < 0 ? '-' : '';
  return withSymbol ? `${sign}${currencySymbol(currency)} ${number}` : `${sign}${number}`;
}
