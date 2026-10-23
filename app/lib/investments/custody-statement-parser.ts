import { moneyCellToCents, splitCells, textLines } from "@/app/lib/documents/layout-text";
import { formatInvestmentQuantity, parseInvestmentQuantity } from "@/app/lib/investments/investment-domain";

/**
 * Extrato de Custódia do Nubank: foto das posições (Caixinhas de renda fixa e Bolsa de Valores) numa data.
 * Só leitura: serve para conferir com a carteira do app, nunca cria operações.
 */

export type CustodyAssetKind = "FII" | "STOCK" | "ETF" | "BDR" | "OTHER";

export type CustodySummaryRow = {
  label: string;
  grossCents: number;
  irCents: number;
  iofCents: number;
  netCents: number;
};

export type CustodyFixedIncomeRow = {
  caixinha: string;
  assetType: string;
  issuer: string;
  grossCents: number;
  irCents: number;
  iofCents: number;
  netCents: number;
  availability: string | null;
};

export type CustodyEquityRow = {
  kind: CustodyAssetKind;
  assetType: string;
  name: string;
  symbol: string | null;
  quantity: string;
  grossCents: number;
  availability: string | null;
};

export type ParsedCustodyStatement = {
  referenceDate: string | null;
  summary: CustodySummaryRow[];
  fixedIncome: CustodyFixedIncomeRow[];
  equities: CustodyEquityRow[];
  equitiesTotalCents: number | null;
  warnings: string[];
};

function fold(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

export function isCustodyStatement(text: string) {
  return /EXTRATO\s*DE\s*CUSTODIA/.test(fold(text).replace(/\s/g, "")) || /EXTRATODECUSTODIA/.test(fold(text).replace(/\s/g, ""));
}

function kindOf(assetType: string): CustodyAssetKind {
  const value = fold(assetType);
  if (/\bFII\b|FUNDO IMOBILIARIO/.test(value)) return "FII";
  if (/\bETF\b/.test(value)) return "ETF";
  if (/\bBDR\b/.test(value)) return "BDR";
  if (/ACAO|ACOES/.test(value)) return "STOCK";
  return "OTHER";
}

function quantityOf(cell: string | undefined) {
  if (!cell) return null;
  const normalized = cell.trim().replace(/\./g, "").replace(",", ".");
  const units = parseInvestmentQuantity(normalized);
  return units === null ? null : formatInvestmentQuantity(units);
}

const isMoney = (cell: string | undefined) => !!cell && /^(?:R\$\s*)?-?\d{1,3}(?:\.\d{3})*,\d{2}$/.test(cell.trim());

export function parseNubankCustodyStatementText(text: string): ParsedCustodyStatement {
  if (!isCustodyStatement(text)) throw new Error("CUSTODY_STATEMENT_NOT_RECOGNIZED");

  const lines = textLines(text).map((line) => line.trim()).filter(Boolean);
  const warnings: string[] = [];
  const summary: CustodySummaryRow[] = [];
  const fixedIncome: CustodyFixedIncomeRow[] = [];
  const equities: CustodyEquityRow[] = [];
  let equitiesTotalCents: number | null = null;

  const dateMatch = /Cust[oó]dia\s+em:\s*(\d{2})\/(\d{2})\/(\d{4})/i.exec(text);
  const referenceDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
  if (!referenceDate) warnings.push("Data de referência da custódia não reconhecida.");

  type Section = "NONE" | "SUMMARY" | "CAIXINHA" | "EQUITIES";
  let section: Section = "NONE";
  let caixinha = "";

  for (const line of lines) {
    const cells = splitCells(line);
    const head = fold(cells[0] ?? "");

    if (/^Resumo da posi[cç][aã]o consolidada$/i.test(cells[0] ?? "")) {
      section = "SUMMARY";
      continue;
    }
    if (/^Cust[oó]dia em Caixinhas$/i.test(cells[0] ?? "")) {
      section = "CAIXINHA";
      continue;
    }
    const named = /^Caixinha\s+["“”]?(.+?)["“”]?$/i.exec(cells[0] ?? "");
    if (named) {
      section = "CAIXINHA";
      caixinha = named[1].trim();
      continue;
    }
    if (/^Cust[oó]dia em Bolsa de Valores$/i.test(cells[0] ?? "")) {
      section = "EQUITIES";
      continue;
    }
    if (/^Informa[cç][oõ]es importantes$/i.test(cells[0] ?? "")) {
      section = "NONE";
      continue;
    }
    if (/^Tipo de (?:investimento|ativo)$/i.test(cells[0] ?? "")) continue;

    if (section === "SUMMARY" && isMoney(cells[1]) && cells.length >= 5) {
      summary.push({
        label: cells[0]!,
        grossCents: moneyCellToCents(cells[1])!,
        irCents: moneyCellToCents(cells[2]) ?? 0,
        iofCents: moneyCellToCents(cells[3]) ?? 0,
        netCents: moneyCellToCents(cells[4]) ?? 0,
      });
      continue;
    }

    if (section === "CAIXINHA" && head !== "TOTAL" && cells.length >= 6 && isMoney(cells[2])) {
      fixedIncome.push({
        caixinha,
        assetType: cells[0]!,
        issuer: cells[1]!,
        grossCents: moneyCellToCents(cells[2])!,
        irCents: moneyCellToCents(cells[3]) ?? 0,
        iofCents: moneyCellToCents(cells[4]) ?? 0,
        netCents: moneyCellToCents(cells[5]) ?? 0,
        availability: cells[6] ?? null,
      });
      continue;
    }

    if (section === "EQUITIES") {
      if (head === "TOTAL") {
        equitiesTotalCents = moneyCellToCents(cells[cells.length - 1]);
        continue;
      }
      if (cells.length >= 4 && isMoney(cells[3])) {
        const quantity = quantityOf(cells[2]);
        const grossCents = moneyCellToCents(cells[3]);
        if (quantity === null || grossCents === null) {
          warnings.push(`Linha de custódia ignorada: quantidade ou valor inválido (${cells[1]}).`);
          continue;
        }
        const symbol = /\(([A-Z]{4}\d{1,2}[A-Z]?)\)\s*$/.exec(cells[1]!)?.[1] ?? null;
        equities.push({
          kind: kindOf(cells[0]!),
          assetType: cells[0]!,
          name: cells[1]!.replace(/\s*\([A-Z]{4}\d{1,2}[A-Z]?\)\s*$/, "").trim(),
          symbol,
          quantity,
          grossCents,
          availability: cells[4] ?? null,
        });
      }
    }
  }

  if (summary.length === 0 && fixedIncome.length === 0 && equities.length === 0) {
    warnings.push("Nenhuma posição reconhecida no extrato de custódia.");
  }
  if (equitiesTotalCents !== null) {
    const sum = equities.reduce((total, row) => total + row.grossCents, 0);
    if (Math.abs(sum - equitiesTotalCents) > 1) {
      warnings.push("A soma das posições da Bolsa de Valores não confere com o total do extrato.");
    }
  }
  for (const row of equities.filter((item) => item.symbol === null)) {
    warnings.push(`Ativo sem ticker no extrato: ${row.name}. Não será comparado com a carteira.`);
  }

  return { referenceDate, summary, fixedIncome, equities, equitiesTotalCents, warnings };
}
