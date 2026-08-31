import { createHash } from "node:crypto";

export const IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024;
export const IMPORT_MAX_ITEMS = 1000;

export type ImportSource = "CSV" | "OFX";
export type ImportTransactionType = "INCOME" | "EXPENSE";

export interface ParsedImportItem {
  index: number;
  source: ImportSource;
  date: string;
  amountCents: number;
  type: ImportTransactionType;
  description: string;
  externalId?: string;
  currency?: string;
  errors: string[];
}

export interface PreviewImportItem extends ParsedImportItem {
  fingerprint: string;
  duplicate: boolean;
}

export class ImportParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportParseError";
  }
}

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function normalizeDescription(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function decodeOfxText(value: string) {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

function isValidDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseImportDate(raw: string) {
  const value = raw.trim();
  let year: number;
  let month: number;
  let day: number;

  let match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
  } else {
    match = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(value);
    if (match) {
      day = Number(match[1]);
      month = Number(match[2]);
      year = Number(match[3]);
    } else {
      match = /^(\d{4})(\d{2})(\d{2})/.exec(value);
      if (!match) return null;
      year = Number(match[1]);
      month = Number(match[2]);
      day = Number(match[3]);
    }
  }

  if (year < 2000 || year > 2100 || !isValidDate(year, month, day)) return null;
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseMoneyToCents(raw: string) {
  let value = raw
    .trim()
    .replace(/\u00a0/g, " ")
    .replace(/(?:R\$|BRL|USD|EUR)/gi, "")
    .replace(/\s+/g, "");

  if (!value) return null;

  let negative = false;
  if (value.startsWith("(") && value.endsWith(")")) {
    negative = true;
    value = value.slice(1, -1);
  }
  if (value.startsWith("-")) {
    negative = true;
    value = value.slice(1);
  } else if (value.startsWith("+")) {
    value = value.slice(1);
  }

  if (!/^[\d.,]+$/.test(value)) return null;

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");
  const lastSeparator = Math.max(lastComma, lastDot);
  let wholeDigits = value;
  let fractionDigits = "";

  if (lastSeparator >= 0) {
    const digitsAfter = value.length - lastSeparator - 1;
    const separatorCount = (value.match(/[.,]/g) ?? []).length;
    const decimalSeparator = value[lastSeparator];
    const otherSeparator = decimalSeparator === "," ? "." : ",";
    const hasOtherSeparator = value.includes(otherSeparator);
    const shouldUseDecimal = hasOtherSeparator || digitsAfter <= 2 || (digitsAfter !== 3 && separatorCount === 1);

    if (shouldUseDecimal) {
      wholeDigits = value.slice(0, lastSeparator).replace(/[.,]/g, "");
      fractionDigits = value.slice(lastSeparator + 1);
    } else {
      wholeDigits = value.replace(/[.,]/g, "");
    }
  }

  if (!/^\d+$/.test(wholeDigits || "0") || (fractionDigits && !/^\d{1,2}$/.test(fractionDigits))) {
    return null;
  }

  const whole = BigInt(wholeDigits || "0");
  const fraction = BigInt((fractionDigits + "00").slice(0, 2));
  let cents = whole * 100n + fraction;
  if (negative) cents = -cents;

  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) return null;
  return Number(cents);
}

function parseCsvRows(content: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];
    if (char === '"') {
      if (quoted && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && content[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new ImportParseError("CSV inválido: aspas não foram fechadas.");
  row.push(field);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function detectCsvDelimiter(header: string) {
  const comma = (header.match(/,/g) ?? []).length;
  const semicolon = (header.match(/;/g) ?? []).length;
  return semicolon > comma ? ";" : ",";
}

function findHeaderIndex(headers: string[], aliases: string[]) {
  return headers.findIndex((header) => aliases.includes(header));
}

export function parseCsvImport(content: string): ParsedImportItem[] {
  const clean = content.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const rows = parseCsvRows(clean, detectCsvDelimiter(firstLine));
  if (rows.length < 2) throw new ImportParseError("CSV sem linhas de transação.");

  const headers = rows[0].map(normalizeHeader);
  const dateIndex = findHeaderIndex(headers, ["data", "date", "dtposted"]);
  const descriptionIndex = findHeaderIndex(headers, ["descricao", "description", "memo", "historico", "name"]);
  const amountIndex = findHeaderIndex(headers, ["valor", "amount", "trnamt"]);
  const idIndex = findHeaderIndex(headers, ["id", "fitid", "externalid", "transactionid"]);

  if (dateIndex < 0 || descriptionIndex < 0 || amountIndex < 0) {
    throw new ImportParseError("CSV precisa conter colunas de data, descrição e valor.");
  }

  const items = rows.slice(1).map((row, position) => {
    const errors: string[] = [];
    const date = parseImportDate(row[dateIndex] ?? "");
    const signedAmount = parseMoneyToCents(row[amountIndex] ?? "");
    const description = normalizeDescription(row[descriptionIndex] ?? "");

    if (!date) errors.push("Data inválida.");
    if (signedAmount === null || signedAmount === 0) errors.push("Valor inválido ou igual a zero.");
    if (description.length < 2) errors.push("Descrição deve ter pelo menos 2 caracteres.");
    if (description.length > 100) errors.push("Descrição deve ter no máximo 100 caracteres.");

    const safeAmount = signedAmount ?? 0;
    return {
      index: position,
      source: "CSV" as const,
      date: date ?? "",
      amountCents: Math.abs(safeAmount),
      type: safeAmount >= 0 ? ("INCOME" as const) : ("EXPENSE" as const),
      description,
      externalId: idIndex >= 0 ? normalizeDescription(row[idIndex] ?? "") || undefined : undefined,
      errors,
    };
  });

  if (items.length > IMPORT_MAX_ITEMS) {
    throw new ImportParseError(`Arquivo excede o limite de ${IMPORT_MAX_ITEMS} transações.`);
  }
  return items;
}

function extractOfxTag(block: string, tag: string) {
  const match = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i").exec(block);
  return match ? decodeOfxText(match[1]) : "";
}

export function parseOfxImport(content: string, accountCurrency: string): ParsedImportItem[] {
  const currency = extractOfxTag(content, "CURDEF").toUpperCase();
  if (currency && currency !== accountCurrency.toUpperCase()) {
    throw new ImportParseError(`Moeda do OFX (${currency}) difere da moeda da conta (${accountCurrency.toUpperCase()}).`);
  }

  const blocks = [...content.matchAll(/<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|(?=<\/BANKTRANLIST>)|$)/gi)];
  if (blocks.length === 0) throw new ImportParseError("OFX sem transações reconhecíveis.");
  if (blocks.length > IMPORT_MAX_ITEMS) {
    throw new ImportParseError(`Arquivo excede o limite de ${IMPORT_MAX_ITEMS} transações.`);
  }

  return blocks.map((match, position) => {
    const block = match[1];
    const errors: string[] = [];
    const date = parseImportDate(extractOfxTag(block, "DTPOSTED"));
    const signedAmount = parseMoneyToCents(extractOfxTag(block, "TRNAMT"));
    const name = extractOfxTag(block, "NAME");
    const memo = extractOfxTag(block, "MEMO");
    const description = normalizeDescription([name, memo].filter(Boolean).join(" — ") || "Transação OFX");
    const externalId = normalizeDescription(extractOfxTag(block, "FITID")) || undefined;

    if (!date) errors.push("Data inválida.");
    if (signedAmount === null || signedAmount === 0) errors.push("Valor inválido ou igual a zero.");
    if (description.length > 100) errors.push("Descrição deve ter no máximo 100 caracteres.");

    const safeAmount = signedAmount ?? 0;
    return {
      index: position,
      source: "OFX" as const,
      date: date ?? "",
      amountCents: Math.abs(safeAmount),
      type: safeAmount >= 0 ? ("INCOME" as const) : ("EXPENSE" as const),
      description: description.slice(0, 100),
      externalId,
      currency: currency || accountCurrency.toUpperCase(),
      errors,
    };
  });
}

export function parseImportContent(params: {
  fileName: string;
  content: string;
  accountCurrency: string;
}) {
  const extension = params.fileName.toLowerCase().split(".").pop();
  if (extension === "csv") return parseCsvImport(params.content);
  if (extension === "ofx") return parseOfxImport(params.content, params.accountCurrency);
  throw new ImportParseError("Formato não suportado. Envie um arquivo .csv ou .ofx.");
}

export function createImportFingerprint(params: {
  userId: string;
  accountId: string;
  item: ParsedImportItem;
  occurrence: number;
}) {
  const { item } = params;
  const identity = item.externalId
    ? `external:${item.externalId.trim().toLowerCase()}`
    : `content:${item.date}|${item.type}|${item.amountCents}|${item.description.toLowerCase()}|${params.occurrence}`;

  return createHash("sha256")
    .update(`${params.userId}|${params.accountId}|${item.source}|${identity}`)
    .digest("hex");
}

export function withImportFingerprints(params: {
  userId: string;
  accountId: string;
  items: ParsedImportItem[];
}) {
  const occurrences = new Map<string, number>();
  const seenExternal = new Set<string>();

  return params.items.map((item) => {
    const contentKey = `${item.date}|${item.type}|${item.amountCents}|${item.description.toLowerCase()}`;
    const occurrence = (occurrences.get(contentKey) ?? 0) + 1;
    occurrences.set(contentKey, occurrence);

    const fingerprint = createImportFingerprint({
      userId: params.userId,
      accountId: params.accountId,
      item,
      occurrence,
    });
    const errors = [...item.errors];
    if (item.externalId) {
      const externalKey = `${item.source}:${item.externalId.trim().toLowerCase()}`;
      if (seenExternal.has(externalKey)) errors.push("Identificador externo repetido no mesmo arquivo.");
      seenExternal.add(externalKey);
    }

    return { ...item, errors, fingerprint, duplicate: false } satisfies PreviewImportItem;
  });
}
