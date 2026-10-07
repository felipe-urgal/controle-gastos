import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { getPayrollAnnualReconciliationForUser } from "@/app/lib/payroll/payroll-annual-reconciliation";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

function fingerprint() {
  return randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64);
}

async function createUser(name = "Payroll Annual Test") {
  const id = randomUUID();
  const user = await prisma.user.create({
    data: {
      name,
      email: `payroll-annual-${id}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createPayrollDocument(args: {
  userId: string;
  employerCnpj?: string;
  employerName?: string;
  month: number;
  paymentType?: "ADVANCE" | "REGULAR" | "THIRTEENTH" | "VACATION" | "PLR" | "OTHER";
  grossIncomeCents?: number | null;
  inssCents?: number | null;
  irrfCents?: number | null;
  lifecycleStatus?: "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
}) {
  const paymentType = args.paymentType ?? "REGULAR";
  return prisma.payrollDocument.create({
    data: {
      userId: args.userId,
      documentType:
        paymentType === "ADVANCE" ? "PAYROLL_ADVANCE" : "MONTHLY_PAYSLIP",
      paymentType,
      employerName: args.employerName ?? "Empresa Teste",
      employerCnpj: args.employerCnpj ?? "12.345.678/0001-90",
      year: 2025,
      month: args.month,
      grossIncomeCents: args.grossIncomeCents ?? 100_000,
      totalEarningsCents: args.grossIncomeCents ?? 100_000,
      totalDeductionsCents: 0,
      netPaidCents: args.grossIncomeCents ?? 100_000,
      inssCents: args.inssCents ?? null,
      irrfCents: args.irrfCents ?? null,
      earnings: [],
      deductions: [],
      warnings: [],
      importFingerprint: fingerprint(),
      lifecycleStatus: args.lifecycleStatus ?? "ACTIVE",
      ...(args.lifecycleStatus === "SUPERSEDED"
        ? { supersededAt: new Date() }
        : args.lifecycleStatus === "ARCHIVED"
          ? { archivedAt: new Date() }
          : {}),
    },
  });
}

async function createStatement(args: {
  userId: string;
  payerTaxId?: string;
  payerName?: string;
  taxableIncomeCents: number | null;
  officialPensionCents: number | null;
  irrfCents: number | null;
  thirteenthSalaryCents?: number | null;
  thirteenthIrrfCents?: number | null;
  exemptIncome?: Array<{ description: string; amountCents: number | null }>;
  exclusiveTaxation?: Array<{ description: string; amountCents: number | null }>;
  lifecycleStatus?: "ACTIVE" | "SUPERSEDED" | "ARCHIVED";
}) {
  return prisma.annualEmploymentIncomeStatement.create({
    data: {
      userId: args.userId,
      calendarYear: 2025,
      taxExercise: 2026,
      payerName: args.payerName ?? "Empresa Teste",
      payerTaxId: args.payerTaxId ?? "12.345.678/0001-90",
      taxableIncomeCents: args.taxableIncomeCents,
      officialPensionCents: args.officialPensionCents,
      complementaryPensionCents: null,
      alimonyCents: null,
      irrfCents: args.irrfCents,
      thirteenthSalaryCents: args.thirteenthSalaryCents ?? null,
      thirteenthIrrfCents: args.thirteenthIrrfCents ?? null,
      exemptIncome: args.exemptIncome ?? [],
      exclusiveTaxation: args.exclusiveTaxation ?? [],
      accumulatedIncome: [],
      notes: [],
      warnings: [],
      importFingerprint: fingerprint(),
      lifecycleStatus: args.lifecycleStatus ?? "ACTIVE",
      ...(args.lifecycleStatus === "SUPERSEDED"
        ? { supersededAt: new Date() }
        : args.lifecycleStatus === "ARCHIVED"
          ? { archivedAt: new Date() }
          : {}),
    },
  });
}

afterEach(async () => {
  if (userIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("payroll annual reconciliation", () => {
  it("matches a complete year and does not double count a linked advance as taxable income", async () => {
    const user = await createUser();

    const regulars: Awaited<ReturnType<typeof createPayrollDocument>>[] = [];
    for (let month = 1; month <= 12; month += 1) {
      regulars.push(
        await createPayrollDocument({
          userId: user.id,
          month,
          grossIncomeCents: 100_000,
          inssCents: 10_000,
          irrfCents: 5_000,
        }),
      );
    }

    const advance = await createPayrollDocument({
      userId: user.id,
      month: 9,
      paymentType: "ADVANCE",
      grossIncomeCents: 50_000,
      inssCents: null,
      irrfCents: 1_000,
    });
    await prisma.payrollAdvanceLink.create({
      data: {
        userId: user.id,
        advanceDocumentId: advance.id,
        regularDocumentId: regulars[8]!.id,
        status: "MATCHED",
        compensationCents: 50_000,
        evidence: {},
      },
    });

    await createStatement({
      userId: user.id,
      taxableIncomeCents: 1_200_000,
      officialPensionCents: 120_000,
      irrfCents: 61_000,
    });

    const report = await getPayrollAnnualReconciliationForUser(user.id, 2025);

    expect(report.status).toBe("MATCHED");
    expect(report.summary.reviewComponents).toBe(0);
    expect(report.items).toHaveLength(1);
    expect(report.items[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "TAXABLE_INCOME",
          status: "MATCHED",
          payrollCents: 1_200_000,
          statementCents: 1_200_000,
        }),
        expect.objectContaining({
          key: "IRRF",
          status: "MATCHED",
          payrollCents: 61_000,
          statementCents: 61_000,
        }),
      ]),
    );
  });

  it("keeps IRRF and INSS divergences explicit", async () => {
    const user = await createUser();
    for (let month = 1; month <= 12; month += 1) {
      await createPayrollDocument({
        userId: user.id,
        month,
        grossIncomeCents: 100_000,
        inssCents: 10_000,
        irrfCents: 5_000,
      });
    }
    await createStatement({
      userId: user.id,
      taxableIncomeCents: 1_200_000,
      officialPensionCents: 119_000,
      irrfCents: 62_000,
    });

    const report = await getPayrollAnnualReconciliationForUser(user.id, 2025);
    const components = report.items[0]!.components;

    expect(components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "OFFICIAL_PENSION",
          status: "MISMATCH",
          differenceCents: 1_000,
        }),
        expect.objectContaining({
          key: "IRRF",
          status: "MISMATCH",
          differenceCents: -2_000,
        }),
      ]),
    );
  });

  it("marks missing monthly documents as incomplete instead of treating them as zero", async () => {
    const user = await createUser();
    for (const month of [1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      await createPayrollDocument({
        userId: user.id,
        month,
        grossIncomeCents: 100_000,
        inssCents: 10_000,
        irrfCents: 5_000,
      });
    }
    await createStatement({
      userId: user.id,
      taxableIncomeCents: 1_100_000,
      officialPensionCents: 110_000,
      irrfCents: 55_000,
    });

    const report = await getPayrollAnnualReconciliationForUser(user.id, 2025);

    expect(report.status).toBe("REVIEW_REQUIRED");
    expect(report.items[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "MONTHLY_COVERAGE",
          status: "INCOMPLETE",
          reason: expect.stringContaining("03"),
        }),
        expect.objectContaining({
          key: "TAXABLE_INCOME",
          status: "INCOMPLETE",
        }),
      ]),
    );
  });

  it("reconciles explicitly classified 13th salary and PLR", async () => {
    const user = await createUser();
    for (let month = 1; month <= 12; month += 1) {
      await createPayrollDocument({
        userId: user.id,
        month,
        grossIncomeCents: 100_000,
        inssCents: 10_000,
        irrfCents: 5_000,
      });
    }
    await createPayrollDocument({
      userId: user.id,
      month: 12,
      paymentType: "THIRTEENTH",
      grossIncomeCents: 100_000,
      inssCents: 10_000,
      irrfCents: 7_000,
    });
    await createPayrollDocument({
      userId: user.id,
      month: 6,
      paymentType: "PLR",
      grossIncomeCents: 80_000,
      inssCents: null,
      irrfCents: null,
    });
    await createStatement({
      userId: user.id,
      taxableIncomeCents: 1_200_000,
      officialPensionCents: 130_000,
      irrfCents: 60_000,
      thirteenthSalaryCents: 100_000,
      thirteenthIrrfCents: 7_000,
      exclusiveTaxation: [{ description: "PLR", amountCents: 80_000 }],
    });

    const report = await getPayrollAnnualReconciliationForUser(user.id, 2025);

    expect(report.items[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "THIRTEENTH_SALARY", status: "MATCHED" }),
        expect.objectContaining({ key: "THIRTEENTH_IRRF", status: "MATCHED" }),
        expect.objectContaining({ key: "PLR", status: "MATCHED" }),
      ]),
    );
  });

  it("surfaces vacation and OTHER as explicit annual review components", async () => {
    const user = await createUser();

    for (let month = 1; month <= 12; month += 1) {
      await createPayrollDocument({
        userId: user.id,
        month,
        grossIncomeCents: 100_000,
        inssCents: 10_000,
        irrfCents: 5_000,
      });
    }
    await createPayrollDocument({
      userId: user.id,
      month: 1,
      paymentType: "VACATION",
      grossIncomeCents: 50_000,
      inssCents: 5_000,
      irrfCents: 2_000,
    });
    await createPayrollDocument({
      userId: user.id,
      month: 3,
      paymentType: "OTHER",
      grossIncomeCents: 20_000,
    });
    await createStatement({
      userId: user.id,
      taxableIncomeCents: 1_200_000,
      officialPensionCents: 125_000,
      irrfCents: 62_000,
      exemptIncome: [{ description: "Férias / abono", amountCents: 50_000 }],
    });

    const report = await getPayrollAnnualReconciliationForUser(user.id, 2025);

    expect(report.status).toBe("REVIEW_REQUIRED");
    expect(report.items[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "VACATION_ABONO",
          status: "UNSUPPORTED_COMPONENT",
        }),
        expect.objectContaining({
          key: "OTHER_PAYMENT",
          status: "UNSUPPORTED_COMPONENT",
        }),
      ]),
    );
  });

  it("ignores superseded and archived versions in annual reconciliation", async () => {
    const user = await createUser();

    for (let month = 1; month <= 12; month += 1) {
      await createPayrollDocument({
        userId: user.id,
        month,
        grossIncomeCents: 100_000,
        inssCents: 10_000,
        irrfCents: 5_000,
      });
    }

    await createPayrollDocument({
      userId: user.id,
      month: 6,
      grossIncomeCents: 900_000,
      inssCents: 90_000,
      irrfCents: 90_000,
      lifecycleStatus: "SUPERSEDED",
    });
    await createPayrollDocument({
      userId: user.id,
      month: 7,
      grossIncomeCents: 800_000,
      inssCents: 80_000,
      irrfCents: 80_000,
      lifecycleStatus: "ARCHIVED",
    });

    await createStatement({
      userId: user.id,
      taxableIncomeCents: 999_999,
      officialPensionCents: 999_999,
      irrfCents: 999_999,
      lifecycleStatus: "SUPERSEDED",
    });
    await createStatement({
      userId: user.id,
      taxableIncomeCents: 1_200_000,
      officialPensionCents: 120_000,
      irrfCents: 60_000,
    });

    const report = await getPayrollAnnualReconciliationForUser(user.id, 2025);

    expect(report.status).toBe("MATCHED");
    expect(report.items).toHaveLength(1);
    expect(report.items[0]?.components).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "TAXABLE_INCOME",
          status: "MATCHED",
          payrollCents: 1_200_000,
          statementCents: 1_200_000,
        }),
        expect.objectContaining({
          key: "IRRF",
          status: "MATCHED",
          payrollCents: 60_000,
          statementCents: 60_000,
        }),
      ]),
    );
  });

  it("separates employers and never leaks another user's documents", async () => {
    const owner = await createUser("Owner");
    const other = await createUser("Other");

    for (let month = 1; month <= 12; month += 1) {
      await createPayrollDocument({
        userId: owner.id,
        employerCnpj: "11.111.111/0001-11",
        employerName: "Empresa A",
        month,
        grossIncomeCents: 100_000,
        inssCents: 10_000,
        irrfCents: 5_000,
      });
      await createPayrollDocument({
        userId: owner.id,
        employerCnpj: "22.222.222/0001-22",
        employerName: "Empresa B",
        month,
        grossIncomeCents: 50_000,
        inssCents: 5_000,
        irrfCents: 2_000,
      });
      await createPayrollDocument({
        userId: other.id,
        employerCnpj: "99.999.999/0001-99",
        employerName: "Empresa Externa",
        month,
        grossIncomeCents: 999_999,
      });
    }

    await createStatement({
      userId: owner.id,
      payerTaxId: "11.111.111/0001-11",
      payerName: "Empresa A",
      taxableIncomeCents: 1_200_000,
      officialPensionCents: 120_000,
      irrfCents: 60_000,
    });
    await createStatement({
      userId: owner.id,
      payerTaxId: "22.222.222/0001-22",
      payerName: "Empresa B",
      taxableIncomeCents: 600_000,
      officialPensionCents: 60_000,
      irrfCents: 24_000,
    });

    const report = await getPayrollAnnualReconciliationForUser(owner.id, 2025);

    expect(report.items).toHaveLength(2);
    expect(report.items.map((item) => item.employerName)).toEqual([
      "Empresa A",
      "Empresa B",
    ]);
    expect(report.items.some((item) => item.employerName === "Empresa Externa")).toBe(false);
  });
});
