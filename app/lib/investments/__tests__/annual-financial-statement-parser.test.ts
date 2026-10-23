import { describe, expect, it } from "vitest";

import {
  annualFinancialStatementFingerprint,
  parseNubankAnnualFinancialStatementText,
} from "@/app/lib/investments/annual-financial-statement-parser";

const fixture = `
Informe de Rendimentos Financeiros
Nubank
CNPJ: 18.236.120/0001-58
Ano-calendário: 2025

Bens e Direitos
RDB / Conta Nubank
Saldo em 31/12/2024: R$ 1.234,56
Saldo em 31/12/2025: R$ 2.345,67
Rendimento informado: R$ 123,45

MXRF11
Fundo Imobiliário
Quantidade em 31/12/2024: 2.000
Quantidade em 31/12/2025: 2.100
Rendimentos isentos: R$ 840,00

VGIR11
FII
Quantidade em 31/12/2024: 150
Quantidade em 31/12/2025: 175
Dividendos: R$ 210,50

QNT
Cripto
Quantidade em 31/12/2025: 0,12041
Custo de aquisição: R$ 60,00
`;

describe("Nubank annual financial statement parser", () => {
  it("extracts annual checkpoint positions and incomes without inventing missing values", () => {
    const parsed = parseNubankAnnualFinancialStatementText(fixture);

    expect(parsed).toMatchObject({
      calendarYear: 2025,
      sourceInstitution: "Nubank",
      sourceInstitutionCnpj: "18.236.120/0001-58",
      documentType: "NUBANK_ANNUAL_FINANCIAL_STATEMENT",
      errors: [],
    });

    expect(parsed.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "FIXED_INCOME",
          symbol: null,
          previousYearBalanceCents: 123456,
          currentYearBalanceCents: 234567,
        }),
        expect.objectContaining({
          type: "FII",
          symbol: "MXRF11",
          previousYearQuantity: "2000",
          currentYearQuantity: "2100",
          currentYearCostCents: null,
        }),
        expect.objectContaining({
          type: "FII",
          symbol: "VGIR11",
          currentYearQuantity: "175",
        }),
        expect.objectContaining({
          type: "CRYPTO",
          symbol: "QNT",
          currentYearQuantity: "0.12041",
          currentYearCostCents: 6000,
        }),
      ]),
    );

    expect(parsed.incomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: null,
          amountCents: 12345,
        }),
        expect.objectContaining({
          symbol: "MXRF11",
          amountCents: 84000,
        }),
        expect.objectContaining({
          symbol: "VGIR11",
          amountCents: 21050,
        }),
      ]),
    );
  });

  it("keeps a partially recognized document importable with explicit warnings", () => {
    const parsed = parseNubankAnnualFinancialStatementText(`
      Informe de Rendimentos Financeiros
      Nubank
      Ano-calendário: 2025
      MXRF11
      Quantidade em 31/12/2025: 10
    `);

    expect(parsed.positions).toHaveLength(1);
    expect(parsed.incomes).toHaveLength(0);
    expect(parsed.warnings).toContain(
      "CNPJ da instituição não reconhecido.",
    );
    expect(parsed.warnings).toContain(
      "Nenhum rendimento anual reconhecido no documento.",
    );
    expect(parsed.errors).toEqual([]);
  });

  it("rejects unrelated PDFs", () => {
    expect(() =>
      parseNubankAnnualFinancialStatementText("Documento bancário genérico"),
    ).toThrow("ANNUAL_FINANCIAL_STATEMENT_NOT_RECOGNIZED");
  });

  it("fingerprints the same statement per owner deterministically", () => {
    const parsed = parseNubankAnnualFinancialStatementText(fixture);
    expect(annualFinancialStatementFingerprint("user-a", parsed)).toBe(
      annualFinancialStatementFingerprint("user-a", parsed),
    );
    expect(annualFinancialStatementFingerprint("user-a", parsed)).not.toBe(
      annualFinancialStatementFingerprint("user-b", parsed),
    );
  });
});

