import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  getPayrollAdvanceResolutionForUser,
  resolvePayrollAdvanceForUser,
  undoPayrollAdvanceResolutionForUser,
} from "@/app/lib/payroll/payroll-advance-resolution";
import { getPayrollAnnualReconciliationForUser } from "@/app/lib/payroll/payroll-annual-reconciliation";
import { reconcilePayrollCompetence } from "@/app/lib/payroll/payroll-reconciliation";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

function fingerprint() {
  return randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64);
}

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `advance-resolution-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createRegular(
  userId: string,
  month: number,
  deductions: Array<Record<string, unknown>> = [],
) {
  return prisma.payrollDocument.create({
    data: {
      userId,
      documentType: "MONTHLY_PAYSLIP",
      paymentType: "REGULAR",
      employerName: "Empresa Teste",
      employerCnpj: "12.345.678/0001-90",
      year: 2025,
      month,
      grossIncomeCents: 100_000,
      totalEarningsCents: 100_000,
      totalDeductionsCents: 0,
      netPaidCents: 95_000,
      inssCents: 10_000,
      irrfCents: 5_000,
      earnings: [],
      deductions,
      warnings: [],
      importFingerprint: fingerprint(),
    },
  });
}

async function createAdvance(userId: string) {
  return prisma.payrollDocument.create({
    data: {
      userId,
      documentType: "PAYROLL_ADVANCE",
      paymentType: "ADVANCE",
      employerName: "Empresa Teste",
      employerCnpj: "12.345.678/0001-90",
      year: 2025,
      month: 9,
      grossIncomeCents: 50_000,
      totalEarningsCents: 50_000,
      totalDeductionsCents: 1_000,
      netPaidCents: 49_000,
      inssCents: null,
      irrfCents: 1_000,
      earnings: [],
      deductions: [],
      warnings: [],
      importFingerprint: fingerprint(),
    },
  });
}

async function createStatement(userId: string) {
  return prisma.annualEmploymentIncomeStatement.create({
    data: {
      userId,
      calendarYear: 2025,
      taxExercise: 2026,
      payerName: "Empresa Teste",
      payerTaxId: "12.345.678/0001-90",
      beneficiaryName: "Pessoa Teste",
      beneficiaryTaxId: "123.456.789-00",
      incomeNature: "Rendimentos do trabalho assalariado",
      taxableIncomeCents: 1_200_000,
      officialPensionCents: 120_000,
      complementaryPensionCents: null,
      alimonyCents: null,
      irrfCents: 61_000,
      thirteenthSalaryCents: null,
      thirteenthIrrfCents: null,
      exemptIncome: [],
      exclusiveTaxation: [],
      accumulatedIncome: [],
      notes: [],
      warnings: [],
      importFingerprint: fingerprint(),
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

describe("payroll advance manual resolution", () => {
  it("exposes candidates, resolves explicitly, unblocks annual reconciliation and can undo", async () => {
    const user = await createUser("Advance Resolution Owner");
    const regulars = [];
    for (let month = 1; month <= 12; month += 1) {
      regulars.push(
        await createRegular(
          user.id,
          month,
          month === 9
            ? [
                {
                  code: "500",
                  description: "DESC ADIANT SALAR A",
                  reference: null,
                  earningsCents: null,
                  deductionsCents: 50_000,
                },
                {
                  code: "501",
                  description: "DESC ADIANT SALAR B",
                  reference: null,
                  earningsCents: null,
                  deductionsCents: 50_000,
                },
              ]
            : [],
        ),
      );
    }
    const advance = await createAdvance(user.id);
    await createStatement(user.id);

    await reconcilePayrollCompetence({
      userId: user.id,
      employerCnpj: advance.employerCnpj,
      year: advance.year,
      month: advance.month,
    });

    const pending = await getPayrollAdvanceResolutionForUser(user.id);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({
      advanceDocumentId: advance.id,
      status: "PENDING",
      decisionSource: "AUTOMATIC",
      expectedAdvanceCents: 50_000,
    });
    expect(pending[0]?.candidates).toHaveLength(2);

    const beforeAnnual = await getPayrollAnnualReconciliationForUser(
      user.id,
      2025,
    );
    expect(beforeAnnual.status).toBe("REVIEW_REQUIRED");
    expect(
      beforeAnnual.items[0]?.components.find(
        (item) => item.key === "MONTHLY_COVERAGE",
      )?.reason,
    ).toContain("adiantamento");

    const beforeDocuments = await prisma.payrollDocument.findMany({
      where: { id: { in: [advance.id, regulars[8]!.id] } },
      select: {
        id: true,
        grossIncomeCents: true,
        totalEarningsCents: true,
        netPaidCents: true,
        deductions: true,
      },
      orderBy: { id: "asc" },
    });

    const chosen = pending[0]!.candidates[1]!;
    const resolved = await resolvePayrollAdvanceForUser(user.id, {
      advanceDocumentId: advance.id,
      regularDocumentId: chosen.regularDocumentId,
      rubricIndex: chosen.rubricIndex,
    });
    expect(resolved).toMatchObject({
      advanceDocumentId: advance.id,
      regularDocumentId: regulars[8]!.id,
      compensationCents: 50_000,
      created: true,
    });

    const link = await prisma.payrollAdvanceLink.findUniqueOrThrow({
      where: { advanceDocumentId: advance.id },
    });
    expect(link).toMatchObject({
      status: "MATCHED",
      regularDocumentId: regulars[8]!.id,
      compensationCents: 50_000,
      reason: null,
    });
    expect(link.evidence).toMatchObject({
      source: "MANUAL",
      expectedAdvanceCents: 50_000,
      selectedRubric: {
        regularDocumentId: regulars[8]!.id,
        rubricIndex: chosen.rubricIndex,
        compensationCents: 50_000,
      },
    });

    const afterDocuments = await prisma.payrollDocument.findMany({
      where: { id: { in: [advance.id, regulars[8]!.id] } },
      select: {
        id: true,
        grossIncomeCents: true,
        totalEarningsCents: true,
        netPaidCents: true,
        deductions: true,
      },
      orderBy: { id: "asc" },
    });
    expect(afterDocuments).toEqual(beforeDocuments);

    await reconcilePayrollCompetence({
      userId: user.id,
      employerCnpj: advance.employerCnpj,
      year: advance.year,
      month: advance.month,
    });
    const preserved = await prisma.payrollAdvanceLink.findUniqueOrThrow({
      where: { advanceDocumentId: advance.id },
    });
    expect(preserved.evidence).toMatchObject({ source: "MANUAL" });

    const afterAnnual = await getPayrollAnnualReconciliationForUser(
      user.id,
      2025,
    );
    expect(afterAnnual.status).toBe("MATCHED");

    const visibleResolved = await getPayrollAdvanceResolutionForUser(user.id);
    expect(visibleResolved[0]).toMatchObject({
      status: "MATCHED",
      decisionSource: "MANUAL",
      compensationCents: 50_000,
    });

    const undone = await undoPayrollAdvanceResolutionForUser(
      user.id,
      advance.id,
    );
    expect(undone).toEqual({ removed: true, status: "PENDING" });

    const afterUndo = await prisma.payrollAdvanceLink.findUniqueOrThrow({
      where: { advanceDocumentId: advance.id },
    });
    expect(afterUndo.status).toBe("PENDING");
    expect(await getPayrollAnnualReconciliationForUser(user.id, 2025)).toMatchObject({
      status: "REVIEW_REQUIRED",
    });
  });

  it("rejects documents owned by another user", async () => {
    const owner = await createUser("Advance Owner");
    const other = await createUser("Advance Other");
    const regular = await createRegular(owner.id, 9, [
      {
        description: "ADIANTAMENTO SALARIAL",
        deductionsCents: 50_000,
      },
    ]);
    const advance = await createAdvance(owner.id);

    await expect(
      resolvePayrollAdvanceForUser(other.id, {
        advanceDocumentId: advance.id,
        regularDocumentId: regular.id,
        rubricIndex: 0,
      }),
    ).rejects.toMatchObject({
      message: "Adiantamento ativo não encontrado",
      status: 404,
    });
  });
});
