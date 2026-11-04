import {
  addDaysToLogicalDate,
  getLastDayOfMonth,
  isValidLogicalDate,
  type LogicalDate,
} from "@/app/lib/date/logical-date";
import {
  TRANSACTION_DESCRIPTION_MAX_LENGTH,
  TRANSACTION_MAX_AMOUNT_CENTS,
} from "@/app/lib/transactions/transaction-field-contract";

/**
 * Interpretação de uma frase de lançamento rápido ("mercado 45,90", "uber 18 ontem",
 * "salário 5000 dia 5 na conta Itaú"). Função pura, sem IA e sem banco: só devolve o que
 * entendeu. Quem usa mostra uma prévia e pede confirmação; nada é gravado aqui, e a
 * ambiguidade (dois valores possíveis, data impossível) vira erro, nunca um palpite.
 */

export type QuickEntryType = "EXPENSE" | "INCOME";

export type QuickEntryDateSource = "default" | "relative" | "day" | "full";

export type QuickEntryResult =
  | {
      ok: true;
      /** Valor em centavos inteiros. */
      amountCents: number;
      /** O que sobrou da frase sem valor, data e conta; pode ser vazio. */
      description: string;
      type: QuickEntryType;
      /** `true` quando o tipo veio de uma palavra ("recebi", "salário") ou de "+", não do padrão. */
      typeInferred: boolean;
      date: LogicalDate;
      dateSource: QuickEntryDateSource;
      /** Texto depois de "na conta" / "no cartão" / "na carteira"; o chamador procura a conta. */
      accountHint: string | null;
    }
  | { ok: false; reason: QuickEntryError; message: string };

export type QuickEntryError =
  | "EMPTY"
  | "NO_AMOUNT"
  | "INVALID_AMOUNT"
  | "AMBIGUOUS_AMOUNT"
  | "INVALID_DATE";

const MESSAGES: Record<QuickEntryError, string> = {
  EMPTY: "Digite o lançamento, por exemplo: mercado 45,90",
  NO_AMOUNT: "Não encontrei o valor. Exemplo: mercado 45,90",
  INVALID_AMOUNT: "Não consegui entender o valor",
  AMBIGUOUS_AMOUNT: "Encontrei mais de um valor possível; use vírgula nos centavos ou R$ no valor",
  INVALID_DATE: "Essa data não existe",
};

function fail(reason: QuickEntryError): QuickEntryResult {
  return { ok: false, reason, message: MESSAGES[reason] };
}

/** Minúsculas e sem acento, uma letra para uma letra, para os índices valerem no texto original. */
function fold(text: string) {
  let folded = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const base = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    folded += base.length === 1 ? base : char.toLowerCase();
  }
  return folded;
}

type Span = { start: number; end: number };

function blank(text: string, span: Span) {
  return text.slice(0, span.start) + " ".repeat(span.end - span.start) + text.slice(span.end);
}

// --- valor -------------------------------------------------------------------------------

/**
 * Converte um número escrito à brasileira (ou com ponto decimal) em centavos, sem float.
 * `1.234,56`, `45,90`, `45.90`, `1.234`, `45`; `null` quando o formato não faz sentido.
 */
export function parseAmountToken(token: string): number | null {
  const value = token.replace(/^r\$\s*/i, "").trim();

  let whole: string;
  let fraction = "";

  const hasComma = value.includes(",");
  const hasDot = value.includes(".");

  if (hasComma && hasDot) {
    const lastComma = value.lastIndexOf(",");
    const lastDot = value.lastIndexOf(".");
    const decimalAt = Math.max(lastComma, lastDot);
    const thousands = lastComma > lastDot ? "." : ",";
    whole = value.slice(0, decimalAt);
    fraction = value.slice(decimalAt + 1);
    if (!isGroupedThousands(whole, thousands)) return null;
    whole = whole.split(thousands).join("");
  } else if (hasComma || hasDot) {
    const separator = hasComma ? "," : ".";
    const parts = value.split(separator);
    const last = parts[parts.length - 1];
    if (parts.length > 2 || last.length === 3) {
      // Vários separadores, ou exatamente 3 dígitos depois: é milhar ("1.234" = 1234).
      if (separator === "," || !isGroupedThousands(value, ".")) return null;
      whole = parts.join("");
    } else if (last.length >= 1 && last.length <= 2) {
      whole = parts[0];
      fraction = last;
    } else {
      return null;
    }
  } else {
    whole = value;
  }

  if (!/^\d+$/.test(whole) || (fraction !== "" && !/^\d{1,2}$/.test(fraction))) return null;

  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > TRANSACTION_MAX_AMOUNT_CENTS) return null;
  return cents;
}

