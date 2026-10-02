import { createHash } from "node:crypto";

import {
  INVESTMENT_QUANTITY_SCALE,
  parseInvestmentQuantity,
} from "@/app/lib/investments/investment-domain";
import {
  ImportParseError,
  IMPORT_MAX_ITEMS,
  parseImportDate,
  parseMoneyToCents,
  type ImportSource,
} from "@/app/lib/transactions/import/parser";

export type InvestmentImportKind = "OPERATIONS" | "INCOMES";
export type InvestmentImportSource = Extract<ImportSource, "CSV" | "XLSX">;

type AssetType = "STOCK" | "FII" | "ETF" | "FIXED_INCOME" | "CRYPTO" | "FUND" | "OTHER";

type BaseItem = {
  index: number;
  source: InvestmentImportSource;
  kind: InvestmentImportKind;
  date: string;
  symbol: string;
  assetName: string | null;
  assetType: AssetType;
  institution: string;
  quantity: string;
  errors: string[];
};

export type ParsedInvestmentOperationItem = BaseItem & {
  kind: "OPERATIONS";
  operationType: "BUY" | "SELL";
  movement: string;
  unitPriceCents: number;
  feesCents: number;
  amountCents: number;
  rawUnitPrice: string;
};

export type ParsedInvestmentIncomeItem = BaseItem & {
  kind: "INCOMES";
  incomeType: "INCOME" | "DIVIDEND" | "INTEREST" | "OTHER";
  eventType: string;
  unitValueCents: number;
  netAmountCents: number;
};

export type ParsedInvestmentImportItem =
  | ParsedInvestmentOperationItem
  | ParsedInvestmentIncomeItem;

export type PreviewInvestmentImportItem = ParsedInvestmentImportItem & {
  fingerprint: string;
  duplicate: boolean;
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_/-]+/g, "");
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function detectDelimiter(header: string) {
  const comma = (header.match(/,/g) ?? []).length;
  const semicolon = (header.match(/;/g) ?? []).length;
  return semicolon > comma ? ";" : ",";
}

