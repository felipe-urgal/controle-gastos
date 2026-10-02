import {
  INVESTMENT_QUANTITY_SCALE,
  parseInvestmentQuantity,
} from "@/app/lib/investments/investment-domain";
import type { ParsedInvestmentOperationItem } from "@/app/lib/investments/import/investment-import-parser";
import {
  ImportParseError,
  parseImportDate,
  parseMoneyToCents,
} from "@/app/lib/transactions/import/parser";
import { extractPdfText } from "@/app/lib/transactions/import/pdf-experiment";

export type BrokerageNoteMetadata = {
  broker: string;
  brokerCnpj: string | null;
  noteNumber: string;
  tradeDate: string;
  businessIndex: number;
  market: string;
  grossAmountCents: number;
  allocatedFeesCents: number;
  irrfCents: number;
};

export type NubankBrokerageParseResult = {
  items: Array<ParsedInvestmentOperationItem & { brokerageNote: BrokerageNoteMetadata }>;
  notes: Array<{
    noteNumber: string;
    tradeDate: string;
    broker: string;
    brokerCnpj: string | null;
    businesses: number;
    allocableFeesCents: number;
    irrfCents: number;
    netAmountCents: number | null;
  }>;
  warnings: string[];
};

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function parseDecimalQuantity(raw: string) {
  let value = raw.trim().replace(/\s+/g, "");
  if (/^\d{1,3}(?:\.\d{3})+$/.test(value)) value = value.replace(/\./g, "");
  else if (value.includes(",")) value = value.replace(/\./g, "").replace(",", ".");
  return parseInvestmentQuantity(value) === null ? null : value;
}

function unitPriceToCents(raw: string) {
  const cents = parseMoneyToCents(raw);
  return cents === null ? null : Math.abs(cents);
}

function grossFromQuantity(quantity: string, unitPriceCents: number) {
  const units = parseInvestmentQuantity(quantity);
  if (units === null) return null;
  const gross =
    (units * BigInt(unitPriceCents) + INVESTMENT_QUANTITY_SCALE / BigInt(2)) /
    INVESTMENT_QUANTITY_SCALE;
  if (gross > BigInt(Number.MAX_SAFE_INTEGER)) return null;
  return Number(gross);
}

export function allocateBrokerageFees(
  grossAmountsCents: readonly number[],
  totalFeesCents: number,
) {
  if (grossAmountsCents.length === 0) return [];
  if (totalFeesCents <= 0) return grossAmountsCents.map(() => 0);

  const totalGross = grossAmountsCents.reduce((sum, value) => sum + value, 0);
  if (totalGross <= 0) {
    const result = grossAmountsCents.map(() => 0);
    result[result.length - 1] = totalFeesCents;
    return result;
  }

  let allocated = 0;
  return grossAmountsCents.map((gross, index) => {
    if (index === grossAmountsCents.length - 1) return totalFeesCents - allocated;
    const share = Math.floor((totalFeesCents * gross) / totalGross);
    allocated += share;
    return share;
  });
}

function findMoney(text: string, labels: readonly RegExp[]) {
  for (const label of labels) {
    const match = label.exec(text);
    if (!match?.[1]) continue;
    const cents = parseMoneyToCents(match[1]);
    if (cents !== null) return Math.abs(cents);
  }
  return 0;
}

function parseDateFromText(text: string) {
  const patterns = [
    /Data\s+(?:do\s+)?preg[aã]o\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
    /Preg[aã]o\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
    /Data\s*[:\-]?\s*(\d{2}[/-]\d{2}[/-]\d{4})/i,
  ];
  for (const pattern of patterns) {
    const raw = pattern.exec(text)?.[1];
    const parsed = raw ? parseImportDate(raw) : null;
    if (parsed) return parsed;
  }
  return null;
}

