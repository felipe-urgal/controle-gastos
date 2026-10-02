import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  confirmAnnualEmploymentIncomeStatement,
} from "@/app/lib/payroll/annual-income-statement-import";
import {
  annualEmploymentIncomeFingerprint,
  type ParsedAnnualEmploymentIncomeStatement,
} from "@/app/lib/payroll/annual-income-statement-parser";
import { signAnnualStatementPreview } from "@/app/lib/payroll/annual-income-preview-token";
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

async function createUser() {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Annual Statement Test",
      email: `annual-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

function parsed(): ParsedAnnualEmploymentIncomeStatement {
  return {
    calendarYear: 2025,
    taxExercise: 2026,
    payerName: "Empresa Teste",
    payerTaxId: "12.345.678/0001-90",
    beneficiaryName: "Pessoa Teste",
    beneficiaryTaxId: "123.456.789-00",
    incomeNature: "Rendimentos do trabalho assalariado",
    taxableIncomeCents: 8905537,
    officialPensionCents: 812050,
    complementaryPensionCents: null,
    alimonyCents: null,
    irrfCents: 909807,
    thirteenthSalaryCents: 724228,
    thirteenthIrrfCents: 85000,
    exemptIncome: [{ description: "Abono pecuniário", amountCents: 245000 }],
    exclusiveTaxation: [{ description: "PLR", amountCents: 300000 }],
    accumulatedIncome: [],
    notes: [],
    warnings: [],
    errors: [],
  };
}

function request(body: unknown) {
  return new Request("http://localhost/api/payroll/annual/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("annual employment income statement import", () => {
  it("persists idempotently without creating transactions", async () => {
    const user = await createUser();
    authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

    const base = parsed();
    const statement = {
      ...base,
      fingerprint: annualEmploymentIncomeFingerprint(user.id, base),
      duplicate: false,
    };
    const previewToken = signAnnualStatementPreview(user.id, statement);

    const first = await confirmAnnualEmploymentIncomeStatement(request({
      previewToken,
      selected: true,
      statement,
    }));
    expect(first.status).toBe(201);
    expect(await prisma.annualEmploymentIncomeStatement.count({ where: { userId: user.id } })).toBe(1);
    expect(await prisma.transaction.count({ where: { userId: user.id } })).toBe(0);

    const second = await confirmAnnualEmploymentIncomeStatement(request({
      previewToken,
      selected: true,
      statement,
    }));
    expect(second.status).toBe(200);
    expect(await prisma.annualEmploymentIncomeStatement.count({ where: { userId: user.id } })).toBe(1);
  });

  it("rejects a preview signed for another user", async () => {
    const owner = await createUser();
    const other = await createUser();
    const base = parsed();
    const statement = {
      ...base,
      fingerprint: annualEmploymentIncomeFingerprint(owner.id, base),
      duplicate: false,
    };
    const previewToken = signAnnualStatementPreview(owner.id, statement);

    authMocks.getAuthenticatedUserId.mockResolvedValue(other.id);
    const response = await confirmAnnualEmploymentIncomeStatement(request({
      previewToken,
      selected: true,
      statement,
    }));

    expect(response.status).toBe(400);
    expect(await prisma.annualEmploymentIncomeStatement.count({ where: { userId: other.id } })).toBe(0);
  });
});
