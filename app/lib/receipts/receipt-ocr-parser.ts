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

const TOTAL_HINTS = [
  /\btotal\s+a\s+pagar\b/i,
  /\bvalor\s+total\b/i,
  /\btotal\s+geral\b/i,
  /\btotal\b/i,
  /\bvalor\s+pago\b/i,
  /\bpagamento\b/i,
];

const AMOUNT_PENALTIES = [
  /\bsubtotal\b/i,
  /\bdesconto\b/i,
  /\btroco\b/i,
  /\btaxa\b/i,
  /\bacr[eé]scimo\b/i,
];

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
  const candidates: Array<{ value: number; score: number; evidence: string; strength: 'high' | 'medium' | 'low' }> = [];
  lines.forEach((line, lineIndex) => {
    MONEY_PATTERN.lastIndex = 0;
    const matches = [...line.matchAll(MONEY_PATTERN)];
    if (matches.length === 0) return;
    let score = lineIndex / Math.max(lines.length, 1);
    let strength: 'high' | 'medium' | 'low' = 'low';
    TOTAL_HINTS.forEach((hint, index) => {
      if (hint.test(line)) {
        score += 120 - index * 12;
        strength = index <= 2 ? 'high' : index === 3 ? 'medium' : 'low';
      }
    });
    AMOUNT_PENALTIES.forEach((penalty) => {
      if (penalty.test(line)) {
        score -= 80;
        strength = 'low';
      }
    });
    matches.forEach((match, matchIndex) => {
      const value = parseMoneyToken(match[0]);
      if (!value) return;
      candidates.push({ value, score: score + matchIndex / 100, evidence: line, strength });
    });
  });
  if (!candidates.length) return undefined;
  const hinted = candidates.filter((candidate) => candidate.score >= 20 && candidate.strength !== 'low');
  const selected = hinted.length
    ? hinted.sort((a, b) => b.score - a.score || b.value - a.value)[0]
    : candidates.sort((a, b) => b.value - a.value)[0];
  const conflicting = hinted.some((candidate) => candidate !== selected && candidate.value !== selected.value && candidate.score >= selected.score - 1);
  return {
    value: selected.value,
    confidence: conflicting ? 'low' : selected.strength,
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