function isGroupedThousands(value: string, separator: string) {
  const parts = value.split(separator);
  return (
    parts.length >= 2 &&
    /^\d{1,3}$/.test(parts[0]) &&
    parts.slice(1).every((part) => /^\d{3}$/.test(part))
  );
}

/**
 * Número solto na frase, capturado inteiro (com pontos e vírgulas) para que um formato ruim,
 * como "1,234", vire "valor inválido" em vez de "não achei valor". Não casa dentro de
 * palavras ("3x", "5kg", "abc123").
 */
const AMOUNT_PATTERN = /(?<![\w.,/])(r\$\s*)?(\d[\d.,]*\d|\d)(?![\w])/g;

type AmountCandidate = Span & { token: string; hasCurrency: boolean; hasDecimals: boolean };

function findAmountCandidates(folded: string): AmountCandidate[] {
  const candidates: AmountCandidate[] = [];
  for (const match of folded.matchAll(AMOUNT_PATTERN)) {
    const start = match.index ?? 0;
    candidates.push({
      start,
      end: start + match[0].length,
      token: match[0],
      hasCurrency: Boolean(match[1]),
      hasDecimals: /[.,]\d{1,2}$/.test(match[2]) && !/^\d{1,3}(?:\.\d{3})+$/.test(match[2]),
    });
  }
  return candidates;
}

/** Com mais de um número, vale o único com "R$"; senão o único com centavos; senão é ambíguo. */
function chooseAmount(candidates: AmountCandidate[]): AmountCandidate | "AMBIGUOUS" | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const withCurrency = candidates.filter((candidate) => candidate.hasCurrency);
  if (withCurrency.length === 1) return withCurrency[0];

  const withDecimals = candidates.filter((candidate) => candidate.hasDecimals);
  if (withDecimals.length === 1) return withDecimals[0];

  return "AMBIGUOUS";
}

// --- data --------------------------------------------------------------------------------

type ParsedDate = { date: LogicalDate; source: QuickEntryDateSource; span: Span };

const RELATIVE_WORDS: Array<{ pattern: RegExp; days: number }> = [
  { pattern: /(?<![a-z])anteontem(?![a-z])/, days: -2 },
  { pattern: /(?<![a-z])ontem(?![a-z])/, days: -1 },
  { pattern: /(?<![a-z])hoje(?![a-z])/, days: 0 },
  { pattern: /(?<![a-z])amanha(?![a-z])/, days: 1 },
];

const FULL_DATE_PATTERN = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{4}|\d{2}))?(?![\d/])/;
const DAY_PATTERN = /(?<![a-z])dia\s+(\d{1,2})(?![\d/])/;

function findDate(folded: string, today: LogicalDate): ParsedDate | "INVALID" | null {
  const full = FULL_DATE_PATTERN.exec(folded);
  if (full) {
    const day = Number(full[1]);
    const month = Number(full[2]);
    const yearText = full[3];
    const year = yearText === undefined ? today.year : yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    const date = { year, month, day };
    if (!isValidLogicalDate(date)) return "INVALID";
    return {
      date,
      source: yearText === undefined ? "day" : "full",
      span: { start: full.index, end: full.index + full[0].length },
    };
  }

  const dayOnly = DAY_PATTERN.exec(folded);
  if (dayOnly) {
    const day = Number(dayOnly[1]);
    // "dia 5": o dia 5 do mês atual. Dia que o mês não tem (31 em novembro) é erro, não ajuste.
    if (day < 1 || day > getLastDayOfMonth(today.year, today.month)) return "INVALID";
    return {
      date: { year: today.year, month: today.month, day },
      source: "day",
      span: { start: dayOnly.index, end: dayOnly.index + dayOnly[0].length },
    };
  }

  for (const { pattern, days } of RELATIVE_WORDS) {
    const match = pattern.exec(folded);
    if (match) {
      return {
        date: days === 0 ? today : addDaysToLogicalDate(today, days),
        source: days === 0 ? "default" : "relative",
        span: { start: match.index, end: match.index + match[0].length },
      };
    }
  }

  return null;
}

