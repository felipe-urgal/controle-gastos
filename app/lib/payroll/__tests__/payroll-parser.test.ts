import { describe, expect, it } from "vitest";

import {
  detectPayrollDocumentType,
  parsePayrollText,
} from "@/app/lib/payroll/payroll-parser";

describe("payroll parser", () => {
  it("detects and parses a monthly payslip preserving totals and rubrics", () => {
    const text = [
      "Empresa: CAIENA SOFTWARE LTDA",
      "CNPJ 12.345.678/0001-90",
      "Funcionário: Pessoa Teste",
      "Competência: 09/2026",
      "Folha Mensal",
      "100 DIAS NORMAIS 30 7.242,28",
      "910 I.N.S.S. 14 877,24",
      "920 IRRF 27,5 1.200,00",
      "Total de Vencimentos 7.242,28",
      "Total de Descontos 3.747,33",
      "Valor Líquido 3.494,95",
      "Base de IRRF 6.365,04",
      "Base de FGTS 7.242,28",
      "FGTS 579,38",
    ].join("\n");

    expect(detectPayrollDocumentType(text)).toBe("MONTHLY_PAYSLIP");
    const parsed = parsePayrollText(text);

    expect(parsed).toMatchObject({
      documentType: "MONTHLY_PAYSLIP",
      paymentType: "REGULAR",
      employerName: "CAIENA SOFTWARE LTDA",
      employerCnpj: "12.345.678/0001-90",
      employeeName: "Pessoa Teste",
      year: 2026,
      month: 9,
      totalEarningsCents: 724228,
      totalDeductionsCents: 374733,
      netPaidCents: 349495,
      irrfBaseCents: 636504,
      fgtsBaseCents: 724228,
      fgtsAmountCents: 57938,
      errors: [],
    });
    expect(parsed.earnings.some((item) => item.description === "DIAS NORMAIS")).toBe(true);
    expect(parsed.deductions.some((item) => /I\.N\.S\.S/i.test(item.description))).toBe(true);
  });

  it("detects salary advance and preserves advance IRRF", () => {
    const text = [
      "Empresa: CAIENA SOFTWARE LTDA",
      "CNPJ 12.345.678/0001-90",
      "Competência: 09/2026",
      "ADIANTAMENTO SALARIAL",
      "100 ADIANTAMENTO SALARIAL 40 2.100,00",
      "920 IRRF ADIANTAMENTO 27,5 47,40",
      "Total de Vencimentos 2.100,00",
      "Total de Descontos 47,40",
      "Valor Líquido 2.052,60",
    ].join("\n");

    const parsed = parsePayrollText(text);
    expect(parsed.documentType).toBe("PAYROLL_ADVANCE");
    expect(parsed.paymentType).toBe("ADVANCE");
    expect(parsed.irrfCents).toBe(4740);
    expect(parsed.netPaidCents).toBe(205260);
    expect(parsed.errors).toEqual([]);
  });

  it("marks inconsistent totals instead of silently correcting them", () => {
    const text = [
      "Empresa: Empresa Teste",
      "CNPJ 12.345.678/0001-90",
      "Competência: 09/2026",
      "Folha Mensal",
      "Total de Vencimentos 1.000,00",
      "Total de Descontos 100,00",
      "Valor Líquido 950,00",
    ].join("\n");

    const parsed = parsePayrollText(text);
    expect(parsed.errors).toContain(
      "Totais inconsistentes: vencimentos - descontos difere do valor líquido.",
    );
  });

  it("does not turn missing optional fiscal values into zero", () => {
    const parsed = parsePayrollText([
      "Empresa: Empresa Teste",
      "CNPJ 12.345.678/0001-90",
      "Competência: 09/2026",
      "Folha Mensal",
    ].join("\n"));

    expect(parsed.inssCents).toBeNull();
    expect(parsed.irrfCents).toBeNull();
    expect(parsed.fgtsAmountCents).toBeNull();
  });
});
