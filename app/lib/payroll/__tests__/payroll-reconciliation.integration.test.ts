import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import {
  getPayrollCompetenceSummaries,
  reconcilePayrollCompetence,
} from "@/app/lib/payroll/payroll-reconciliation";
import { prisma } from "@/app/lib/prisma";

const users: string[] = [];

async function createUser() {
  const id = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Payroll Link Test",
      email: `payroll-link-${id}@example.com`,
      password: "test-hash",
    },
  });
  users.push(user.id);
  return user;
}

async function createAdvance(userId: string, opts?: {
  cnpj?: string;
  gross?: number | null;
  net?: number | null;
  irrf?: number | null;
}) {
  const gross = opts?.gross === undefined ? 210000 : opts.gross;
  const net = opts?.net === undefined ? 205260 : opts.net;
  const irrf = opts?.irrf === undefined ? 4740 : opts.irrf;
  return prisma.payrollDocument.create({
    data: {
      userId,
      documentType: "PAYROLL_ADVANCE",
      paymentType: "ADVANCE",
      employerName: "Empresa Teste",
      employerCnpj: opts?.cnpj ?? "12.345.678/0001-90",
      year: 2026,
      month: 9,
      grossIncomeCents: gross,
      totalEarningsCents: gross,
      totalDeductionsCents: irrf,
      netPaidCents: net,
      irrfCents: irrf,
      earnings: [],
      deductions: [],
      warnings: [],
      importFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64),
    },
  });
}

async function createRegular(userId: string, opts?: {
  cnpj?: string;
  compensation?: number;
  gross?: number | null;
  net?: number | null;
  irrf?: number | null;
}) {
  const gross = opts?.gross === undefined ? 724228 : opts.gross;
  const net = opts?.net === undefined ? 349495 : opts.net;
  const irrf = opts?.irrf === undefined ? 120000 : opts.irrf;
  return prisma.payrollDocument.create({
    data: {
      userId,
      documentType: "MONTHLY_PAYSLIP",
      paymentType: "REGULAR",
      employerName: "Empresa Teste",
      employerCnpj: opts?.cnpj ?? "12.345.678/0001-90",
      year: 2026,
      month: 9,
      grossIncomeCents: gross,
      totalEarningsCents: gross,
      totalDeductionsCents: 374733,
      netPaidCents: net,
      irrfCents: irrf,
      earnings: [],
      deductions: opts?.compensation === undefined ? [] : [
        {
          code: "500",
          description: "DESC.ADIANT.SALARIAL",
          reference: null,
          earningsCents: null,
          deductionsCents: opts.compensation,
        },
      ],
      warnings: [],
      importFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64),
    },
  });
}

async function createSpecialPayment(
  userId: string,
  paymentType: "THIRTEENTH" | "VACATION" | "PLR" | "OTHER",
  opts?: { compensation?: number },
) {
  return prisma.payrollDocument.create({
    data: {
      userId,
      documentType: "MONTHLY_PAYSLIP",
      paymentType,
      employerName: "Empresa Teste",
      employerCnpj: "12.345.678/0001-90",
      year: 2026,
      month: 9,
      grossIncomeCents: 100000,
      totalEarningsCents: 100000,
      totalDeductionsCents: opts?.compensation ?? 0,
      netPaidCents: 100000,
      irrfCents: 0,
      earnings: [],
      deductions:
        opts?.compensation === undefined
          ? []
          : [
              {
                code: "500",
                description: "DESC.ADIANT.SALARIAL",
                reference: null,
                earningsCents: null,
                deductionsCents: opts.compensation,
              },
            ],
      warnings: [],
      importFingerprint: randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64),
    },
  });
}

