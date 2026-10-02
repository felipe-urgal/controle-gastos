import { describe, expect, it } from "vitest";

import {
  isAnnualEmploymentIncomeStatement,
  parseAnnualEmploymentIncomeStatement,
} from "@/app/lib/payroll/annual-income-statement-parser";

const sample = [
  "COMPROVANTE DE RENDIMENTOS PAGOS E DE IMPOSTO SOBRE A RENDA RETIDO NA FONTE",
  "ANO-CALENDÁRIO: 2025",
  "EXERCÍCIO: 2026",
  "CNPJ DA FONTE PAGADORA: 12.345.678/0001-90",
  "NOME EMPRESARIAL: EMPRESA TESTE LTDA",
  "CPF DO BENEFICIÁRIO: 123.456.789-00",
  "NOME COMPLETO: PESSOA TESTE",
  "NATUREZA DO RENDIMENTO: Rendimentos do trabalho assalariado",
  "RENDIMENTOS TRIBUTÁVEIS 89.055,37",
  "CONTRIBUIÇÃO PREVIDENCIÁRIA OFICIAL 8.120,50",
  "PREVIDÊNCIA COMPLEMENTAR 1.200,00",
  "PENSÃO ALIMENTÍCIA 0,00",
  "IMPOSTO SOBRE A RENDA RETIDO NA FONTE 9.098,07",
  "RENDIMENTOS ISENTOS E NÃO TRIBUTÁVEIS",
  "1 Abono pecuniário 2.450,00",
  "RENDIMENTOS SUJEITOS À TRIBUTAÇÃO EXCLUSIVA",
  "1 13º salário 7.242,28",
  "2 IRRF sobre 13º 850,00",
  "3 PLR 3.000,00",
  "RENDIMENTOS RECEBIDOS ACUMULADAMENTE",
  "Processo trabalhista 1.500,00",
  "INFORMAÇÕES COMPLEMENTARES",
  "Observação sanitizada para teste",
].join("\n");

describe("annual employment income statement parser", () => {
  it("detects the annual statement", () => {
    expect(isAnnualEmploymentIncomeStatement(sample)).toBe(true);
  });

  it("preserves fiscal sections without mixing categories", () => {
    const parsed = parseAnnualEmploymentIncomeStatement(sample);

    expect(parsed).toMatchObject({
      calendarYear: 2025,
      taxExercise: 2026,
      payerName: "EMPRESA TESTE LTDA",
      payerTaxId: "12.345.678/0001-90",
      beneficiaryName: "PESSOA TESTE",
      beneficiaryTaxId: "123.456.789-00",
      taxableIncomeCents: 8905537,
      officialPensionCents: 812050,
      complementaryPensionCents: 120000,
      alimonyCents: 0,
      irrfCents: 909807,
      errors: [],
    });
    expect(parsed.exemptIncome).toEqual([
      { description: "Abono pecuniário", amountCents: 245000 },
    ]);
    expect(parsed.exclusiveTaxation.some((item) => /PLR/i.test(item.description))).toBe(true);
    expect(parsed.accumulatedIncome).toEqual([
      { description: "Processo trabalhista", amountCents: 150000 },
    ]);
    expect(parsed.notes).toContain("Observação sanitizada para teste");
  });

  it("keeps absent optional values as null", () => {
    const text = [
      "COMPROVANTE DE RENDIMENTOS PAGOS",
      "ANO-CALENDÁRIO: 2025",
      "IMPOSTO SOBRE A RENDA RETIDO NA FONTE",
      "CNPJ DA FONTE PAGADORA: 12.345.678/0001-90",
      "NOME EMPRESARIAL: EMPRESA TESTE LTDA",
      "RENDIMENTOS TRIBUTÁVEIS 10.000,00",
    ].join("\n");

    const parsed = parseAnnualEmploymentIncomeStatement(text);
    expect(parsed.officialPensionCents).toBeNull();
    expect(parsed.complementaryPensionCents).toBeNull();
    expect(parsed.alimonyCents).toBeNull();
    expect(parsed.thirteenthSalaryCents).toBeNull();
  });
});
