import { inflateSync } from "node:zlib";

import {
  IMPORT_MAX_ITEMS,
  parseImportDate,
  parseMoneyToCents,
  type ImportTransactionType,
} from "@/app/lib/transactions/import/parser";

export const PDF_EXPERIMENT_MAX_BYTES = 2 * 1024 * 1024;
export const PDF_EXPERIMENT_MAX_PAGES = 20;

export type PdfExperimentalImportItem = {
  index: number;
  source: "PDF";
  date: string;
  amountCents: number;
  type: ImportTransactionType;
  description: string;
  errors: string[];
};

export type PdfExperimentResult = {
  pageCount: number;
  items: PdfExperimentalImportItem[];
  warnings: string[];
};

export class PdfExperimentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfExperimentError";
  }
}

function decodePdfLiteral(value: string) {
  return value
    .slice(1, -1)
    .replace(/\\([nrtbf()\\])/g, (_, escaped: string) => {
      const replacements: Record<string, string> = {
        n: "\n",
        r: "\r",
        t: "\t",
        b: "\b",
        f: "\f",
        "(": "(",
        ")": ")",
        "\\": "\\",
      };
      return replacements[escaped] ?? escaped;
    })
    .replace(/\\([0-7]{1,3})/g, (_, octal: string) =>
      String.fromCharCode(Number.parseInt(octal, 8)),
    );
}

function extractDisplayedText(content: string) {
  const literalPattern = String.raw`\((?:\\.|[^\\()])*\)`;
  const tokenPattern = new RegExp(
    String.raw`\[((?:.|\n|\r)*?)\]\s*TJ|(${literalPattern})\s*(Tj|'|")`,
    "g",
  );
  const literalRegex = new RegExp(literalPattern, "g");
  const parts: string[] = [];
  let previousEnd = 0;

  for (const match of content.matchAll(tokenPattern)) {
    const between = content.slice(previousEnd, match.index);
    if (/T\*|\bT[Dd]\b/.test(between) && parts.at(-1) !== "\n") {
      parts.push("\n");
    }

    if (match[1] !== undefined) {
      const chunks = [...match[1].matchAll(literalRegex)].map((part) =>
        decodePdfLiteral(part[0]),
      );
      if (chunks.length > 0) parts.push(chunks.join(""));
    } else if (match[2]) {
      parts.push(decodePdfLiteral(match[2]));
      if (match[3] === "'" || match[3] === '"') parts.push("\n");
    }

    previousEnd = (match.index ?? 0) + match[0].length;
  }

  return parts.join(" ");
}

function stripTrailingLineBreaks(buffer: Buffer) {
  let end = buffer.length;
  while (end > 0 && (buffer[end - 1] === 10 || buffer[end - 1] === 13)) {
    end -= 1;
  }
  return buffer.subarray(0, end);
}

export function extractPdfText(bytes: Uint8Array) {
  if (bytes.byteLength === 0) throw new PdfExperimentError("O PDF está vazio.");
  if (bytes.byteLength > PDF_EXPERIMENT_MAX_BYTES) {
    throw new PdfExperimentError("PDF excede o limite experimental de 2 MB.");
  }

  const buffer = Buffer.from(bytes);
  const raw = buffer.toString("latin1");
  if (!raw.startsWith("%PDF-")) {
    throw new PdfExperimentError("Arquivo não possui cabeçalho PDF válido.");
  }

  const pageCount = [...raw.matchAll(/\/Type\s*\/Page\b/g)].length;
  if (pageCount === 0) {
    throw new PdfExperimentError("PDF sem páginas reconhecíveis.");
  }
  if (pageCount > PDF_EXPERIMENT_MAX_PAGES) {
    throw new PdfExperimentError(
      `PDF excede o limite experimental de ${PDF_EXPERIMENT_MAX_PAGES} páginas.`,
    );
  }

  const warnings: string[] = [];
  const streamPattern = /stream\r?\n/g;
  const textParts: string[] = [];

  for (const match of raw.matchAll(streamPattern)) {
    const streamStart = (match.index ?? 0) + match[0].length;
    const streamEnd = raw.indexOf("endstream", streamStart);
    if (streamEnd < 0) {
      warnings.push("Um stream PDF truncado foi ignorado.");
      continue;
    }

    const dictionaryStart = raw.lastIndexOf("<<", match.index);
    const dictionary = raw.slice(
      dictionaryStart >= 0
        ? dictionaryStart
        : Math.max(0, (match.index ?? 0) - 768),
      match.index,
    );
    const compressed = /\/FlateDecode\b/.test(dictionary);
    const streamBytes = stripTrailingLineBreaks(buffer.subarray(streamStart, streamEnd));

    try {
      const decoded = compressed ? inflateSync(streamBytes) : streamBytes;
      const displayed = extractDisplayedText(decoded.toString("latin1"));
      if (displayed.trim()) textParts.push(displayed);
    } catch {
      warnings.push(
        compressed
          ? "Um stream FlateDecode não pôde ser descompactado."
          : "Um stream textual não pôde ser interpretado.",
      );
    }
  }

  const text = textParts.join("\n").replace(/\r/g, "\n");
  if (!text.trim()) {
    throw new PdfExperimentError(
      "PDF sem texto extraível pelo spike. Documento pode usar fonte codificada, imagem ou layout não suportado.",
    );
  }

  return { pageCount, text, warnings };
}

