import { describe, expect, it } from "vitest";

import {
  detectPayrollDocumentType,
  detectPayrollPaymentType,
  parsePayrollText,
  payrollImportFingerprint,
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

  it.each([
    ["Folha de 13º salário", "THIRTEENTH"],
    ["Recibo de férias", "VACATION"],
    ["Pagamento PLR - Participação nos Lucros", "PLR"],
  ] as const)(
    "classifies explicit special payment evidence: %s",
    (label, expected) => {
      const text = [
        "Empresa: Empresa Teste",
        "CNPJ 12.345.678/0001-90",
        "Competência: 12/2026",
        label,
        "100 PAGAMENTO ESPECIAL 1.000,00",
        "Total de Vencimentos 1.000,00",
        "Total de Descontos 0,00",
        "Valor Líquido 1.000,00",
      ].join("\n");

      expect(detectPayrollDocumentType(text)).toBe("MONTHLY_PAYSLIP");
      expect(detectPayrollPaymentType(text)).toBe(expected);
      expect(parsePayrollText(text).paymentType).toBe(expected);
    },
  );

  it("uses OTHER instead of guessing a fiscal type without explicit evidence", () => {
    const parsed = parsePayrollText([
      "Empresa: Empresa Teste",
      "CNPJ 12.345.678/0001-90",
      "Competência: 09/2026",
      "910 INSS 14 100,00",
      "Total de Vencimentos 1.000,00",
      "Total de Descontos 100,00",
      "Valor Líquido 900,00",
    ].join("\n"));

    expect(parsed.paymentType).toBe("OTHER");
    expect(parsed.warnings).toContain(
      "Tipo de pagamento não reconhecido com evidência suficiente. Revise a classificação antes de confirmar.",
    );
  });

  it("keeps a regular monthly payslip regular when it contains an advance deduction rubric", () => {
    const parsed = parsePayrollText([
      "Empresa: Empresa Teste",
      "CNPJ 12.345.678/0001-90",
      "Competência: 09/2026",
      "Folha Mensal",
      "100 DIAS NORMAIS 30 3.000,00",
      "500 ADIANTAMENTO SALARIAL 1.000,00",
      "Total de Vencimentos 3.000,00",
      "Total de Descontos 1.000,00",
      "Valor Líquido 2.000,00",
    ].join("\n"));

    expect(parsed.documentType).toBe("MONTHLY_PAYSLIP");
    expect(parsed.paymentType).toBe("REGULAR");
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

  it("fingerprints canonical content and changes on financial retification", () => {
    const base = parsePayrollText([
      "Empresa: Empresa Teste",
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
    ].join("\n"));

    const sameContentReordered = {
      ...base,
      earnings: [...base.earnings].reverse(),
      deductions: [...base.deductions].reverse(),
      warnings: ["diagnóstico diferente não muda conteúdo documental"],
    };
    const inssRetified = { ...base, inssCents: (base.inssCents ?? 0) + 1 };
    const rubricRetified = {
      ...base,
      deductions: base.deductions.map((item, index) =>
        index === 0
          ? { ...item, deductionsCents: (item.deductionsCents ?? 0) + 1 }
          : item,
      ),
    };

    const fingerprint = payrollImportFingerprint("user-1", base);
    expect(payrollImportFingerprint("user-1", sameContentReordered)).toBe(fingerprint);
    expect(payrollImportFingerprint("user-1", inssRetified)).not.toBe(fingerprint);
    expect(payrollImportFingerprint("user-1", rubricRetified)).not.toBe(fingerprint);
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
