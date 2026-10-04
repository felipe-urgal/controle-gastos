import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import {
  getPayrollTransactionReconciliationForUser,
  linkPayrollTransaction,
  unlinkPayrollTransaction,
} from "@/app/lib/payroll/payroll-transaction-reconciliation";
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

async function createUser(label: string) {
  const suffix = randomUUID();
  const created = await prisma.user.create({
    data: {
      name: label,
      email: "payroll-transaction-" + suffix + "@example.com",
      password: "test-hash",
    },
  });
  userIds.push(created.id);
  return created;
}

function fingerprint() {
  return randomUUID().replaceAll("-", "").padEnd(64, "0").slice(0, 64);
}

async function createPayrollDocument(args: {
  userId: string;
  netPaidCents?: number | null;
  year?: number;
  month?: number;
  paymentType?: "ADVANCE" | "REGULAR";
}) {
  const paymentType = args.paymentType ?? "REGULAR";
  return prisma.payrollDocument.create({
    data: {
      userId: args.userId,
      documentType:
        paymentType === "ADVANCE" ? "PAYROLL_ADVANCE" : "MONTHLY_PAYSLIP",
      paymentType,
      employerName: "Empresa Teste",
      employerCnpj: "12.345.678/0001-90",
      employeeName: "Pessoa Teste",
      year: args.year ?? 2026,
      month: args.month ?? 9,
      salaryBaseCents: 500000,
      grossIncomeCents: 500000,
      totalEarningsCents: 500000,
      totalDeductionsCents:
        args.netPaidCents == null ? null : 500000 - args.netPaidCents,
      netPaidCents: args.netPaidCents === undefined ? 349495 : args.netPaidCents,
      inssCents: 50000,
      irrfCents: 10000,
      irrfBaseCents: 450000,
      fgtsBaseCents: 500000,
      fgtsAmountCents: 40000,
      earnings: [],
      deductions: [],
      bankMetadata: undefined,
      warnings: [],
      importFingerprint: fingerprint(),
    },
  });
}

async function createIncomeTransaction(args: {
  userId: string;
  amountCents?: number;
  year?: number;
  month?: number;
  day?: number;
  description?: string;
}) {
  const [account, category] = await Promise.all([
    prisma.account.create({
      data: {
        name: "Conta " + randomUUID(),
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: args.userId,
      },
    }),
    prisma.category.create({
      data: {
        name: "Salário " + randomUUID(),
        type: "INCOME",
        userId: args.userId,
      },
    }),
  ]);

  return prisma.transaction.create({
    data: {
      userId: args.userId,
      accountId: account.id,
      categoryId: category.id,
      amount: args.amountCents ?? 349495,
      year: args.year ?? 2026,
      month: args.month ?? 9,
      day: args.day ?? 30,
      type: "INCOME",
      status: "COMPLETED",
      description: args.description ?? "SALARIO EMPRESA TESTE",
    },
  });
}

function linkRequest(payrollDocumentId: string, transactionId: string) {
  return new Request(
    "http://localhost/api/payroll/transaction-reconciliation",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ payrollDocumentId, transactionId }),
    },
  );
}

function unlinkContext(documentId: string) {
  return { params: Promise.resolve({ documentId }) };
}