// --- tipo e conta ------------------------------------------------------------------------

const INCOME_WORDS = new Set([
  "recebi",
  "recebido",
  "recebimento",
  "receita",
  "salario",
  "rendimento",
  "rendimentos",
  "provento",
  "proventos",
  "reembolso",
  "freela",
  "freelance",
  "vendi",
  "venda",
]);

const ACCOUNT_MARKER = /(?<![a-z])(?:na|no|pela|pelo|via)\s+(?:conta|cartao|carteira)(?![a-z])\s*/;

/** Palavras de ligação que sobram nas pontas depois de tirar valor, data e conta ("almoço de"). */
const DANGLING = new Set(["de", "do", "da", "em", "no", "na", "para", "pra", "por", "as", "a", "o", "e"]);

function cleanDescription(text: string) {
  const words = text
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.\-–—]+|[\s,;:.\-–—]+$/g, "")
    .split(" ")
    .filter(Boolean);

  while (words.length > 0 && DANGLING.has(fold(words[words.length - 1]))) words.pop();
  while (words.length > 1 && DANGLING.has(fold(words[0]))) words.shift();

  return words.join(" ").replace(/[\s,;:.\-–—]+$/g, "");
}

// --- entrada -----------------------------------------------------------------------------

export function parseQuickEntry(input: string, today: LogicalDate): QuickEntryResult {
  const original = input.normalize("NFC").replace(/\s+/g, " ").trim();
  if (original === "") return fail("EMPTY");

  // "+500 freela" é receita; um "-" na frente de um valor só reforça o padrão (despesa).
  const explicitIncome = /^\+\s*(?=\d|r\$)/i.test(original);
  const source = original.replace(/^[+-]\s*(?=\d|r\$)/i, "");

  let folded = fold(source);
  let remaining = source;

  const date = findDate(folded, today);
  if (date === "INVALID") return fail("INVALID_DATE");
  if (date) {
    folded = blank(folded, date.span);
    remaining = blank(remaining, date.span);
  }

  const chosen = chooseAmount(findAmountCandidates(folded));
  if (chosen === null) return fail("NO_AMOUNT");
  if (chosen === "AMBIGUOUS") return fail("AMBIGUOUS_AMOUNT");

  const amountCents = parseAmountToken(chosen.token);
  if (amountCents === null) return fail("INVALID_AMOUNT");

  folded = blank(folded, chosen);
  remaining = blank(remaining, chosen);

  let accountHint: string | null = null;
  const marker = ACCOUNT_MARKER.exec(folded);
  if (marker) {
    const hint = remaining.slice(marker.index + marker[0].length).replace(/\s+/g, " ").trim();
    accountHint = hint === "" ? null : hint;
    remaining = remaining.slice(0, marker.index);
    folded = folded.slice(0, marker.index);
  }

  const description = cleanDescription(remaining).slice(0, TRANSACTION_DESCRIPTION_MAX_LENGTH);

  const incomeWord = fold(description)
    .split(/[^a-z]+/)
    .some((word) => INCOME_WORDS.has(word));
  const typeInferred = explicitIncome || incomeWord;

  return {
    ok: true,
    amountCents,
    description,
    type: typeInferred ? "INCOME" : "EXPENSE",
    typeInferred,
    date: date ? date.date : today,
    dateSource: date ? date.source : "default",
    accountHint,
  };
}
