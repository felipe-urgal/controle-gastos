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