function parseCsvRows(content: string) {
  const clean = content.replace(/^\uFEFF/, "");
  const delimiter = detectDelimiter(clean.split(/\r?\n/, 1)[0] ?? "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (char === '"') {
      if (quoted && clean[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && clean[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) throw new ImportParseError("CSV inválido: aspas não foram fechadas.");
  row.push(field);
  if (row.some((cell) => cell.trim())) rows.push(row);
  return rows;
}

export function parseInvestmentCsvRows(content: string) {
  return parseCsvRows(content);
}

function findIndex(headers: string[], names: string[]) {
  return headers.findIndex((header) => names.includes(header));
}

function parseB3Quantity(raw: string) {
  let value = raw.trim().replace(/\s+/g, "");
  if (!value) return null;

  if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) {
    value = value.replace(/\./g, "");
  } else if (value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  }

  const parsed = parseInvestmentQuantity(value);
  return parsed === null ? null : value;
}

function parseProduct(raw: string) {
  const value = normalizeText(raw);
  const match = /^([A-Z0-9]{4,24})\s*-\s*(.+)$/i.exec(value);
  const symbol = (match?.[1] ?? value.split(/\s+/)[0] ?? "").toUpperCase();
  const name = match?.[2]?.trim() || null;
  const descriptor = (name ?? value).toUpperCase();

  let type: AssetType = "OTHER";
  if (/FDO INV IMOB|FUNDO DE INVESTIMENTO IMOBILI|\bFII\b/.test(descriptor)) {
    type = "FII";
  } else if (/\bETF\b/.test(descriptor)) {
    type = "ETF";
  }

  return { symbol, name, type };
}

function parseDecimal(raw: string) {
  let value = raw
    .trim()
    .replace(/\u00a0/g, "")
    .replace(/(?:R\$|BRL)/gi, "")
    .replace(/\s+/g, "");

  if (!value) return null;
  if (value.includes(",") && value.includes(".")) {
    value = value.lastIndexOf(",") > value.lastIndexOf(".")
      ? value.replace(/\./g, "").replace(",", ".")
      : value.replace(/,/g, "");
  } else if (value.includes(",")) {
    value = value.replace(",", ".");
  }

  if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function floorPriceToCents(raw: string) {
  const value = parseDecimal(raw);
  if (value === null || value <= 0) return null;
  return Math.floor(value * 100 + 1e-8);
}

function grossCents(quantity: string, unitPriceCents: number) {
  const quantityUnits = parseInvestmentQuantity(quantity);
  if (quantityUnits === null) return null;
  const gross =
    (quantityUnits * BigInt(unitPriceCents) + INVESTMENT_QUANTITY_SCALE / BigInt(2)) /
    INVESTMENT_QUANTITY_SCALE;
  if (gross > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(gross);
}

function incomeType(raw: string): ParsedInvestmentIncomeItem["incomeType"] {
  const value = normalizeText(raw).toLowerCase();
  if (value.includes("dividendo")) return "DIVIDEND";
  if (value.includes("juro")) return "INTEREST";
  if (value.includes("rendimento")) return "INCOME";
  return "OTHER";
}

function operationType(raw: string) {
  const value = normalizeText(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  if (value === "credito") return "BUY" as const;
  if (value === "debito") return "SELL" as const;
  return null;
}

function requiredIndex(headers: string[], aliases: string[], label: string) {
  const index = findIndex(headers, aliases);
  if (index < 0) throw new ImportParseError(`Coluna obrigatória ausente: ${label}.`);
  return index;
}

export function parseInvestmentRows(
  rows: readonly (readonly string[])[],
  source: InvestmentImportSource,
): ParsedInvestmentImportItem[] {
  if (rows.length < 2) throw new ImportParseError("Arquivo sem linhas de investimento.");
  if (rows.length - 1 > IMPORT_MAX_ITEMS) {
    throw new ImportParseError(`Arquivo excede o limite de ${IMPORT_MAX_ITEMS} registros.`);
  }

  const headers = rows[0].map((value) => normalizeHeader(value ?? ""));
  const isOperations =
    findIndex(headers, ["entradasaida"]) >= 0 &&
    findIndex(headers, ["movimentacao"]) >= 0 &&
    findIndex(headers, ["valordaoperacao"]) >= 0;
  const isIncomes =
    findIndex(headers, ["pagamento"]) >= 0 &&
    findIndex(headers, ["tipodeevento"]) >= 0 &&
    findIndex(headers, ["valorliquido"]) >= 0;

  if (!isOperations && !isIncomes) {
    throw new ImportParseError(
      "Formato de investimento não reconhecido. Use o extrato de movimentações ou de proventos da B3.",
    );
  }

  const productIndex = requiredIndex(headers, ["produto"], "Produto");
  const institutionIndex = requiredIndex(headers, ["instituicao"], "Instituição");
  const quantityIndex = requiredIndex(headers, ["quantidade"], "Quantidade");
  const unitPriceIndex = requiredIndex(headers, ["precounitario"], "Preço unitário");

  if (isOperations) {
    const directionIndex = requiredIndex(headers, ["entradasaida"], "Entrada/Saída");
    const dateIndex = requiredIndex(headers, ["data"], "Data");
    const movementIndex = requiredIndex(headers, ["movimentacao"], "Movimentação");
    const amountIndex = requiredIndex(headers, ["valordaoperacao"], "Valor da Operação");

    return rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim())).map((row, index) => {
      const errors: string[] = [];
      const product = parseProduct(String(row[productIndex] ?? ""));
      const date = parseImportDate(String(row[dateIndex] ?? ""));
      const quantity = parseB3Quantity(String(row[quantityIndex] ?? ""));
      const type = operationType(String(row[directionIndex] ?? ""));
      const rawUnitPrice = String(row[unitPriceIndex] ?? "");
      const unitPriceCents = floorPriceToCents(rawUnitPrice);
      const amountCents = parseMoneyToCents(String(row[amountIndex] ?? ""));
      const movement = normalizeText(String(row[movementIndex] ?? ""));
      const institution = normalizeText(String(row[institutionIndex] ?? ""));

      if (!product.symbol) errors.push("Produto inválido.");
      if (!date) errors.push("Data inválida.");
      if (!quantity) errors.push("Quantidade inválida.");
      if (!type) errors.push("Entrada/Saída deve ser Crédito ou Débito.");
      if (unitPriceCents === null) errors.push("Preço unitário inválido.");
      if (amountCents === null || amountCents <= 0) errors.push("Valor da operação inválido.");

      const baseGross =
        quantity && unitPriceCents !== null ? grossCents(quantity, unitPriceCents) : null;
      const feesCents =
        type === "BUY" && baseGross !== null && amountCents !== null
          ? Math.max(0, amountCents - baseGross)
          : 0;

      return {
        index,
        source,
        kind: "OPERATIONS" as const,
        date: date ?? "",
        symbol: product.symbol,
        assetName: product.name,
        assetType: product.type,
        institution,
        quantity: quantity ?? "",
        errors,
        operationType: type ?? "BUY",
        movement,
        unitPriceCents: unitPriceCents ?? 0,
        feesCents,
        amountCents: amountCents ?? 0,
        rawUnitPrice,
      };
    });
  }

  const dateIndex = requiredIndex(headers, ["pagamento"], "Pagamento");
  const eventIndex = requiredIndex(headers, ["tipodeevento"], "Tipo de Evento");
  const amountIndex = requiredIndex(headers, ["valorliquido"], "Valor líquido");

  return rows.slice(1).filter((row) => row.some((cell) => String(cell ?? "").trim())).map((row, index) => {
    const errors: string[] = [];
    const product = parseProduct(String(row[productIndex] ?? ""));
    const date = parseImportDate(String(row[dateIndex] ?? ""));
    const quantity = parseB3Quantity(String(row[quantityIndex] ?? ""));
    const unitValueCents = floorPriceToCents(String(row[unitPriceIndex] ?? ""));
    const netAmountCents = parseMoneyToCents(String(row[amountIndex] ?? ""));
    const eventType = normalizeText(String(row[eventIndex] ?? ""));
    const institution = normalizeText(String(row[institutionIndex] ?? ""));

    if (!product.symbol) errors.push("Produto inválido.");
    if (!date) errors.push("Data de pagamento inválida.");
    if (!quantity) errors.push("Quantidade inválida.");
    if (unitValueCents === null) errors.push("Preço unitário inválido.");
    if (netAmountCents === null || netAmountCents <= 0) errors.push("Valor líquido inválido.");

    return {
      index,
      source,
      kind: "INCOMES" as const,
      date: date ?? "",
      symbol: product.symbol,
      assetName: product.name,
      assetType: product.type,
      institution,
      quantity: quantity ?? "",
      errors,
      incomeType: incomeType(eventType),
      eventType,
      unitValueCents: unitValueCents ?? 0,
      netAmountCents: netAmountCents ?? 0,
    };
  });
}

function itemIdentity(item: ParsedInvestmentImportItem) {
  const common = [
    item.kind,
    item.date,
    item.symbol,
    item.quantity,
    item.institution.toLowerCase(),
  ];

  if (item.kind === "OPERATIONS") {
    return [
      ...common,
      item.operationType,
      item.movement.toLowerCase(),
      item.rawUnitPrice,
      item.amountCents,
    ].join("|");
  }

  return [
    ...common,
    item.incomeType,
    item.eventType.toLowerCase(),
    item.unitValueCents,
    item.netAmountCents,
  ].join("|");
}

export function withInvestmentImportFingerprints(params: {
  userId: string;
  accountId: string;
  items: ParsedInvestmentImportItem[];
}) {
  const occurrences = new Map<string, number>();

  return params.items.map((item) => {
    const identity = itemIdentity(item);
    const occurrence = (occurrences.get(identity) ?? 0) + 1;
    occurrences.set(identity, occurrence);
    const fingerprint = createHash("sha256")
      .update(
        [
          params.userId,
          params.accountId,
          item.source,
          identity,
          occurrence,
        ].join("|"),
      )
      .digest("hex");

    return {
      ...item,
      fingerprint,
      duplicate: false,
    } satisfies PreviewInvestmentImportItem;
  });
}
