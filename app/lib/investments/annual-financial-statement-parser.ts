import { createHash } from "node:crypto";

import { splitCells } from "@/app/lib/documents/layout-text";
import { parseMoneyToCents } from "@/app/lib/transactions/import/parser";

export type AnnualFinancialStatementPositionType =
  | "CASH"
  | "FIXED_INCOME"
  | "FII"
  | "CRYPTO"
  | "OTHER";

export type ParsedAnnualFinancialStatementPosition = {
  type: AnnualFinancialStatementPositionType;
  symbol: string | null;
  description: string;
  currency: "BRL";
  previousYearQuantity: string | null;
  currentYearQuantity: string | null;
  previousYearCostCents: number | null;
  currentYearCostCents: number | null;
  previousYearBalanceCents: number | null;
  currentYearBalanceCents: number | null;
  sourceInstitution: string | null;
  sourceInstitutionCnpj: string | null;
  category: string | null;
};

export type ParsedAnnualFinancialStatementIncome = {
  symbol: string | null;
  description: string;
  incomeType: "DIVIDEND" | "INTEREST" | "INCOME" | "OTHER";
  currency: "BRL";
  amountCents: number | null;
  payerName: string | null;
  payerCnpj: string | null;
  category: string | null;
};

export type ParsedAnnualFinancialStatementTaxWithholding = {
  symbol: string | null;
  description: string;
  currency: "BRL";
  amountCents: number | null;
};