describe("payroll transaction reconciliation", () => {
  it("suggests a unique credit with the same value in the competence window", async () => {
    const owner = await createUser("Owner");
    const document = await createPayrollDocument({ userId: owner.id });
    const transaction = await createIncomeTransaction({ userId: owner.id });

    const items = await getPayrollTransactionReconciliationForUser(owner.id);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      documentId: document.id,
      status: "SUGGESTED",
      netPaidCents: 349495,
      matchedTransaction: null,
    });
    expect(items[0]!.candidates).toEqual([
      expect.objectContaining({
        id: transaction.id,
        amountCents: 349495,
      }),
    ]);
  });

  it("keeps missing and ambiguous matches explicit", async () => {
    const owner = await createUser("Owner");
    await createPayrollDocument({ userId: owner.id, netPaidCents: 100000 });
    await createPayrollDocument({
      userId: owner.id,
      netPaidCents: 200000,
      paymentType: "ADVANCE",
    });
    await createIncomeTransaction({
      userId: owner.id,
      amountCents: 200000,
      day: 15,
      description: "ADIANTAMENTO",
    });
    await createIncomeTransaction({
      userId: owner.id,
      amountCents: 200000,
      day: 20,
      description: "CREDITO EMPRESA",
    });

    const items = await getPayrollTransactionReconciliationForUser(owner.id);
    const missing = items.find((item) => item.netPaidCents === 100000);
    const ambiguous = items.find((item) => item.netPaidCents === 200000);

    expect(missing).toMatchObject({
      status: "UNMATCHED",
      candidates: [],
    });
    expect(ambiguous).toMatchObject({
      status: "REVIEW_REQUIRED",
    });
    expect(ambiguous?.candidates).toHaveLength(2);
  });

  it("does not infer a match when the document has no net amount", async () => {
    const owner = await createUser("Owner");
    await createPayrollDocument({ userId: owner.id, netPaidCents: null });
    await createIncomeTransaction({ userId: owner.id });

    const items = await getPayrollTransactionReconciliationForUser(owner.id);

    expect(items[0]).toMatchObject({
      status: "REVIEW_REQUIRED",
      netPaidCents: null,
      candidates: [],
    });
  });

  it("links idempotently and can unlink without changing the transaction", async () => {
    const owner = await createUser("Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const document = await createPayrollDocument({ userId: owner.id });
    const transaction = await createIncomeTransaction({ userId: owner.id });

    const first = await linkPayrollTransaction(
      linkRequest(document.id, transaction.id),
    );
    expect(first?.status).toBe(201);

    const second = await linkPayrollTransaction(
      linkRequest(document.id, transaction.id),
    );
    expect(second?.status).toBe(200);
    expect(
      await prisma.payrollTransactionLink.count({ where: { userId: owner.id } }),
    ).toBe(1);

    const matched = await getPayrollTransactionReconciliationForUser(owner.id);
    expect(matched[0]).toMatchObject({
      status: "MATCHED",
      matchedTransaction: expect.objectContaining({ id: transaction.id }),
      candidates: [],
    });

    const removed = await unlinkPayrollTransaction(
      new Request(
        "http://localhost/api/payroll/transaction-reconciliation/" + document.id,
        { method: "DELETE" },
      ),
      unlinkContext(document.id),
    );
    expect(removed.status).toBe(200);
    expect(
      await prisma.payrollTransactionLink.count({ where: { userId: owner.id } }),
    ).toBe(0);

    const original = await prisma.transaction.findUnique({
      where: { id: transaction.id },
    });
    expect(original).toMatchObject({
      amount: 349495,
      type: "INCOME",
      status: "COMPLETED",
      description: "SALARIO EMPRESA TESTE",
    });
  });

  it("rejects another user's transaction", async () => {
    const owner = await createUser("Owner");
    const other = await createUser("Other");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const document = await createPayrollDocument({ userId: owner.id });
    const foreignTransaction = await createIncomeTransaction({
      userId: other.id,
    });

    const response = await linkPayrollTransaction(
      linkRequest(document.id, foreignTransaction.id),
    );

    expect(response?.status).toBe(404);
    expect(
      await prisma.payrollTransactionLink.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("rejects value mismatch and transactions outside the safe window", async () => {
    const owner = await createUser("Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const document = await createPayrollDocument({ userId: owner.id });

    const wrongAmount = await createIncomeTransaction({
      userId: owner.id,
      amountCents: 349494,
    });
    const wrongAmountResponse = await linkPayrollTransaction(
      linkRequest(document.id, wrongAmount.id),
    );
    expect(wrongAmountResponse?.status).toBe(409);

    const outsideWindow = await createIncomeTransaction({
      userId: owner.id,
      amountCents: 349495,
      year: 2026,
      month: 10,
      day: 11,
    });
    const outsideWindowResponse = await linkPayrollTransaction(
      linkRequest(document.id, outsideWindow.id),
    );
    expect(outsideWindowResponse?.status).toBe(409);
  });

  it("prevents one transaction from settling two payroll documents", async () => {
    const owner = await createUser("Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const firstDocument = await createPayrollDocument({ userId: owner.id });
    const secondDocument = await createPayrollDocument({
      userId: owner.id,
      paymentType: "ADVANCE",
    });
    const transaction = await createIncomeTransaction({ userId: owner.id });

    const first = await linkPayrollTransaction(
      linkRequest(firstDocument.id, transaction.id),
    );
    expect(first?.status).toBe(201);

    const second = await linkPayrollTransaction(
      linkRequest(secondDocument.id, transaction.id),
    );
    expect(second?.status).toBe(409);

    expect(
      await prisma.payrollTransactionLink.count({
        where: { transactionId: transaction.id },
      }),
    ).toBe(1);
  });

  it("marks an existing link for review if the source transaction later changes", async () => {
    const owner = await createUser("Owner");
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const document = await createPayrollDocument({ userId: owner.id });
    const transaction = await createIncomeTransaction({ userId: owner.id });

    const linked = await linkPayrollTransaction(
      linkRequest(document.id, transaction.id),
    );
    expect(linked?.status).toBe(201);

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { amount: 349000 },
    });

    const items = await getPayrollTransactionReconciliationForUser(owner.id);
    expect(items[0]).toMatchObject({
      status: "REVIEW_REQUIRED",
      matchedTransaction: expect.objectContaining({
        id: transaction.id,
        amountCents: 349000,
      }),
    });
  });
});
