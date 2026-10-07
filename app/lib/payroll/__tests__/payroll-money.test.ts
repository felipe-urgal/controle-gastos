import { describe, expect, it } from "vitest";

import {
  assertAnnualStatementMoneyBounds,
  assertPayrollDocumentMoneyBounds,
  PAYROLL_CENTS_MAX,
  PayrollMoneyLimitError,
} from "@/app/lib/payroll/payroll-money";

describe("payroll monetary bounds", () => {
  it("accepts the Prisma Int ceiling for payroll and annual values", () => {
    expect(() =>
      assertPayrollDocumentMoneyBounds({
        salaryBaseCents: PAYROLL_CENTS_MAX,
        grossIncomeCents: PAYROLL_CENTS_MAX,
        totalEarningsCents: PAYROLL_CENTS_MAX,
        totalDeductionsCents: PAYROLL_CENTS_MAX,
        netPaidCents: PAYROLL_CENTS_MAX,
        inssCents: PAYROLL_CENTS_MAX,
        irrfCents: PAYROLL_CENTS_MAX,
        irrfBaseCents: PAYROLL_CENTS_MAX,
        fgtsBaseCents: PAYROLL_CENTS_MAX,
        fgtsAmountCents: PAYROLL_CENTS_MAX,
        earnings: [
          {
            earningsCents: PAYROLL_CENTS_MAX,
            deductionsCents: null,
          },
        ],
        deductions: [],
      }),
    ).not.toThrow();

    expect(() =>
      assertAnnualStatementMoneyBounds({
        taxableIncomeCents: PAYROLL_CENTS_MAX,
        officialPensionCents: PAYROLL_CENTS_MAX,
        complementaryPensionCents: null,
        alimonyCents: null,
        irrfCents: PAYROLL_CENTS_MAX,
        thirteenthSalaryCents: PAYROLL_CENTS_MAX,
        thirteenthIrrfCents: PAYROLL_CENTS_MAX,
        exemptIncome: [{ amountCents: PAYROLL_CENTS_MAX }],
        exclusiveTaxation: [],
        accumulatedIncome: [],
      }),
    ).not.toThrow();
  });

  it("rejects one cent above the Prisma Int ceiling before persistence", () => {
    expect(() =>
      assertPayrollDocumentMoneyBounds({
        salaryBaseCents: null,
        grossIncomeCents: PAYROLL_CENTS_MAX + 1,
        totalEarningsCents: null,
        totalDeductionsCents: null,
        netPaidCents: null,
        inssCents: null,
        irrfCents: null,
        irrfBaseCents: null,
        fgtsBaseCents: null,
        fgtsAmountCents: null,
        earnings: [],
        deductions: [],
      }),
    ).toThrow(PayrollMoneyLimitError);

    expect(() =>
      assertAnnualStatementMoneyBounds({
        taxableIncomeCents: null,
        officialPensionCents: null,
        complementaryPensionCents: null,
        alimonyCents: null,
        irrfCents: null,
        thirteenthSalaryCents: null,
        thirteenthIrrfCents: null,
        exemptIncome: [{ amountCents: PAYROLL_CENTS_MAX + 1 }],
        exclusiveTaxation: [],
        accumulatedIncome: [],
      }),
    ).toThrow(PayrollMoneyLimitError);
  });
});
