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
import { moneyAfterLabel, moneyCellToCents, splitCells, textLines, valueBelowLabel } from "@/app/lib/documents/layout-text";

/** Símbolo provisório de um negócio cuja nota traz só o nome de pregão (ex.: "FII VALREIII CI ER"). */
export const UNRESOLVED_SYMBOL = "?";

export type BrokerageNoteMetadata = {
  /** Especificação do título como impressa na nota; usada para o usuário informar o ticker quando ele não consta. */
  specification?: string;
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
  // Notas em tabela: "Data pregão" é o rótulo e a data fica na linha de baixo.
  const below = valueBelowLabel(text, /^Data\s+Preg[aã]o$/i);
  const raw = below ? /\d{2}[/-]\d{2}[/-]\d{4}/.exec(below)?.[0] : undefined;
  return raw ? parseImportDate(raw) : null;
}

function parseNoteNumber(text: string, fallback: number) {
  return (
    /(?:N(?:ú|u)mero|Nr\.?|Nº)[ \t]*(?:da[ \t]+)?nota[ \t]*[:\-]?[ \t]*([0-9.\/-]+)/i.exec(text)?.[1] ??
    valueBelowLabel(text, /^(?:N[úu]mero\s+da\s+nota|Nr\.?\s*Nota)$/i)?.match(/^[0-9.\/-]+$/)?.[0] ??
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
    specification?: string;
    quantity: string;
    unitPriceCents: number;
    grossAmountCents: number;
  }> = [];

  const regex =
    /^(?:\S+\s+)?([CV])\s+(?:VISTA|FRACIONARIO|FRACIONÁRIO|OPCAO|OPÇÃO|TERMO)?\s*([A-Z0-9]{4,12})\b.*?([\d.]+(?:,\d+)?)\s+([\d.]+,\d{2,8})\s+([\d.]+,\d{2})\s*[DC]?$/i;

  // Notas em tabela: "Q Negociação  C/V  Tipo mercado  Prazo  Especificação  Obs.  Quantidade  Preço  Valor  D/C".
  const layoutRegex =
    /\b([CV])\s+(VISTA|FRACION[AÁ]RIO|TERMO|OP[CÇ][AÃ]O)\s+(.+?)\s+([\d.]+(?:,\d+)?)\s+(?:R\$\s*)?([\d.]+,\d{2,8})\s+(?:R\$\s*)?([\d.]+,\d{2})\s*[DC]?$/i;

  for (const line of lines) {
    const match = regex.exec(line);
    if (match) {
      const quantity = parseDecimalQuantity(match[3]);
      const unitPriceCents = unitPriceToCents(match[4]);
      const reportedGross = parseMoneyToCents(match[5]);
      if (!quantity || unitPriceCents === null || reportedGross === null) continue;
      parsed.push({
        operationType: match[1].toUpperCase() === "C" ? "BUY" : "SELL",
        market: /FRACION/i.test(line) ? "B3_FRACIONARIO" : "B3",
        symbol: match[2].toUpperCase(),
        quantity,
        unitPriceCents,
        grossAmountCents: Math.abs(reportedGross),
      });
      continue;
    }

    const layout = layoutRegex.exec(line);
    if (!layout) continue;
    const quantity = parseDecimalQuantity(layout[4]);
    const unitPriceCents = unitPriceToCents(layout[5]);
    const reportedGross = parseMoneyToCents(layout[6]);
    if (!quantity || unitPriceCents === null || reportedGross === null) continue;
    // A coluna "Obs." traz um caractere (@, #, D...) colado ao fim da especificação.
    const specification = normalizeText(layout[3].replace(/\s+[@#*A-Z0-9]$/i, ""));
    const ticker = /\b([A-Z]{4}\d{1,2}[A-Z]?)\b/.exec(specification.toUpperCase())?.[1];
    parsed.push({
      operationType: layout[1].toUpperCase() === "C" ? "BUY" : "SELL",
      market: /FRACION/i.test(layout[2]) ? "B3_FRACIONARIO" : "B3",
      symbol: ticker ?? UNRESOLVED_SYMBOL,
      specification,
      quantity,
      unitPriceCents,
      grossAmountCents: Math.abs(reportedGross),
    });
  }

  return parsed;
}

const NOTE_HEADER_LABEL = /^(?:Nr\.?\s*Nota|Data\s+Preg[aã]o)$/i;

/** Notas em tabela: cada página abre com o cabeçalho "Nr. Nota / Data pregão"; páginas da mesma nota são unidas. */
function splitTableNotes(text: string) {
  const lines = textLines(text);
  const starts: number[] = [];
  lines.forEach((line, index) => {
    if (!splitCells(line).some((cell) => NOTE_HEADER_LABEL.test(cell))) return;
    const previous = lines[index - 1]?.trim() ?? "";
    starts.push(/^NOTA DE CORRETAGEM$/i.test(previous) ? index - 1 : index);
  });
  if (starts.length <= 1) return null;

  const pages = starts.map((start, position) => lines.slice(start, starts[position + 1] ?? lines.length).join("\n"));
  const merged = new Map<string, string>();
  pages.forEach((page, position) => {
    const key = valueBelowLabel(page, /^(?:N[úu]mero\s+da\s+nota|Nr\.?\s*Nota)$/i) ?? `pagina-${position}`;
    merged.set(key, merged.has(key) ? `${merged.get(key)}\n${page}` : page);
  });
  return [...merged.values()];
}

function splitNotes(text: string) {
  const markers = [...text.matchAll(/(?=(?:N(?:ú|u)mero|Nr\.?|Nº)[ \t]*(?:da[ \t]+)?nota[ \t]*[:\-]?[ \t]*[0-9.\/-]+)/gi)];
  if (markers.length <= 1) return splitTableNotes(text) ?? [text];

  const chunks: string[] = [];
  for (let index = 0; index < markers.length; index += 1) {
    const start = markers[index].index ?? 0;
    const end = index + 1 < markers.length ? (markers[index + 1].index ?? text.length) : text.length;
    chunks.push(text.slice(start, end));
  }
  return chunks;
}

// Rótulos de taxa (fontes de regex). Os do bloco "Corretagem / Despesas" só contam quando trazem valor ao lado.
const FEE_LABELS = [
  "Taxa de Liquida[cç][aã]o(?:\\s*\\/\\s*CCP)?",
  "Taxa de Registro",
  "Taxa A\\.?N\\.?A\\.?",
  "Emolumentos",
  "Taxa de Transfer[eê]ncia de Ativos",
  "Taxa de Termo(?:\\s*\\/\\s*Op[cç][oõ]es)?",
  "Corretagem",
  "Clearing",
  "Execu[cç][aã]o casa|Execu[cç][aã]o",
  "ISS(?:\\s*\\([^)]*\\))?",
  "Outras",
];

/** Taxas, IRRF e líquido de notas em tabela (blocos "Resumo Financeiro" e "Corretagem / Despesas"). */
function parseLayoutFees(chunk: string) {
  if (!/Corretagem\s*\/\s*Despesas/i.test(chunk)) return null;

  const allocableFeesCents = FEE_LABELS.reduce(
    (total, label) => total + moneyAfterLabel(chunk, label).reduce((sum, value) => sum + value, 0),
    0,
  );
  const irrf = /I\.?R\.?R\.?F\.?\s*s\/\s*opera[^\n]*?Base\s+R\$\s*[\d.]+,\d{2}\s+(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d+,\d{2})/i.exec(chunk);
  const net = moneyAfterLabel(chunk, "L[ií]quido para\\s+\\d{2}\\/\\d{2}\\/\\d{4}");
  return {
    allocableFeesCents,
    irrfCents: irrf ? (moneyCellToCents(irrf[1]) ?? 0) : 0,
    netAmountCents: net[0] ?? null,
  };
}

/**
 * O líquido da nota é o valor das operações mais/menos as taxas. Divergência não bloqueia a importação
 * (a nota pode ter linhas que o leitor não conhece), mas é avisada para revisão.
 */
function checkNetAmount(params: {
  businesses: Array<{ operationType: "BUY" | "SELL"; grossAmountCents: number }>;
  allocableFeesCents: number;
  irrfCents: number;
  netAmountCents: number | null;
}) {
  if (params.netAmountCents === null) return null;
  const buys = params.businesses.filter((item) => item.operationType === "BUY").reduce((sum, item) => sum + item.grossAmountCents, 0);
  const sells = params.businesses.filter((item) => item.operationType === "SELL").reduce((sum, item) => sum + item.grossAmountCents, 0);
  // Valor líquido com sinal da nota: vendas − compras − taxas − IRRF (compra gera débito, venda gera crédito).
  const expected = Math.abs(sells - buys - params.allocableFeesCents - params.irrfCents);
  if (Math.abs(expected - params.netAmountCents) <= 1) return null;
  const money = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return `o líquido da nota (${money(params.netAmountCents)}) difere do calculado (${money(expected)}); confira as taxas.`;
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

    const layoutFees = parseLayoutFees(chunk);
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
    const legacyIrrfCents = findMoney(chunk, [
      /I\.?R\.?R\.?F\.?[^\d]*([\d.]+,\d{2})/i,
      /IRRF[^\d]*([\d.]+,\d{2})/i,
    ]);
    const irrfCents = layoutFees?.irrfCents ?? legacyIrrfCents;
    const netRaw =
      /L[ií]quido\s+(?:para|da)\s+nota[^\d]*([\d.]+,\d{2})/i.exec(chunk)?.[1] ??
      /L[ií]quido[^\d]*([\d.]+,\d{2})/i.exec(chunk)?.[1];
    const netAmountCents = layoutFees?.netAmountCents ?? (netRaw ? Math.abs(parseMoneyToCents(netRaw) ?? 0) : null);

    const allocableFeesCents =
      layoutFees?.allocableFeesCents ??
      settlementFee + emoluments + transferFee + brokerage + iss + otherExpenses;
    const allocatedFees = allocateBrokerageFees(
      businesses.map((business) => business.grossAmountCents),
      allocableFeesCents,
    );

    const netMismatch = checkNetAmount({ businesses, allocableFeesCents, irrfCents, netAmountCents });
    if (netMismatch) warnings.push(`Nota ${noteNumber}: ${netMismatch}`);

    businesses.forEach((business, businessIndex) => {
      const expectedGross = grossFromQuantity(business.quantity, business.unitPriceCents);
      const errors: string[] = [];
      if (business.symbol === UNRESOLVED_SYMBOL) {
        errors.push(`Ticker não identificado para "${business.specification ?? "ativo"}". Informe o ticker para importar.`);
      }
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
          specification: business.specification,
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

const TICKER_PATTERN = /^[A-Z]{4}\d{1,2}[A-Z]?$/;
const UNRESOLVED_ERROR = /^Ticker não identificado/;

/** Normaliza a especificação do título para servir de chave (maiúsculas, espaços únicos). */
export function specificationKey(specification: string) {
  return specification.replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Lê o mapa "especificação → ticker" enviado pelo usuário. Entradas inválidas são recusadas em vez de ignoradas,
 * para que um ticker digitado errado não passe despercebido.
 */
export function parseSymbolOverrides(raw: FormDataEntryValue | null): Record<string, string> {
  if (raw === null || raw === "") return {};
  let value: unknown;
  try {
    value = JSON.parse(String(raw));
  } catch {
    throw new ImportParseError("Tickers informados em formato inválido.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ImportParseError("Tickers informados em formato inválido.");
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length > 50) throw new ImportParseError("Muitos tickers informados de uma vez.");

  const result: Record<string, string> = {};
  for (const [specification, ticker] of entries) {
    const normalized = typeof ticker === "string" ? ticker.trim().toUpperCase() : "";
    if (!TICKER_PATTERN.test(normalized)) {
      throw new ImportParseError(`Ticker inválido para "${specification}". Use o formato da B3, como VGIR11 ou PETR4.`);
    }
    result[specificationKey(specification)] = normalized;
  }
  return result;
}

/** Aplica os tickers informados pelo usuário aos negócios que a nota identificou só pelo nome de pregão. */
export function applySymbolOverrides<T extends { symbol: string; assetType: ParsedInvestmentOperationItem["assetType"]; errors: string[]; brokerageNote?: { specification?: string } }>(
  items: readonly T[],
  overrides: Record<string, string>,
): T[] {
  return items.map((item) => {
    if (item.symbol !== UNRESOLVED_SYMBOL) return item;
    const specification = item.brokerageNote?.specification;
    const ticker = specification ? overrides[specificationKey(specification)] : undefined;
    if (!ticker) return item;
    return { ...item, symbol: ticker, assetType: inferAssetType(ticker), errors: item.errors.filter((error) => !UNRESOLVED_ERROR.test(error)) };
  });
}

export function parseNubankBrokerageNotePdf(bytes: Uint8Array) {
  const extracted = extractPdfText(bytes);
  const parsed = parseNubankBrokerageNoteText(extracted.text);
  return {
    ...parsed,
    warnings: [...extracted.warnings, ...parsed.warnings],
  };
}