export type ParsedAnnualFinancialTaxStatement = {
  calendarYear: number;
  sourceInstitution: string;
  sourceInstitutionCnpj: string | null;
  documentType: "NUBANK_ANNUAL_FINANCIAL_STATEMENT";
  positions: ParsedAnnualFinancialStatementPosition[];
  incomes: ParsedAnnualFinancialStatementIncome[];
  taxWithholdings: ParsedAnnualFinancialStatementTaxWithholding[];
  notes: string[];
  warnings: string[];
  errors: string[];
};

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function fold(value: string) {
  return normalize(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function money(raw: string | undefined) {
  if (!raw) return null;
  const cents = parseMoneyToCents(raw.replace(/^R\$\s*/i, ""));
  return cents === null ? null : Math.abs(cents);
}

function decimal(raw: string | undefined) {
  if (!raw) return null;
  let value = raw.trim().replace(/\s+/g, "");
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(value)) {
    value = value.replace(/\./g, "").replace(",", ".");
  } else if (value.includes(",")) {
    value = value.replace(/\./g, "").replace(",", ".");
  }
  if (!/^\d+(?:\.\d{1,8})?$/.test(value)) return null;
  const parts = value.split(".");
  const whole = parts[0] ?? "0";
  const fraction = (parts[1] ?? "").replace(/0+$/, "");
  return fraction
    ? BigInt(whole).toString() + "." + fraction
    : BigInt(whole).toString();
}

function cnpjs(value: string) {
  return [...value.matchAll(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/g)].map(
    (match) => match[1]!,
  );
}

function detectInstitutionCnpj(lines: string[]) {
  for (let index = 0; index < lines.length; index += 1) {
    if (!/NUBANK|NU PAGAMENTOS|NU INVESTIMENTOS/i.test(lines[index]!)) continue;
    const nearby = lines.slice(index, index + 4).join(" ");
    const candidate = cnpjs(nearby)[0];
    if (candidate) return candidate;
  }
  return cnpjs(lines.join(" "))[0] ?? null;
}

function calendarYear(text: string) {
  const patterns = [
    /ANO[-\s]?CALEND[AÁ]RIO\s*[:\-]?\s*(20\d{2})/i,
    /ANO\s+BASE\s*[:\-]?\s*(20\d{2})/i,
    /INFORME[^\n]{0,80}\b(20\d{2})\b/i,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return Number(match[1]);
  }
  return 0;
}

function candidateSymbol(line: string, following: string) {
  const ticker = /\b([A-Z]{4}\d{1,2})\b/.exec(line)?.[1];
  if (ticker) return ticker;

  const crypto = /^([A-Z]{2,10})(?:\s+[-–—]\s+.+)?$/.exec(line)?.[1] ?? null;
  if (
    crypto &&
    !["CNPJ", "CPF", "IRRF", "RDB", "FII", "BRL", "ANO", "TOTAL", "SALDO", "CRIPTO", "CRYPTO"].includes(crypto) &&
    /QUANTIDADE|CUSTO DE AQUISICAO|CRIPTO|CRYPTO/.test(fold(following))
  ) {
    return crypto;
  }
  return null;
}

function isPositionHeader(line: string, following: string) {
  return (
    /RDB|CONTA NUBANK|CONTA DO NUBANK/i.test(line) ||
    candidateSymbol(line, following) !== null
  );
}

function valueForYear(
  block: string,
  label: "QUANTIDADE",
  year: number,
): string | null;
function valueForYear(
  block: string,
  label: "SALDO" | "CUSTO",
  year: number,
): number | null;
function valueForYear(
  block: string,
  label: "QUANTIDADE" | "SALDO" | "CUSTO",
  year: number,
): string | number | null {
  const labelPattern =
    label === "QUANTIDADE"
      ? "QUANTIDADE"
      : label === "SALDO"
        ? "SALDO"
        : "CUSTO\\s+DE\\s+AQUISI[CÇ][AÃ]O";
  const patterns = [
    new RegExp(
      labelPattern +
        "[^\\n]{0,40}31\\/12\\/" +
        String(year) +
        "[^\\d]{0,20}([\\d.]+(?:,\\d+)?)",
      "i",
    ),
    new RegExp(
      "31\\/12\\/" +
        String(year) +
        "[^\\n]{0,40}" +
        labelPattern +
        "[^\\d]{0,20}([\\d.]+(?:,\\d+)?)",
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const raw = pattern.exec(block)?.[1];
    if (!raw) continue;
    return label === "QUANTIDADE" ? decimal(raw) : money(raw);
  }
  return null;
}

function unlabeledCurrentCost(block: string) {
  const raw =
    /CUSTO\s+DE\s+AQUISI[CÇ][AÃ]O[^\d]{0,30}R?\$?\s*([\d.]+,\d{2})/i.exec(block)?.[1] ??
    /VALOR\s+DE\s+AQUISI[CÇ][AÃ]O[^\d]{0,30}R?\$?\s*([\d.]+,\d{2})/i.exec(block)?.[1];
  return money(raw);
}

function blockIncome(
  blockLines: string[],
  symbol: string | null,
  description: string,
) {
  const results: ParsedAnnualFinancialStatementIncome[] = [];
  for (let index = 0; index < blockLines.length; index += 1) {
    const line = blockLines[index]!;
    if (!/RENDIMENTO|DIVIDENDO|PROVENTO|JUROS/i.test(line)) continue;
    if (/INFORME DE RENDIMENTOS/i.test(line)) continue;
    const raw =
      /R\$\s*([\d.]+,\d{2})/i.exec(line)?.[1] ??
      /([\d.]+,\d{2})\s*$/.exec(line)?.[1] ??
      /R\$\s*([\d.]+,\d{2})/i.exec(blockLines[index + 1] ?? "")?.[1];
    const amountCents = money(raw);
    if (amountCents === null) continue;
    const folded = fold(line);
    results.push({
      symbol,
      description: normalize(line) || description,
      incomeType: /DIVIDENDO/.test(folded)
        ? "DIVIDEND"
        : /JUROS|RENDIMENTO/.test(folded)
          ? "INTEREST"
          : "INCOME",
      currency: "BRL",
      amountCents,
      payerName: null,
      payerCnpj: null,
      category: normalize(line),
    });
  }
  return results;
}

function inferPositionType(block: string, symbol: string | null) {
  const value = fold(block);
  if (
    /CRIPTO|CRYPTO|BITCOIN|ETHEREUM/.test(value) ||
    ["QNT", "BTC", "ETH"].includes(symbol ?? "")
  ) {
    return "CRYPTO" as const;
  }
  if (/RDB|CDB|RENDA FIXA/.test(value)) return "FIXED_INCOME" as const;
  if (/CONTA NUBANK|CONTA DO NUBANK/.test(value) && !symbol) {
    return "CASH" as const;
  }
  if (symbol && /11$/.test(symbol)) return "FII" as const;
  return "OTHER" as const;
}

function dedupeIncomes(incomes: ParsedAnnualFinancialStatementIncome[]) {
  const seen = new Set<string>();
  return incomes.filter((item) => {
    const key = [
      item.symbol ?? "",
      item.amountCents ?? "",
      fold(item.description),
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Informe em tabelas (modelo atual do Nubank): cada produto traz uma tabela com cabeçalho próprio, sem rótulos
 * "Quantidade em 31/12". Os cabeçalhos identificam a tabela; as linhas seguintes trazem os valores por coluna.
 */
function parseTableSections(lines: string[], fallbackCnpj: string | null) {
  const positions: ParsedAnnualFinancialStatementPosition[] = [];
  const incomes: ParsedAnnualFinancialStatementIncome[] = [];
  const isMoneyCell = (cell: string | undefined) => !!cell && /^R\$\s*[\d.]+,\d{2}$/.test(cell);

  // Contexto mais próximo acima da tabela: "Fonte pagadora: X", "CNPJ: Y", "CNPJ do custodiante: Y".
  const contextAbove = (index: number) => {
    let payer: string | null = null;
    let cnpj: string | null = null;
    for (let cursor = index - 1; cursor >= Math.max(0, index - 30); cursor -= 1) {
      const line = lines[cursor]!;
      if (!payer) payer = /^Fonte pagadora:\s*(.+)$/i.exec(line)?.[1]?.trim() ?? null;
      if (!cnpj) cnpj = /^CNPJ(?: do custodiante)?:\s*(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/i.exec(line)?.[1] ?? null;
      if (/^(?:RDB e Conta|Conta Global|Criptoativos|Fundos Imobili|Rendimento de FIIs)/i.test(line)) break;
    }
    return { payer, cnpj };
  };

  const rowsAfter = (index: number, accept: (cells: string[]) => boolean) => {
    const rows: string[][] = [];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      const cells = splitCells(lines[cursor]!);
      if (cells.length === 0 || !accept(cells)) {
        // Linha de continuação do cabeçalho (ex.: "exclusiva") não encerra a tabela.
        if (rows.length === 0 && cursor - index <= 2 && cells.length <= 1) continue;
        break;
      }
      rows.push(cells);
    }
    return rows;
  };

  lines.forEach((line, index) => {
    const cells = splitCells(line);
    const head = cells[0] ?? "";
    const yearOf = (cell: string | undefined) => Number(/(20\d{2})/.exec(cell ?? "")?.[1] ?? 0);

    // RDB e Conta do Nubank: agência, conta, saldo nas duas datas e rendimento de tributação exclusiva.
    if (/^Ag[eê]ncia$/i.test(head) && /^Conta$/i.test(cells[1] ?? "")) {
      const { payer, cnpj } = contextAbove(index);
      for (const row of rowsAfter(index, (value) => /^\d+$/.test(value[0] ?? "") && value.some(isMoneyCell))) {
        const [agency, account, previousBalance, currentBalance, income] = row;
        positions.push({
          type: "FIXED_INCOME",
          symbol: null,
          description: `RDB e Conta do Nubank · agência ${agency} conta ${account}`,
          currency: "BRL",
          previousYearQuantity: null,
          currentYearQuantity: null,
          previousYearCostCents: null,
          currentYearCostCents: null,
          previousYearBalanceCents: money(previousBalance),
          currentYearBalanceCents: money(currentBalance),
          sourceInstitution: payer ?? "Nu Financeira",
          sourceInstitutionCnpj: cnpj ?? fallbackCnpj,
          category: "RDB e Conta do Nubank",
        });
        const incomeCents = money(income);
        if (incomeCents !== null) {
          incomes.push({
            symbol: null,
            description: "Rendimento de RDB e Conta do Nubank (tributação exclusiva)",
            incomeType: "INTEREST",
            currency: "BRL",
            amountCents: incomeCents,
            payerName: payer ?? "Nu Financeira",
            payerCnpj: cnpj ?? fallbackCnpj,
            category: "RDB e Conta do Nubank",
          });
        }
      }
      return;
    }

    // Posição de FIIs: cotas no fim de cada ano.
    if (/^C[oó]digo de Negocia[cç][aã]o$/i.test(head) && /^Cotas em/i.test(cells[1] ?? "")) {
      const previousFirst = yearOf(cells[1]) <= yearOf(cells[2]);
      for (const row of rowsAfter(index, (value) => /^[A-Z]{4}\d{1,2}$/.test(value[0] ?? "") && value.length >= 3)) {
        const first = decimal(row[1]);
        const second = decimal(row[2]);
        positions.push({
          type: "FII",
          symbol: row[0]!,
          description: `Cotas de ${row[0]}`,
          currency: "BRL",
          previousYearQuantity: previousFirst ? first : second,
          currentYearQuantity: previousFirst ? second : first,
          previousYearCostCents: null,
          currentYearCostCents: null,
          previousYearBalanceCents: null,
          currentYearBalanceCents: null,
          sourceInstitution: "Nu Investimentos",
          sourceInstitutionCnpj: fallbackCnpj,
          category: "Fundos Imobiliários (FIIs)",
        });
      }
      return;
    }

    // Rendimentos de FIIs, FIAgro e FI-Infra: valor total recebido no ano.
    if (/^C[oó]digo de Negocia[cç][aã]o$/i.test(head) && /^Valor total$/i.test(cells[1] ?? "")) {
      for (const row of rowsAfter(index, (value) => /^[A-Z]{4}\d{1,2}$/.test(value[0] ?? "") && isMoneyCell(value[1]))) {
        incomes.push({
          symbol: row[0]!,
          description: `Rendimento de FIIs · ${row[0]}`,
          incomeType: "INCOME",
          currency: "BRL",
          amountCents: money(row[1]),
          payerName: null,
          payerCnpj: null,
          category: "Rendimento de FIIs, FIAgro e FI-Infra",
        });
      }
      return;
    }

    // Criptoativos: quantidade e custo de aquisição nos dois anos.
    if (/^Criptoativo$/i.test(head) && /^Quantidade em/i.test(cells[1] ?? "")) {
      const previousFirst = yearOf(cells[1]) <= yearOf(cells[3]);
      const { cnpj } = contextAbove(index);
      for (const row of rowsAfter(index, (value) => /^[A-Z0-9]{2,10}$/.test(value[0] ?? "") && value.length >= 5)) {
        const firstQuantity = decimal(row[1]);
        const firstCost = money(row[2]);
        const secondQuantity = decimal(row[3]);
        const secondCost = money(row[4]);
        positions.push({
          type: "CRYPTO",
          symbol: row[0]!,
          description: `Criptoativo ${row[0]}`,
          currency: "BRL",
          previousYearQuantity: previousFirst ? firstQuantity : secondQuantity,
          currentYearQuantity: previousFirst ? secondQuantity : firstQuantity,
          previousYearCostCents: previousFirst ? firstCost : secondCost,
          currentYearCostCents: previousFirst ? secondCost : firstCost,
          previousYearBalanceCents: null,
          currentYearBalanceCents: null,
          sourceInstitution: "Nu Cripto",
          sourceInstitutionCnpj: cnpj ?? fallbackCnpj,
          category: "Criptoativos",
        });
      }
    }
  });

  return { positions, incomes };
}

export function parseNubankAnnualFinancialStatementText(
  text: string,
): ParsedAnnualFinancialTaxStatement {
  const raw = text.replace(/\r/g, "\n");
  const folded = fold(raw);
  if (
    !/NUBANK|NU PAGAMENTOS|NU INVESTIMENTOS/.test(folded) ||
    !/INFORME|RENDIMENTOS|ANO-CALENDARIO/.test(folded)
  ) {
    throw new Error("ANNUAL_FINANCIAL_STATEMENT_NOT_RECOGNIZED");
  }

  const lines = raw
    .split(/\n+/)
    .map(normalize)
    .filter(Boolean);
  const year = calendarYear(raw);
  const institution = /NU INVESTIMENTOS/i.test(raw)
    ? "Nu Investimentos"
    : "Nubank";
  const institutionCnpj = detectInstitutionCnpj(lines);
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!year) errors.push("Ano-calendário não reconhecido.");
  if (!institutionCnpj) warnings.push("CNPJ da instituição não reconhecido.");

  const positions: ParsedAnnualFinancialStatementPosition[] = [];
  const incomes: ParsedAnnualFinancialStatementIncome[] = [];
  const previousYear = year > 0 ? year - 1 : 0;

  for (let index = 0; index < lines.length; index += 1) {
    const following = lines.slice(index + 1, index + 7).join("\n");
    const line = lines[index]!;
    if (!isPositionHeader(line, following)) continue;

    let end = Math.min(lines.length, index + 14);
    for (
      let cursor = index + 1;
      cursor < Math.min(lines.length, index + 14);
      cursor += 1
    ) {
      const cursorFollowing = lines.slice(cursor + 1, cursor + 7).join("\n");
      if (isPositionHeader(lines[cursor]!, cursorFollowing)) {
        end = cursor;
        break;
      }
      if (/^RENDIMENTOS\b|^PROVENTOS\b/i.test(lines[cursor]!)) {
        end = cursor;
        break;
      }
    }

    const blockLines = lines.slice(index, end);
    const block = blockLines.join("\n");
    const symbol = candidateSymbol(line, following);
    const description = normalize(line);

    const previousYearQuantity = previousYear
      ? valueForYear(block, "QUANTIDADE", previousYear)
      : null;
    const currentYearQuantity = year
      ? valueForYear(block, "QUANTIDADE", year)
      : null;
    const previousYearBalanceCents = previousYear
      ? valueForYear(block, "SALDO", previousYear)
      : null;
    const currentYearBalanceCents = year
      ? valueForYear(block, "SALDO", year)
      : null;
    const previousYearCostCents = previousYear
      ? valueForYear(block, "CUSTO", previousYear)
      : null;
    const currentYearCostCents =
      (year ? valueForYear(block, "CUSTO", year) : null) ??
      unlabeledCurrentCost(block);

    if (
      previousYearQuantity === null &&
      currentYearQuantity === null &&
      previousYearBalanceCents === null &&
      currentYearBalanceCents === null &&
      previousYearCostCents === null &&
      currentYearCostCents === null
    ) {
      continue;
    }

    positions.push({
      type: inferPositionType(block, symbol),
      symbol,
      description,
      currency: "BRL",
      previousYearQuantity,
      currentYearQuantity,
      previousYearCostCents,
      currentYearCostCents,
      previousYearBalanceCents,
      currentYearBalanceCents,
      sourceInstitution: institution,
      sourceInstitutionCnpj: institutionCnpj,
      category:
        blockLines.find((item) =>
          /BENS E DIREITOS|RENDA FIXA|CRIPTO|FUNDO IMOBILIARIO|FII/i.test(item),
        ) ?? null,
    });

    incomes.push(...blockIncome(blockLines, symbol, description));
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;
    const symbol =
      /\b([A-Z]{4}\d{1,2})\b/.exec(line)?.[1] ??
      (/\b(QNT|BTC|ETH)\b/.exec(line)?.[1] ?? null);
    if (!symbol) continue;
    const window = lines.slice(index, index + 5);
    incomes.push(...blockIncome(window, symbol, line));
  }

  // As tabelas dependem do espaçamento entre colunas, que `normalize` colapsa: usam as linhas só com trim.
  const tableLines = raw.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const tables = parseTableSections(tableLines, institutionCnpj);
  positions.push(...tables.positions);
  incomes.push(...tables.incomes);

  const taxWithholdings: ParsedAnnualFinancialStatementTaxWithholding[] = [];
  for (const line of lines) {
    if (!/IRRF|IMPOSTO.*RETIDO/i.test(line)) continue;
    const rawMoney = /R\$\s*([\d.]+,\d{2})/i.exec(line)?.[1];
    if (!rawMoney) continue;
    taxWithholdings.push({
      symbol:
        /\b([A-Z]{4}\d{1,2}|QNT|BTC|ETH)\b/.exec(line)?.[1] ?? null,
      description: line,
      currency: "BRL",
      amountCents: money(rawMoney),
    });
  }

  const normalizedIncomes = dedupeIncomes(incomes);
  if (positions.length === 0) {
    warnings.push("Nenhuma posição patrimonial reconhecida no documento.");
  }
  if (normalizedIncomes.length === 0) {
    warnings.push("Nenhum rendimento anual reconhecido no documento.");
  }

  const notes = lines.filter((line) =>
    /DECLARAR|BENS E DIREITOS|RENDIMENTOS ISENTOS|TRIBUTA[CÇ][AÃ]O EXCLUSIVA/i.test(
      line,
    ),
  );

  return {
    calendarYear: year,
    sourceInstitution: institution,
    sourceInstitutionCnpj: institutionCnpj,
    documentType: "NUBANK_ANNUAL_FINANCIAL_STATEMENT",
    positions,
    incomes: normalizedIncomes,
    taxWithholdings,
    notes,
    warnings,
    errors,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export function annualFinancialStatementFingerprint(
  userId: string,
  statement: ParsedAnnualFinancialTaxStatement,
) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize({ userId, statement })))
    .digest("hex");
}
