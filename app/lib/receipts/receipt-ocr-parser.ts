export interface ReceiptOcrDate {
  year: number;
  month: number;
  day: number;
}

export interface ReceiptOcrSuggestions {
  amountCents?: number;
  date?: ReceiptOcrDate;
  description?: string;
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

const MONEY_PATTERN = /(?:R\$\s*)?-?\d+(?:\.\d{3})*,\d{2}|(?:R\$\s*)?-?\d+\.\d{2}/gi;
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

function extractDate(lines: string[]): ReceiptOcrDate | undefined {
  for (const line of lines) {
    ISO_DATE_PATTERN.lastIndex = 0;
    const isoMatch = ISO_DATE_PATTERN.exec(line);
    if (isoMatch) {
      const year = Number(isoMatch[1]);
      const month = Number(isoMatch[2]);
      const day = Number(isoMatch[3]);
      if (isValidDate(year, month, day)) return { year, month, day };
    }

    DATE_PATTERN.lastIndex = 0;
    const match = DATE_PATTERN.exec(line);
    if (!match) continue;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = normalizeYear(Number(match[3]));
    if (isValidDate(year, month, day)) return { year, month, day };
  }

  return undefined;
}

function extractAmount(lines: string[]) {
  const candidates: Array<{ amountCents: number; score: number }> = [];

  lines.forEach((line, lineIndex) => {
    MONEY_PATTERN.lastIndex = 0;
    const matches = [...line.matchAll(MONEY_PATTERN)];
    if (matches.length === 0) return;

    let score = lineIndex / Math.max(lines.length, 1);
    TOTAL_HINTS.forEach((hint, index) => {
      if (hint.test(line)) score += 120 - index * 12;
    });
    AMOUNT_PENALTIES.forEach((penalty) => {
      if (penalty.test(line)) score -= 80;
    });

    matches.forEach((match, matchIndex) => {
      const amountCents = parseMoneyToken(match[0]);
      if (!amountCents) return;

      candidates.push({
        amountCents,
        score: score + matchIndex / 100,
      });
    });
  });

  if (candidates.length === 0) return undefined;

  const hinted = candidates.filter((candidate) => candidate.score >= 20);
  if (hinted.length > 0) {
    return hinted.sort((a, b) => b.score - a.score || b.amountCents - a.amountCents)[0]
      .amountCents;
  }

  return Math.max(...candidates.map((candidate) => candidate.amountCents));
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

function extractDescription(lines: string[]) {
  const headerLines = lines.slice(0, 10);
  const merchant = headerLines.find(looksLikeMerchantLine);
  if (!merchant) return undefined;

  return normalizeSpaces(merchant).slice(0, 255);
}

export function parseReceiptOcrText(text: string): ReceiptOcrSuggestions {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeSpaces)
    .filter(Boolean);

  if (lines.length === 0) return {};

  return {
    amountCents: extractAmount(lines),
    date: extractDate(lines),
    description: extractDescription(lines),
  };
}
