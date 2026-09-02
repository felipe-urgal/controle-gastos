export function parseMoneyInputToCents(value: string) {
  const normalized = value
    .trim()
    .replace(/\s/g, '')
    .replace(/^(?:R\$|US\$|€)/i, '');

  if (!/^\d+(?:[.,]\d{0,2})?$/.test(normalized)) return null;

  const [wholePart, fractionPart = ''] = normalized.replace(',', '.').split('.');
  const whole = Number(wholePart);
  const cents = Number(fractionPart.padEnd(2, '0'));
  const total = whole * 100 + cents;

  if (!Number.isSafeInteger(total) || total <= 0) return null;
  return total;
}