function normalizeDate(raw: string) {
  const shortYear = /^(\d{2})[/-](\d{2})[/-](\d{2})$/.exec(raw);
  if (shortYear) {
    return parseImportDate(
      `${shortYear[1]}/${shortYear[2]}/20${shortYear[3]}`,
    );
  }
  return parseImportDate(raw);
}

function parseAmountToken(raw: string) {
  const direction = /\s*([DC])\s*$/i.exec(raw)?.[1]?.toUpperCase();
  const clean = raw.replace(/\s*[DC]\s*$/i, "").trim();
  const parsed = parseMoneyToCents(clean);
  if (parsed === null) return null;
  if (direction === "D") return -Math.abs(parsed);
  if (direction === "C") return Math.abs(parsed);
  return parsed;
}

function parseRecord(record: string, index: number): PdfExperimentalImportItem | null {
  const normalized = record.replace(/\s+/g, " ").trim();
  const dateMatch =
    /^(\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{2,4})\b/.exec(normalized);
  if (!dateMatch) return null;

  const date = normalizeDate(dateMatch[1]);
  const rest = normalized.slice(dateMatch[0].length).trim();
  const amountPattern =
    /(?:R\$\s*)?[+-]?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2}|\.\d{2})(?:\s*[DC])?/gi;
  const amountMatches = [...rest.matchAll(amountPattern)];
  const amountMatch = amountMatches.at(-1);
  const errors: string[] = [];

  if (!date) errors.push("Data inválida.");
  if (!amountMatch) errors.push("Valor não reconhecido.");
  if (amountMatches.length > 1) {
    errors.push("Mais de um valor monetário foi encontrado; revisar manualmente.");
  }

  const signedAmount = amountMatch ? parseAmountToken(amountMatch[0]) : null;
  if (amountMatch && (signedAmount === null || signedAmount === 0)) {
    errors.push("Valor inválido ou igual a zero.");
  }

  const description = (
    amountMatch
      ? `${rest.slice(0, amountMatch.index)} ${rest.slice(
          (amountMatch.index ?? 0) + amountMatch[0].length,
        )}`
      : rest
  )
    .replace(/\s+/g, " ")
    .trim();

  if (/^(saldo|saldo anterior|saldo final|total)\b/i.test(description)) {
    return null;
  }
  if (description.length < 2) errors.push("Descrição ausente ou muito curta.");
  if (description.length > 100) {
    errors.push("Descrição excede 100 caracteres; revisar manualmente.");
  }

  const safeAmount = signedAmount ?? 0;
  return {
    index,
    source: "PDF",
    date: date ?? "",
    amountCents: Math.abs(safeAmount),
    type: safeAmount >= 0 ? "INCOME" : "EXPENSE",
    description: description.slice(0, 100),
    errors,
  };
}

export function parsePdfImportExperiment(bytes: Uint8Array): PdfExperimentResult {
  const extracted = extractPdfText(bytes);
  const lines = extracted.text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const records: string[] = [];
  let current = "";

  for (const line of lines) {
    const startsTransaction =
      /^(?:\d{4}-\d{2}-\d{2}|\d{2}[/-]\d{2}[/-]\d{2,4})\b/.test(line);
    if (startsTransaction) {
      if (current) records.push(current);
      current = line;
    } else if (current) {
      current += ` ${line}`;
    }
  }
  if (current) records.push(current);

  const items = records
    .map((record, index) => parseRecord(record, index))
    .filter((item): item is PdfExperimentalImportItem => item !== null)
    .map((item, index) => ({ ...item, index }));

  if (items.length === 0) {
    throw new PdfExperimentError(
      "Nenhum lançamento reconhecível foi encontrado no texto do PDF.",
    );
  }
  if (items.length > IMPORT_MAX_ITEMS) {
    throw new PdfExperimentError(
      `PDF excede o limite de ${IMPORT_MAX_ITEMS} lançamentos.`,
    );
  }

  return {
    pageCount: extracted.pageCount,
    items,
    warnings: extracted.warnings,
  };
}