function parseNoteNumber(text: string, fallback: number) {
  return (
    /(?:N(?:ú|u)mero|Nr\.?|Nº)\s*(?:da\s+)?nota\s*[:\-]?\s*([0-9.\/-]+)/i.exec(text)?.[1] ??
    /Nota\s+(?:de\s+negocia[cç][aã]o\s+)?(?:n[ºo]\.?\s*)?([0-9.\/-]+)/i.exec(text)?.[1] ??
    String(fallback + 1)
  ).trim();
}

function parseCnpj(text: string) {
  return /\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/.exec(text)?.[1] ?? null;
}

function inferAssetType(symbol: string): ParsedInvestmentOperationItem["assetType"] {
  if (/11$/.test(symbol)) return "FII";
  return "STOCK";
}

function parseBusinessLines(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map(normalizeText)
    .filter(Boolean);
  const parsed: Array<{
    operationType: "BUY" | "SELL";
    market: string;
    symbol: string;
    quantity: string;
    unitPriceCents: number;
    grossAmountCents: number;
  }> = [];

  const regex =
    /^(?:\S+\s+)?([CV])\s+(?:VISTA|FRACIONARIO|FRACIONÁRIO|OPCAO|OPÇÃO|TERMO)?\s*([A-Z0-9]{4,12})\b.*?([\d.]+(?:,\d+)?)\s+([\d.]+,\d{2,8})\s+([\d.]+,\d{2})\s*[DC]?$/i;

  for (const line of lines) {
    const match = regex.exec(line);
    if (!match) continue;
    const quantity = parseDecimalQuantity(match[3]);
    const unitPriceCents = unitPriceToCents(match[4]);
    const reportedGross = parseMoneyToCents(match[5]);
    if (!quantity || unitPriceCents === null || reportedGross === null) continue;
    const symbol = match[2].toUpperCase();
    parsed.push({
      operationType: match[1].toUpperCase() === "C" ? "BUY" : "SELL",
      market: /FRACION/i.test(line) ? "B3_FRACIONARIO" : "B3",
      symbol,
      quantity,
      unitPriceCents,
      grossAmountCents: Math.abs(reportedGross),
    });
  }

  return parsed;
}

function splitNotes(text: string) {
  const markers = [...text.matchAll(/(?=(?:N(?:ú|u)mero|Nr\.?|Nº)\s*(?:da\s+)?nota\s*[:\-]?\s*[0-9.\/-]+)/gi)];
  if (markers.length <= 1) return [text];

  const chunks: string[] = [];
  for (let index = 0; index < markers.length; index += 1) {
    const start = markers[index].index ?? 0;
    const end = index + 1 < markers.length ? (markers[index + 1].index ?? text.length) : text.length;
    chunks.push(text.slice(start, end));
  }
  return chunks;
}

