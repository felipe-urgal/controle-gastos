import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { confirmPayrollImport } from "@/app/lib/payroll/payroll-import";
import type { ParsedPayrollDocument } from "@/app/lib/payroll/payroll-parser";
import { payrollImportFingerprint } from "@/app/lib/payroll/payroll-parser";
import { signPayrollPreview } from "@/app/lib/payroll/preview-token";
import { prisma } from "@/app/lib/prisma";

const userIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (userIds.length) {
    await prisma.user.deleteMany({ where: { id: { in: userIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function user(label: string) {
  const suffix = randomUUID();
  const created = await prisma.user.create({
    data: {
      name: label,
      email: `payroll-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(created.id);
  return created;
}

function document(): ParsedPayrollDocument {
  return {
    documentType: "MONTHLY_PAYSLIP",
    paymentType: "REGULAR",
    employerName: "Empresa Teste",
    employerCnpj: "12.345.678/0001-90",
    employeeName: "Pessoa Teste",
    year: 2026,
    month: 9,
    salaryBaseCents: 724228,
    grossIncomeCents: 724228,
    totalEarningsCents: 724228,
    totalDeductionsCents: 374733,
    netPaidCents: 349495,
    inssCents: 87724,
    irrfCents: 120000,
    irrfBaseCents: 636504,
    fgtsBaseCents: 724228,
    fgtsAmountCents: 57938,
    earnings: [],
    deductions: [],
    bankMetadata: null,
    warnings: [],
    errors: [],
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/payroll/import/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("payroll import integration", () => {
  it("persists a payroll document idempotently without creating transactions", async () => {
    const owner = await user("Payroll Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const parsed = document();
    const previewDocument = {
      ...parsed,
      fingerprint: payrollImportFingerprint(owner.id, parsed),
      duplicate: false,
    };
    const previewToken = signPayrollPreview({ userId: owner.id, document: previewDocument });

    const response = await confirmPayrollImport(request({
      previewToken,
      selected: true,
      document: previewDocument,
    }));
    expect(response.status).toBe(201);
    expect(await prisma.payrollDocument.count({ where: { userId: owner.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);

    const second = await confirmPayrollImport(request({
      previewToken,
      selected: true,
      document: previewDocument,
    }));
    expect([200, 201]).toContain(second.status);
    expect(await prisma.payrollDocument.count({ where: { userId: owner.id } })).toBe(1);
  });

  it("does not accept another user's signed preview", async () => {
    const owner = await user("Payroll Owner");
    const other = await user("Payroll Other");
    const parsed = document();
    const previewDocument = {
      ...parsed,
      fingerprint: payrollImportFingerprint(owner.id, parsed),
      duplicate: false,
    };
    const previewToken = signPayrollPreview({ userId: owner.id, document: previewDocument });

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const response = await confirmPayrollImport(request({
      previewToken,
      selected: true,
      document: previewDocument,
    }));

    expect(response.status).toBe(400);
    expect(await prisma.payrollDocument.count({ where: { userId: other.id } })).toBe(0);
  });
});
