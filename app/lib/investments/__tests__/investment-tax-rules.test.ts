import { describe, expect, it } from "vitest";

import { deriveVersionedInvestmentTax } from "@/app/lib/investments/investment-tax-apuration-domain";
import {
  getInvestmentTaxClassRule,
  getInvestmentTaxRuleSet,
  supportedInvestmentTaxYears,
} from "@/app/lib/investments/investment-tax-rules";

describe("investment tax rules", () => {
  it("lists supported calendar years explicitly", () => {
    expect(supportedInvestmentTaxYears()).toEqual([2025, 2026]);
  });

  it("selects the 2025 calendar-year rule set for exercise 2026", () => {
    const rules = getInvestmentTaxRuleSet(2025);

    expect(rules).toMatchObject({
      calendarYear: 2025,
      taxExercise: 2026,
      darfCode: "6015",
      minimumDarfCents: 1_000,
    });
    expect(getInvestmentTaxClassRule(2025, "STOCK")).toMatchObject({
      taxGroup: "GENERAL",
      commonOperationRateBps: 1_500,
      monthlySalesExemptionCents: 2_000_000,
    });
    expect(getInvestmentTaxClassRule(2025, "FII")).toMatchObject({
      taxGroup: "FII_FIAGRO",
      commonOperationRateBps: 2_000,
      monthlySalesExemptionCents: null,
    });
  });

  it("selects the 2026 calendar-year rule set for exercise 2027", () => {
    const rules = getInvestmentTaxRuleSet(2026);

    expect(rules).toMatchObject({
      calendarYear: 2026,
      taxExercise: 2027,
      darfCode: "6015",
      minimumDarfCents: 1_000,
    });
    expect(getInvestmentTaxClassRule(2026, "STOCK")).toMatchObject({
      taxGroup: "GENERAL",
      commonOperationRateBps: 1_500,
      monthlySalesExemptionCents: 2_000_000,
    });
    expect(getInvestmentTaxClassRule(2026, "ETF")).toMatchObject({
      taxGroup: "GENERAL",
      commonOperationRateBps: 1_500,
      monthlySalesExemptionCents: null,
    });
    expect(getInvestmentTaxClassRule(2026, "FII")).toMatchObject({
      taxGroup: "FII_FIAGRO",
      commonOperationRateBps: 2_000,
      monthlySalesExemptionCents: null,
    });
  });

  it("applies the 2026 stock exemption and keeps ETF and FII taxable", () => {
    const report = deriveVersionedInvestmentTax({
      calendarYear: 2026,
      monthlyResults: [
        {
          year: 2026,
          month: 1,
          assetType: "STOCK",
          currency: "BRL",
          grossProceedsCents: 2_000_000,
          realizedResultCents: 100_000,
          status: "OK",
        },
        {
          year: 2026,
          month: 2,
          assetType: "ETF",
          currency: "BRL",
          grossProceedsCents: 100_000,
          realizedResultCents: 10_000,
          status: "OK",
        },
        {
          year: 2026,
          month: 3,
          assetType: "FII",
          currency: "BRL",
          grossProceedsCents: 100_000,
          realizedResultCents: 10_000,
          status: "OK",
        },
      ],
      lossAdjustments: [],
      withholdings: [],
      payments: [],
    });

    expect(report.supported).toBe(true);
    expect(report.taxExercise).toBe(2027);
    expect(report.rows[0]).toMatchObject({
      month: 1,
      taxGroup: "GENERAL",
      exemptResultCents: 100_000,
      taxDueCents: 0,
      status: "EXEMPT",
    });
    expect(report.rows[1]).toMatchObject({
      month: 2,
      taxGroup: "GENERAL",
      grossTaxCents: 1_500,
      taxDueCents: 1_500,
      minimumDarfCents: 1_000,
      status: "OPEN",
    });
    expect(report.rows[2]).toMatchObject({
      month: 3,
      taxGroup: "FII_FIAGRO",
      grossTaxCents: 2_000,
      taxDueCents: 2_000,
      minimumDarfCents: 1_000,
      status: "OPEN",
    });
  });

  it("does not silently reuse 2026 rules for calendar year 2027", () => {
    expect(getInvestmentTaxRuleSet(2027)).toBeNull();
    expect(getInvestmentTaxClassRule(2027, "FII")).toBeNull();

    const report = deriveVersionedInvestmentTax({
      calendarYear: 2027,
      monthlyResults: [
        {
          year: 2027,
          month: 1,
          assetType: "FII",
          currency: "BRL",
          grossProceedsCents: 100_000,
          realizedResultCents: 10_000,
          status: "OK",
        },
      ],
      lossAdjustments: [],
      withholdings: [],
      payments: [],
    });

    expect(report.supported).toBe(false);
    expect(report.taxExercise).toBe(2028);
    expect(report.rows).toEqual([]);
  });

  it("applies the stock monthly-sales exemption and keeps ETF taxable", () => {
    const report = deriveVersionedInvestmentTax({
      calendarYear: 2025,
      monthlyResults: [
        {
          year: 2025,
          month: 1,
          assetType: "STOCK",
          currency: "BRL",
          grossProceedsCents: 1_900_000,
          realizedResultCents: 100_000,
          status: "OK",
        },
        {
          year: 2025,
          month: 2,
          assetType: "ETF",
          currency: "BRL",
          grossProceedsCents: 100_000,
          realizedResultCents: 10_000,
          status: "OK",
        },
      ],
      lossAdjustments: [],
      withholdings: [],
      payments: [],
    });

    expect(report.rows[0]).toMatchObject({
      month: 1,
      taxGroup: "GENERAL",
      exemptResultCents: 100_000,
      taxDueCents: 0,
      status: "EXEMPT",
    });
    expect(report.rows[1]).toMatchObject({
      month: 2,
      taxGroup: "GENERAL",
      taxableResultAfterCompensationCents: 10_000,
      grossTaxCents: 1_500,
      taxDueCents: 1_500,
      openTaxBalanceCents: 1_500,
      status: "OPEN",
    });
  });

  it("applies 20 percent to FII and carries IRRF credit forward", () => {
    const report = deriveVersionedInvestmentTax({
      calendarYear: 2025,
      monthlyResults: [
        {
          year: 2025,
          month: 1,
          assetType: "FII",
          currency: "BRL",
          grossProceedsCents: 100_000,
          realizedResultCents: 5_000,
          status: "OK",
        },
        {
          year: 2025,
          month: 2,
          assetType: "FII",
          currency: "BRL",
          grossProceedsCents: 100_000,
          realizedResultCents: 10_000,
          status: "OK",
        },
      ],
      lossAdjustments: [],
      withholdings: [
        {
          id: "irrf-1",
          year: 2025,
          month: 1,
          assetType: "FII",
          currency: "BRL",
          amountCents: 1_500,
        },
      ],
      payments: [],
    });

    expect(report.rows[0]).toMatchObject({
      grossTaxCents: 1_000,
      withholdingAppliedCents: 1_000,
      withholdingCarryforwardCents: 500,
      taxDueCents: 0,
      openTaxBalanceCents: 0,
      status: "OK",
    });
    expect(report.rows[1]).toMatchObject({
      grossTaxCents: 2_000,
      withholdingAppliedCents: 500,
      taxDueCents: 1_500,
      openTaxBalanceCents: 1_500,
      status: "OPEN",
    });
  });

  it("carries tax below the minimum DARF into the next competence", () => {
    const report = deriveVersionedInvestmentTax({
      calendarYear: 2025,
      monthlyResults: [
        {
          year: 2025,
          month: 1,
          assetType: "FII",
          currency: "BRL",
          grossProceedsCents: 50_000,
          realizedResultCents: 4_000,
          status: "OK",
        },
        {
          year: 2025,
          month: 2,
          assetType: "FII",
          currency: "BRL",
          grossProceedsCents: 50_000,
          realizedResultCents: 2_000,
          status: "OK",
        },
      ],
      lossAdjustments: [],
      withholdings: [],
      payments: [],
    });

    expect(report.rows[0]).toMatchObject({
      taxDueCents: 800,
      openTaxBalanceCents: 800,
      minimumDarfCents: 1_000,
      status: "BELOW_MINIMUM",
    });
    expect(report.rows[1]).toMatchObject({
      taxDueCents: 400,
      openTaxBalanceCents: 1_200,
      status: "OPEN",
    });
  });

  it("keeps foreign currencies out of the Brazilian monthly tax engine", () => {
    const report = deriveVersionedInvestmentTax({
      calendarYear: 2026,
      monthlyResults: [
        {
          year: 2026,
          month: 1,
          assetType: "STOCK",
          currency: "USD",
          grossProceedsCents: 1_000_000,
          realizedResultCents: 100_000,
          status: "OK",
        },
        {
          year: 2026,
          month: 2,
          assetType: "ETF",
          currency: "EUR",
          grossProceedsCents: 500_000,
          realizedResultCents: 50_000,
          status: "OK",
        },
      ],
      lossAdjustments: [],
      withholdings: [
        {
          id: "foreign-irrf",
          year: 2026,
          month: 1,
          assetType: "STOCK",
          currency: "USD",
          amountCents: 1_000,
        },
      ],
      payments: [
        {
          id: "foreign-darf",
          competenceYear: 2026,
          competenceMonth: 2,
          assetType: "ETF",
          currency: "EUR",
          amountCents: 2_000,
        },
      ],
    });

    expect(report.supported).toBe(true);
    expect(report.rows).toEqual([]);
    expect(report.unsupportedClasses).toEqual([]);
    expect(report.unsupportedCurrencies).toEqual(["EUR", "USD"]);
  });

  it("keeps unsupported asset classes explicit", () => {
    const report = deriveVersionedInvestmentTax({
      calendarYear: 2025,
      monthlyResults: [
        {
          year: 2025,
          month: 1,
          assetType: "CRYPTO",
          currency: "BRL",
          grossProceedsCents: 100_000,
          realizedResultCents: 10_000,
          status: "OK",
        },
      ],
      lossAdjustments: [],
      withholdings: [],
      payments: [],
    });

    expect(report.supported).toBe(true);
    expect(report.unsupportedClasses).toEqual(["CRYPTO"]);
    expect(report.rows).toEqual([]);
  });
});