export function parseNubankBrokerageNoteText(text: string): NubankBrokerageParseResult {
  const normalized = text.replace(/\r/g, "\n");
  if (!/nota\s+de\s+negocia[cç][aã]o/i.test(normalized) && !/nu\s+investimentos/i.test(normalized)) {
    throw new ImportParseError("PDF não parece ser uma nota de corretagem da Nu Investimentos.");
  }

  const chunks = splitNotes(normalized);
  const items: NubankBrokerageParseResult["items"] = [];
  const notes: NubankBrokerageParseResult["notes"] = [];
  const warnings: string[] = [];

  chunks.forEach((chunk, noteIndex) => {
    const tradeDate = parseDateFromText(chunk);
    const noteNumber = parseNoteNumber(chunk, noteIndex);
    const broker = /nu\s+investimentos/i.test(chunk) ? "Nu Investimentos" : "Nubank";
    const brokerCnpj = parseCnpj(chunk);
    const businesses = parseBusinessLines(chunk);

    if (!tradeDate) {
      warnings.push(`Nota ${noteNumber}: data do pregão não reconhecida.`);
      return;
    }
    if (businesses.length === 0) {
      warnings.push(`Nota ${noteNumber}: nenhum negócio reconhecido.`);
      return;
    }

    const settlementFee = findMoney(chunk, [
      /Taxa\s+(?:de\s+)?liquida[cç][aã]o[^\d]*([\d.]+,\d{2})/i,
      /Taxa\s+CCP[^\d]*([\d.]+,\d{2})/i,
    ]);
    const emoluments = findMoney(chunk, [/Emolumentos[^\d]*([\d.]+,\d{2})/i]);
    const transferFee = findMoney(chunk, [/Taxa\s+de\s+Transfer[eê]ncia[^\d]*([\d.]+,\d{2})/i]);
    const brokerage = findMoney(chunk, [/Corretagem[^\d]*([\d.]+,\d{2})/i]);
    const iss = findMoney(chunk, [/\bISS\b[^\d]*([\d.]+,\d{2})/i]);
    const otherExpenses = findMoney(chunk, [
      /Outras\s+despesas[^\d]*([\d.]+,\d{2})/i,
      /Outros[^\d]*([\d.]+,\d{2})/i,
    ]);
    const irrfCents = findMoney(chunk, [
      /I\.?R\.?R\.?F\.?[^\d]*([\d.]+,\d{2})/i,
      /IRRF[^\d]*([\d.]+,\d{2})/i,
    ]);
    const netRaw =
      /L[ií]quido\s+(?:para|da)\s+nota[^\d]*([\d.]+,\d{2})/i.exec(chunk)?.[1] ??
      /L[ií]quido[^\d]*([\d.]+,\d{2})/i.exec(chunk)?.[1];
    const netAmountCents = netRaw ? Math.abs(parseMoneyToCents(netRaw) ?? 0) : null;

    const allocableFeesCents =
      settlementFee + emoluments + transferFee + brokerage + iss + otherExpenses;
    const allocatedFees = allocateBrokerageFees(
      businesses.map((business) => business.grossAmountCents),
      allocableFeesCents,
    );

    businesses.forEach((business, businessIndex) => {
      const expectedGross = grossFromQuantity(business.quantity, business.unitPriceCents);
      const errors: string[] = [];
      if (expectedGross === null) errors.push("Quantidade ou preço inválido.");
      else if (Math.abs(expectedGross - business.grossAmountCents) > 1) {
        errors.push("Valor bruto da nota diverge de quantidade × preço.");
      }

      items.push({
        index: items.length,
        source: "PDF",
        kind: "OPERATIONS",
        date: tradeDate,
        symbol: business.symbol,
        assetName: null,
        assetType: inferAssetType(business.symbol),
        institution: broker,
        quantity: business.quantity,
        errors,
        operationType: business.operationType,
        movement: `NUBANK_BROKERAGE_NOTE · Nota ${noteNumber} · negócio ${businessIndex + 1}`,
        unitPriceCents: business.unitPriceCents,
        feesCents: allocatedFees[businessIndex] ?? 0,
        amountCents: business.grossAmountCents,
        rawUnitPrice: (business.unitPriceCents / 100).toFixed(2),
        brokerageNote: {
          broker,
          brokerCnpj,
          noteNumber,
          tradeDate,
          businessIndex,
          market: business.market,
          grossAmountCents: business.grossAmountCents,
          allocatedFeesCents: allocatedFees[businessIndex] ?? 0,
          irrfCents,
        },
      });
    });

    notes.push({
      noteNumber,
      tradeDate,
      broker,
      brokerCnpj,
      businesses: businesses.length,
      allocableFeesCents,
      irrfCents,
      netAmountCents,
    });
  });

  if (items.length === 0) {
    throw new ImportParseError(
      warnings[0] ?? "Nenhum negócio reconhecível foi encontrado na nota de corretagem.",
    );
  }

  return { items, notes, warnings };
}

export function parseNubankBrokerageNotePdf(bytes: Uint8Array) {
  const extracted = extractPdfText(bytes);
  const parsed = parseNubankBrokerageNoteText(extracted.text);
  return {
    ...parsed,
    warnings: [...extracted.warnings, ...parsed.warnings],
  };
}