describe("informe do Nubank em tabelas", () => {
  /** Colunas separadas por 3 espaços, como na leitura por posição do PDF; dados fictícios. */
  const tableFixture = [
    "Informe de Rendimentos Financeiros",
    "Ano-Calendário 2025",
    "Imposto de renda - Pessoa Física",
    "RDB e Conta do Nubank",
    "Fonte pagadora: Nu Financeira",
    "CNPJ: 30.680.829/0001-43",
    "Agência   Conta   31/12/2024   31/12/2025",
    "Rendimento tributação",
    "exclusiva",
    "0001   1234567-8   R$ 2.687,24   R$ 19.819,08   R$ 21,10",
    "Fundos Imobiliários (FIIs)",
    "Discriminação sugerida: Cotas de [nome ativo] distribuídas na corretora Nu Investimentos, CNPJ 62.169.875/0001-79.",
    "Posição de FIIs",
    "Código de Negociação   Cotas em 2024   Cotas em 2025",
    "EXMP11   0   2100",
    "OUTR11   10   22",
    "Criptoativos",
    "CNPJ do custodiante: 18.236.120/0001-58",
    "Criptoativo   Quantidade em 2024   Custo em 2024   Quantidade em 2025   Custo em 2025",
    "QNT   0.5   R$ 10,00   0.12041   R$ 60,00",
    "Rendimento de FIIs, FIAgro e FI-Infra",
    "Código de Negociação   Valor total",
    "EXMP11   R$ 840,00",
    "OUTR11   R$ 11,44",
    "Sobre o informe de rendimentos",
  ].join("\n");

  it("lê RDB, FIIs, criptoativos e rendimentos pelos cabeçalhos das tabelas", () => {
    const parsed = parseNubankAnnualFinancialStatementText(tableFixture);

    expect(parsed.calendarYear).toBe(2025);
    expect(parsed.positions.map((position) => [position.type, position.symbol])).toEqual([
      ["FIXED_INCOME", null],
      ["FII", "EXMP11"],
      ["FII", "OUTR11"],
      ["CRYPTO", "QNT"],
    ]);
    expect(parsed.positions[0]).toMatchObject({
      previousYearBalanceCents: 268_724,
      currentYearBalanceCents: 1_981_908,
      sourceInstitution: "Nu Financeira",
      sourceInstitutionCnpj: "30.680.829/0001-43",
    });
    expect(parsed.positions[1]).toMatchObject({ previousYearQuantity: "0", currentYearQuantity: "2100" });
    expect(parsed.positions[2]).toMatchObject({ previousYearQuantity: "10", currentYearQuantity: "22" });
    expect(parsed.positions[3]).toMatchObject({
      previousYearQuantity: "0.5",
      currentYearQuantity: "0.12041",
      previousYearCostCents: 1_000,
      currentYearCostCents: 6_000,
      sourceInstitutionCnpj: "18.236.120/0001-58",
    });
    expect(parsed.incomes.map((income) => [income.symbol, income.amountCents])).toEqual([
      [null, 2_110],
      ["EXMP11", 84_000],
      ["OUTR11", 1_144],
    ]);
    expect(parsed.errors).toEqual([]);
    expect(parsed.warnings).toEqual([]);
  });

  it("inverte as colunas quando o informe lista o ano mais recente primeiro", () => {
    const swapped = tableFixture.replace("Cotas em 2024   Cotas em 2025", "Cotas em 2025   Cotas em 2024");
    const [, fii] = parseNubankAnnualFinancialStatementText(swapped).positions;
    expect(fii).toMatchObject({ previousYearQuantity: "2100", currentYearQuantity: "0" });
  });

  it("não inventa posições quando as tabelas estão vazias", () => {
    const empty = tableFixture.split("\n").filter((line) => !/^(EXMP11|OUTR11|QNT|0001)/.test(line)).join("\n");
    const parsed = parseNubankAnnualFinancialStatementText(empty);
    expect(parsed.positions).toEqual([]);
    expect(parsed.incomes).toEqual([]);
    expect(parsed.warnings).toHaveLength(2);
  });
});
