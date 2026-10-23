import { describe, expect, it } from "vitest";

import { compareCustodyWithPortfolio } from "@/app/lib/investments/custody-statement-compare";
import { isCustodyStatement, parseNubankCustodyStatementText } from "@/app/lib/investments/custody-statement-parser";

/** Texto no formato da leitura por posição; dados fictícios. */
const statement = [
  "ExtratodeCustódia   Custódia em: 23/10/2026",
  "Pessoa física titular   CPF",
  "Maria da Silva   123.456.789-09",
  "Resumo da posição consolidada",
  "Tipo de investimento   Saldo bruto (R$)   IR (R$)   IOF (R$)   Saldo líquido (R$)",
  "Caixinhas   2.000,00   30,00   0,00   1.970,00",
  "Bolsa de Valores   1.500,00   0,00   0,00   1.500,00",
  "Total geral   3.500,00   30,00   0,00   3.470,00",
  "ExtratodeCustódia   Custódia em: 23/10/2026",
  'Caixinha "Reserva"',
  "Tipo de Ativo   Emissor   Saldo Bruto (R$)   IR (R$)   IOF (R$)   Saldo Líquido (R$)   Disponível em",
  "RDB Resgate Imediato   Nubank   2.000,00   30,00   0,00   1.970,00   No mesmo dia",
  "Total   2.000,00   30,00   0,00   1.970,00",
  "Custódia em Bolsa de Valores",
  "Tipo de Ativo   Emissor   Quantidade   Saldo bruto (R$)   Disponível em",
  "Fundo Imobiliário (FII)   Fundo Exemplo (EXMP11)   100,00   1.000,00   Até 3 dias úteis",
  "Fundo Imobiliário (FII)   Outro Fundo (OUTR11)   50,50   500,00   Até 3 dias úteis",
  "Total   1.500,00",
].join("\n");

describe("extrato de custódia", () => {
  it("reconhece o documento mesmo com o título sem espaços", () => {
    expect(isCustodyStatement("ExtratodeCustódia")).toBe(true);
    expect(isCustodyStatement("Extrato de Custódia")).toBe(true);
    expect(isCustodyStatement("Informe de rendimentos")).toBe(false);
    expect(() => parseNubankCustodyStatementText("outro documento")).toThrow("CUSTODY_STATEMENT_NOT_RECOGNIZED");
  });

  it("lê data, resumo, caixinhas e posições da bolsa", () => {
    const parsed = parseNubankCustodyStatementText(statement);

    expect(parsed.referenceDate).toBe("2026-10-23");
    expect(parsed.summary.map((row) => [row.label, row.grossCents, row.netCents])).toEqual([
      ["Caixinhas", 200_000, 197_000],
      ["Bolsa de Valores", 150_000, 150_000],
      ["Total geral", 350_000, 347_000],
    ]);
    expect(parsed.fixedIncome).toEqual([
      { caixinha: "Reserva", assetType: "RDB Resgate Imediato", issuer: "Nubank", grossCents: 200_000, irCents: 3_000, iofCents: 0, netCents: 197_000, availability: "No mesmo dia" },
    ]);
    expect(parsed.equities.map((row) => [row.symbol, row.kind, row.quantity, row.grossCents])).toEqual([
      ["EXMP11", "FII", "100", 100_000],
      ["OUTR11", "FII", "50.5", 50_000],
    ]);
    expect(parsed.equitiesTotalCents).toBe(150_000);
    expect(parsed.warnings).toEqual([]);
  });

  it("avisa quando a soma da bolsa não confere com o total", () => {
    const parsed = parseNubankCustodyStatementText(statement.replace("Total   1.500,00", "Total   9.999,00"));
    expect(parsed.warnings.join(" ")).toMatch(/não confere com o total/);
  });
});

describe("conferência com a carteira", () => {
  const parsed = parseNubankCustodyStatementText(statement);
  const position = (symbol: string, quantity: string, market: number | null, invested = 90_000, currency = "BRL") => ({
    symbol,
    currency,
    quantity,
    investedCents: invested,
    marketValueCents: market,
  });

  it("classifica igual, diferente, só no extrato e só no app", () => {
    const rows = compareCustodyWithPortfolio(parsed.equities, [position("EXMP11", "100", 100_100), position("OUTR11", "40", 40_000), position("ZZZZ11", "3", null)]);

    expect(rows.map((row) => [row.symbol, row.status])).toEqual([
      ["OUTR11", "QUANTITY_DIFFERENT"],
      ["ZZZZ11", "ONLY_IN_APP"],
      ["EXMP11", "MATCH"],
    ]);
    expect(rows[0]).toMatchObject({ statementQuantity: "50.5", appQuantity: "40", quantityDifference: "-10.5" });
  });

  it("soma contas e mantém valor de mercado desconhecido quando falta cotação", () => {
    const rows = compareCustodyWithPortfolio(parsed.equities.slice(0, 1), [position("EXMP11", "60", 60_000), position("EXMP11", "40", null)]);
    expect(rows[0]).toMatchObject({ status: "MATCH", appQuantity: "100", appMarketValueCents: null, appInvestedCents: 180_000 });
  });

  it("aponta ativo do extrato que não está na carteira e ignora outras moedas", () => {
    const rows = compareCustodyWithPortfolio(parsed.equities, [position("EXMP11", "100", 1, 1, "USD")]);
    expect(rows.map((row) => row.status)).toEqual(["ONLY_IN_STATEMENT", "ONLY_IN_STATEMENT"]);
  });
});
