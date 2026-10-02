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
  gross?: number;
  net?: number;
  irrf?: number;
}) {
  const gross = opts?.gross ?? 210000;
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
      totalDeductionsCents: opts?.irrf ?? 4740,
      netPaidCents: opts?.net ?? 205260,
      irrfCents: opts?.irrf ?? 4740,
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
  gross?: number;
  net?: number;
  irrf?: number;
}) {
  return prisma.payrollDocument.create({
    data: {
      userId,
      documentType: "MONTHLY_PAYSLIP",
      paymentType: "REGULAR",
      employerName: "Empresa Teste",
      employerCnpj: opts?.cnpj ?? "12.345.678/0001-90",
      year: 2026,
      month: 9,
      grossIncomeCents: opts?.gross ?? 724228,
      totalEarningsCents: opts?.gross ?? 724228,
      totalDeductionsCents: 374733,
      netPaidCents: opts?.net ?? 349495,
      irrfCents: opts?.irrf ?? 120000,
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
      advanceNetPaidCents: 205260,
      regularNetPaidCents: 349495,
      netPaidCents: 554755,
      irrfCents: 124740,
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
      regularNetPaidCents: 349495,
      advanceNetPaidCents: 0,
      matchedAdvances: 0,
      pendingAdvances: 0,
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
