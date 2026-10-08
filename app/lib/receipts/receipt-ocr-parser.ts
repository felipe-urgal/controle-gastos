export interface ReceiptOcrDate {
  year: number;
  month: number;
  day: number;
}

export type ReceiptOcrConfidence = 'high' | 'medium' | 'low';

export interface ReceiptOcrSuggestion<T> {
  value: T;
  confidence: ReceiptOcrConfidence;
  /** Original, normalized line of OCR text used as evidence. */
  evidence: string;
}

export interface ReceiptOcrSuggestions {
  amount?: ReceiptOcrSuggestion<number>;
  date?: ReceiptOcrSuggestion<ReceiptOcrDate>;
  description?: ReceiptOcrSuggestion<string>;
}

/** Only sufficiently supported values may be applied after explicit user confirmation. */
export function getApplicableReceiptOcrSuggestions(suggestions: ReceiptOcrSuggestions) {
  return {
    amountCents: suggestions.amount?.confidence !== 'low' ? suggestions.amount?.value : undefined,
    date: suggestions.date?.confidence !== 'low' ? suggestions.date?.value : undefined,
    description: suggestions.description?.confidence !== 'low' ? suggestions.description?.value : undefined,
  };
}

// Only purchase totals count. Payment methods, cash received, change and
// adjustments must never become the transaction amount.
const STRONG_TOTAL = /\b(?:total\s+a\s+pagar|valor\s+total|total\s+geral)\b/i;
const PLAIN_TOTAL = /\btotal\b/i;
const NON_PURCHASE = /\b(?:sub\s*total|desconto|troco|taxa|acr[eé]scimo|juros|entregue|recebido|dinheiro|cart[aã]o|cr[eé]dito|d[eé]bito|pix|pagamento|valor\s+pago|pago|parcela(?:s|mento)?|parcelado|limite|saldo|produto)\b/i;

const MONEY_PATTERN = /(?:R\$\s*)?-?\d+(?:\.\d{3})*,\d{2}/gi;
const DATE_PATTERN = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})\b/g;
const ISO_DATE_PATTERN = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g;

function normalizeSpaces(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseMoneyToken(token: string) {
  const normalized = token.replace(/R\$/gi, "").replace(/\s/g, "");
  const usesCommaDecimal = normalized.includes(",");
  const numeric = usesCommaDecimal
    ? normalized.replace(/\./g, "").replace(",", ".")
    : normalized;

  const value = Number(numeric);
  if (!Number.isFinite(value) || value <= 0) return null;

  const cents = Math.round(value * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function isValidDate(year: number, month: number, day: number) {
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

function normalizeYear(year: number) {
  return year < 100 ? 2000 + year : year;
}

function extractDate(lines: string[]): ReceiptOcrSuggestions['date'] {
  const candidates: Array<{ value: ReceiptOcrDate; evidence: string; contextual: boolean }> = [];
  for (const line of lines) {
    const contextual = /\b(data|emiss[aã]o|compra)\b/i.test(line);
    for (const match of line.matchAll(ISO_DATE_PATTERN)) {
      const [year, month, day] = match.slice(1).map(Number);
      if (isValidDate(year, month, day)) candidates.push({ value: { year, month, day }, evidence: line, contextual });
    }
    for (const match of line.matchAll(DATE_PATTERN)) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = normalizeYear(Number(match[3]));
      if (isValidDate(year, month, day)) candidates.push({ value: { year, month, day }, evidence: line, contextual });
    }
  }
  if (!candidates.length) return undefined;
  const selected = candidates.find((candidate) => candidate.contextual) ?? candidates[0];
  const differentDates = candidates.some((candidate) =>
    candidate.value.year !== selected.value.year ||
    candidate.value.month !== selected.value.month ||
    candidate.value.day !== selected.value.day,
  );
  return {
    value: selected.value,
    confidence: differentDates ? 'low' : selected.contextual ? 'high' : 'medium',
    evidence: selected.evidence,
  };
}

function extractAmount(lines: string[]): ReceiptOcrSuggestions['amount'] {
  const candidates: Array<{
    value: number;
    evidence: string;
    confidence: 'high' | 'medium';
    lineIndex: number;
  }> = [];

  lines.forEach((line, lineIndex) => {
    // Ignore ambiguous mixed payment/total lines and all non-purchase amounts.
    if (NON_PURCHASE.test(line)) return;
    const confidence = STRONG_TOTAL.test(line)
      ? 'high'
      : PLAIN_TOTAL.test(line) ? 'medium' : undefined;
    if (!confidence) return;

    const matches = [...line.matchAll(MONEY_PATTERN)];
    // Multiple different monetary values on a total line are ambiguous.
    const values = [...new Set(matches.map((match) => parseMoneyToken(match[0])).filter(
      (value): value is number => value !== null,
    ))];
    if (values.length !== 1) return;
    candidates.push({ value: values[0], confidence, evidence: line, lineIndex });
  });

  if (!candidates.length) return undefined;
  const ranked = candidates.sort((a, b) =>
    (a.confidence === b.confidence ? b.lineIndex - a.lineIndex : a.confidence === 'high' ? -1 : 1),
  );
  const selected = ranked[0];
  // Distinct competing total labels are unsafe even if one has a stronger label.
  const conflicting = candidates.some((candidate) => candidate.value !== selected.value);
  return {
    value: selected.value,
    confidence: conflicting ? 'low' : selected.confidence,
    evidence: selected.evidence,
  };
}

function looksLikeMerchantLine(line: string) {
  if (line.length < 3 || line.length > 100) return false;
  if (!/[A-Za-zÀ-ÿ]/.test(line)) return false;
  if (/^(cnpj|cpf|coo|cupom|extrato|documento|nfc-?e|sat|data|hora|telefone|tel\.?|cep)\b/i.test(line)) {
    return false;
  }
  if (/^(rua|r\.|avenida|av\.|rodovia|estrada|praça|praca)\b/i.test(line)) return false;
  if (/\b(www\.|https?:\/\/|consumidor|chave\s+de\s+acesso)\b/i.test(line)) return false;
  if (/^\d[\d\s.,:/-]*$/.test(line)) return false;

  MONEY_PATTERN.lastIndex = 0;
  if (MONEY_PATTERN.test(line)) return false;

  return true;
}

function extractDescription(lines: string[]): ReceiptOcrSuggestions['description'] {
  const index = lines.slice(0, 10).findIndex(looksLikeMerchantLine);
  if (index === -1) return undefined;
  const evidence = lines[index];
  return {
    value: normalizeSpaces(evidence).slice(0, 255),
    confidence: index < 3 ? 'medium' : 'low',
    evidence,
  };
}

export function parseReceiptOcrText(text: string): ReceiptOcrSuggestions {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeSpaces)
    .filter(Boolean);

  if (lines.length === 0) return {};

  return {
    amount: extractAmount(lines),
    date: extractDate(lines),
    description: extractDescription(lines),
  };
}