afterEach(async () => {
  if (users.length) {
    await prisma.user.deleteMany({ where: { id: { in: users.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("payroll advance reconciliation", () => {
  it("links an exact advance and avoids double counting gross income", async () => {
    const user = await createUser();
    const advance = await createAdvance(user.id);
    const regular = await createRegular(user.id, { compensation: 210000 });

    await reconcilePayrollCompetence({
      userId: user.id,
      employerCnpj: advance.employerCnpj,
      year: 2026,
      month: 9,
    });

    const link = await prisma.payrollAdvanceLink.findUnique({
      where: { advanceDocumentId: advance.id },
    });
    expect(link).toMatchObject({
      status: "MATCHED",
      regularDocumentId: regular.id,
      compensationCents: 210000,
    });

    const [summary] = await getPayrollCompetenceSummaries(user.id);
    expect(summary).toMatchObject({
      grossIncomeCents: 724228,
      grossIncomeComplete: true,
      advanceNetPaidCents: 205260,
      advanceNetPaidComplete: true,
      regularNetPaidCents: 349495,
      regularNetPaidComplete: true,
      netPaidCents: 554755,
      netPaidComplete: true,
      irrfCents: 124740,
      irrfComplete: true,
      matchedAdvances: 1,
      pendingAdvances: 0,
    });
  });

  it("keeps an advance without a monthly payslip unlinked", async () => {
    const user = await createUser();
    const advance = await createAdvance(user.id);

    await reconcilePayrollCompetence({
      userId: user.id,
      employerCnpj: advance.employerCnpj,
      year: 2026,
      month: 9,
    });

    expect(await prisma.payrollAdvanceLink.count({ where: { userId: user.id } })).toBe(0);
    const [summary] = await getPayrollCompetenceSummaries(user.id);
    expect(summary.grossIncomeCents).toBe(210000);
    expect(summary.netPaidCents).toBe(205260);
  });

  it("keeps a monthly payslip without an advance valid", async () => {
    const user = await createUser();
    await createRegular(user.id, { compensation: undefined });

    const [summary] = await getPayrollCompetenceSummaries(user.id);
    expect(summary).toMatchObject({
      grossIncomeCents: 724228,
      grossIncomeComplete: true,
      regularNetPaidCents: 349495,
      regularNetPaidComplete: true,
      advanceNetPaidCents: 0,
      advanceNetPaidComplete: true,
      matchedAdvances: 0,
      pendingAdvances: 0,
    });
  });

  it("keeps special payment types out of regular monthly consolidation and advance matching", async () => {
    const user = await createUser();
    const advance = await createAdvance(user.id);

    await Promise.all([
      createSpecialPayment(user.id, "THIRTEENTH", { compensation: 210000 }),
      createSpecialPayment(user.id, "VACATION"),
      createSpecialPayment(user.id, "PLR"),
      createSpecialPayment(user.id, "OTHER"),
    ]);

    await reconcilePayrollCompetence({
      userId: user.id,
      employerCnpj: advance.employerCnpj,
      year: 2026,
      month: 9,
    });

    expect(
      await prisma.payrollAdvanceLink.count({ where: { userId: user.id } }),
    ).toBe(0);

    const summaries = await getPayrollCompetenceSummaries(user.id);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      documentCount: 1,
      grossIncomeCents: 210000,
      netPaidCents: 205260,
      regularNetPaidCents: 0,
      advanceNetPaidCents: 205260,
    });
  });

  it("marks multiple active REGULAR documents as ambiguous instead of summing them", async () => {
    const user = await createUser();
    const first = await createRegular(user.id, {
      gross: 724228,
      net: 349495,
      irrf: 120000,
    });
    const second = await createRegular(user.id, {
      gross: 700000,
      net: 330000,
      irrf: 110000,
    });

    let [summary] = await getPayrollCompetenceSummaries(user.id);
    expect(summary).toMatchObject({
      reviewRequired: true,
      regularDocumentCount: 2,
      grossIncomeCents: null,
      grossIncomeComplete: false,
      regularNetPaidCents: null,
      regularNetPaidComplete: false,
      netPaidCents: null,
      netPaidComplete: false,
      irrfCents: null,
      irrfComplete: false,
    });
    expect(summary.reviewReason).toContain("2 folhas REGULAR vigentes");

    await prisma.payrollDocument.update({
      where: { id: second.id },
      data: {
        lifecycleStatus: "SUPERSEDED",
        supersededAt: new Date(),
      },
    });

    [summary] = await getPayrollCompetenceSummaries(user.id);
    expect(summary).toMatchObject({
      reviewRequired: false,
      regularDocumentCount: 1,
      grossIncomeCents: first.grossIncomeCents,
      grossIncomeComplete: true,
      regularNetPaidCents: first.netPaidCents,
      regularNetPaidComplete: true,
    });
  });

  it("preserves null when monthly aggregate values are incomplete", async () => {
    const user = await createUser();
    await createAdvance(user.id, { net: null });
    await createRegular(user.id, { gross: null, net: null, irrf: null });

    const [summary] = await getPayrollCompetenceSummaries(user.id);

    expect(summary).toMatchObject({
      grossIncomeCents: null,
      grossIncomeComplete: false,
      advanceNetPaidCents: null,
      advanceNetPaidComplete: false,
      regularNetPaidCents: null,
      regularNetPaidComplete: false,
      netPaidCents: null,
      netPaidComplete: false,
      irrfCents: null,
      irrfComplete: false,
    });
  });

  it("creates a pending review when compensation value diverges", async () => {
    const user = await createUser();
    const advance = await createAdvance(user.id);
    await createRegular(user.id, { compensation: 200000 });

    await reconcilePayrollCompetence({
      userId: user.id,
      employerCnpj: advance.employerCnpj,
      year: 2026,
      month: 9,
    });

    const link = await prisma.payrollAdvanceLink.findUnique({
      where: { advanceDocumentId: advance.id },
    });
    expect(link?.status).toBe("PENDING");
    expect(link?.regularDocumentId).toBeNull();
  });

  it("marks equal-valued multiple advances as ambiguous", async () => {
    const user = await createUser();
    const first = await createAdvance(user.id);
    await createAdvance(user.id);
    await createRegular(user.id, { compensation: 210000 });

    await reconcilePayrollCompetence({
      userId: user.id,
      employerCnpj: first.employerCnpj,
      year: 2026,
      month: 9,
    });

    const links = await prisma.payrollAdvanceLink.findMany({ where: { userId: user.id } });
    expect(links).toHaveLength(2);
    expect(links.every((item) => item.status === "PENDING")).toBe(true);
  });

  it("never links documents from different employers or owners", async () => {
    const owner = await createUser();
    const other = await createUser();
    const advance = await createAdvance(owner.id);
    await createRegular(owner.id, {
      cnpj: "98.765.432/0001-10",
      compensation: 210000,
    });
    await createRegular(other.id, { compensation: 210000 });

    await reconcilePayrollCompetence({
      userId: owner.id,
      employerCnpj: advance.employerCnpj,
      year: 2026,
      month: 9,
    });

    expect(await prisma.payrollAdvanceLink.count({ where: { userId: owner.id } })).toBe(0);
    expect(await prisma.payrollAdvanceLink.count({ where: { userId: other.id } })).toBe(0);
  });
});
