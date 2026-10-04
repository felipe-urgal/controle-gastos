import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getAuthenticatedUserId } from "@/app/lib/auth";
import {
  getInvestmentTaxPaymentReconciliationForUser,
  linkInvestmentTaxPaymentTransaction,
  unlinkInvestmentTaxPaymentTransaction,
} from "@/app/lib/investments/investment-tax-payment-reconciliation";
import { prisma } from "@/app/lib/prisma";

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn(),
}));

const authMock = vi.mocked(getAuthenticatedUserId);
const userIds: string[] = [];

async function createUser(name: string) {
  const user = await prisma.user.create({
    data: {
      name,
      email: `darf-reconciliation-${randomUUID()}@example.com`,
      password: "test-hash",
    },
  });
  userIds.push(user.id);
  return user;
}

async function createPayment(args: {
  userId: string;
  amountCents?: number;
  currency?: "BRL" | "USD" | "EUR";
  competenceMonth?: number;
  paidYear?: number;
  paidMonth?: number;
  paidDay?: number;
}) {
  return prisma.investmentTaxPayment.create({
    data: {
      userId: args.userId,
      assetType: "FII",
      currency: args.currency ?? "BRL",
      amountCents: args.amountCents ?? 12345,
      competenceYear: 2025,
      competenceMonth: args.competenceMonth ?? 4,
      code: "6015",
      paidYear: args.paidYear ?? 2025,
      paidMonth: args.paidMonth ?? 5,
      paidDay: args.paidDay ?? 20,
      receiptReference: "DARF-TESTE",
    },
  });
}

async function createTransaction(args: {
  userId: string;
  amountCents?: number;
  currency?: "BRL" | "USD" | "EUR";
  year?: number;
  month?: number;
  day?: number;
  type?: "INCOME" | "EXPENSE";
  status?: "PENDING" | "COMPLETED";
  description?: string;
}) {
  const type = args.type ?? "EXPENSE";
  const [account, category] = await Promise.all([
    prisma.account.create({
      data: {
        name: "Conta DARF " + randomUUID(),
        type: "CREDIT_DEBIT",
        currency: args.currency ?? "BRL",
        userId: args.userId,
      },
    }),
    prisma.category.create({
      data: {
        name: "Categoria DARF " + randomUUID(),
        type,
        userId: args.userId,
      },
    }),
  ]);

  return prisma.transaction.create({
    data: {
      userId: args.userId,
      accountId: account.id,
      categoryId: category.id,
      amount: args.amountCents ?? 12345,
      year: args.year ?? 2025,
      month: args.month ?? 5,
      day: args.day ?? 20,
      type,
      kind: "NORMAL",
      status: args.status ?? "COMPLETED",
      description: args.description ?? "PAGAMENTO DARF 6015",
    },
  });
}

function linkRequest(paymentId: string, transactionId: string) {
  return new Request(
    "http://localhost/api/investments/taxes/payments/reconciliation",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentId, transactionId }),
    },
  );
}

function unlinkContext(paymentId: string) {
  return { params: Promise.resolve({ paymentId }) };
}

describe("DARF transaction reconciliation", () => {
  afterEach(async () => {
    authMock.mockReset();
    const ids = userIds.splice(0);
    if (ids.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
    }
  });

  it("suggests a unique expense with the same amount, currency and payment date", async () => {
    const owner = await createUser("DARF Owner");
    const payment = await createPayment({ userId: owner.id });
    const transaction = await createTransaction({ userId: owner.id });

    const items = await getInvestmentTaxPaymentReconciliationForUser(
      owner.id,
      2025,
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      paymentId: payment.id,
      status: "SUGGESTED",
      amountCents: 12345,
      matchedTransaction: null,
    });
    expect(items[0]!.candidates).toEqual([
      expect.objectContaining({
        id: transaction.id,
        amountCents: 12345,
      }),
    ]);
  });

  it("keeps missing and ambiguous candidates explicit", async () => {
    const owner = await createUser("DARF Owner");
    await createPayment({ userId: owner.id, amountCents: 11111 });
    await createPayment({
      userId: owner.id,
      amountCents: 22222,
      competenceMonth: 5,
    });
    await createTransaction({
      userId: owner.id,
      amountCents: 22222,
      description: "DARF candidato A",
    });
    await createTransaction({
      userId: owner.id,
      amountCents: 22222,
      description: "DARF candidato B",
    });

    const items = await getInvestmentTaxPaymentReconciliationForUser(
      owner.id,
      2025,
    );

    expect(items.find((item) => item.amountCents === 11111)).toMatchObject({
      status: "UNMATCHED",
      candidates: [],
    });
    const ambiguous = items.find((item) => item.amountCents === 22222);
    expect(ambiguous).toMatchObject({ status: "REVIEW_REQUIRED" });
    expect(ambiguous?.candidates).toHaveLength(2);
  });

  it("links idempotently and unlinks without changing the transaction", async () => {
    const owner = await createUser("DARF Owner");
    authMock.mockResolvedValue(owner.id);
    const payment = await createPayment({ userId: owner.id });
    const transaction = await createTransaction({ userId: owner.id });

    const first = await linkInvestmentTaxPaymentTransaction(
      linkRequest(payment.id, transaction.id),
    );
    expect(first?.status).toBe(201);

    const second = await linkInvestmentTaxPaymentTransaction(
      linkRequest(payment.id, transaction.id),
    );
    expect(second?.status).toBe(200);

    const storedPayment = await prisma.investmentTaxPayment.findUnique({
      where: { id: payment.id },
    });
    expect(storedPayment?.transactionId).toBe(transaction.id);

    const matched = await getInvestmentTaxPaymentReconciliationForUser(
      owner.id,
      2025,
    );
    expect(matched[0]).toMatchObject({
      status: "MATCHED",
      matchedTransaction: expect.objectContaining({ id: transaction.id }),
      candidates: [],
    });

    const removed = await unlinkInvestmentTaxPaymentTransaction(
      new Request(
        `http://localhost/api/investments/taxes/payments/reconciliation/${payment.id}`,
        { method: "DELETE" },
      ),
      unlinkContext(payment.id),
    );
    expect(removed.status).toBe(200);

    const unlinkedPayment = await prisma.investmentTaxPayment.findUnique({
      where: { id: payment.id },
    });
    expect(unlinkedPayment?.transactionId).toBeNull();

    const originalTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
    });
    expect(originalTransaction).toMatchObject({
      amount: 12345,
      type: "EXPENSE",
      kind: "NORMAL",
      status: "COMPLETED",
      description: "PAGAMENTO DARF 6015",
    });
  });

  it("rejects another user's transaction", async () => {
    const [owner, other] = await Promise.all([
      createUser("DARF Owner"),
      createUser("DARF Other"),
    ]);
    authMock.mockResolvedValue(owner.id);
    const payment = await createPayment({ userId: owner.id });
    const foreignTransaction = await createTransaction({ userId: other.id });

    const response = await linkInvestmentTaxPaymentTransaction(
      linkRequest(payment.id, foreignTransaction.id),
    );

    expect(response?.status).toBe(404);
    expect(
      await prisma.investmentTaxPayment.findUnique({
        where: { id: payment.id },
        select: { transactionId: true },
      }),
    ).toEqual({ transactionId: null });
  });

  it("rejects value, currency, date and status mismatches", async () => {
    const owner = await createUser("DARF Owner");
    authMock.mockResolvedValue(owner.id);
    const payment = await createPayment({ userId: owner.id });

    const wrongAmount = await createTransaction({
      userId: owner.id,
      amountCents: 12344,
    });
    expect(
      (
        await linkInvestmentTaxPaymentTransaction(
          linkRequest(payment.id, wrongAmount.id),
        )
      )?.status,
    ).toBe(409);

    const wrongCurrency = await createTransaction({
      userId: owner.id,
      currency: "USD",
    });
    expect(
      (
        await linkInvestmentTaxPaymentTransaction(
          linkRequest(payment.id, wrongCurrency.id),
        )
      )?.status,
    ).toBe(409);

    const wrongDate = await createTransaction({
      userId: owner.id,
      day: 21,
    });
    expect(
      (
        await linkInvestmentTaxPaymentTransaction(
          linkRequest(payment.id, wrongDate.id),
        )
      )?.status,
    ).toBe(409);

    const pending = await createTransaction({
      userId: owner.id,
      status: "PENDING",
    });
    expect(
      (
        await linkInvestmentTaxPaymentTransaction(
          linkRequest(payment.id, pending.id),
        )
      )?.status,
    ).toBe(409);
  });

  it("prevents one bank expense from settling two DARFs", async () => {
    const owner = await createUser("DARF Owner");
    authMock.mockResolvedValue(owner.id);
    const firstPayment = await createPayment({ userId: owner.id });
    const secondPayment = await createPayment({
      userId: owner.id,
      competenceMonth: 5,
    });
    const transaction = await createTransaction({ userId: owner.id });

    expect(
      (
        await linkInvestmentTaxPaymentTransaction(
          linkRequest(firstPayment.id, transaction.id),
        )
      )?.status,
    ).toBe(201);

    expect(
      (
        await linkInvestmentTaxPaymentTransaction(
          linkRequest(secondPayment.id, transaction.id),
        )
      )?.status,
    ).toBe(409);

    expect(
      await prisma.investmentTaxPayment.count({
        where: { transactionId: transaction.id },
      }),
    ).toBe(1);
  });

  it("marks an existing link for review if the transaction later changes", async () => {
    const owner = await createUser("DARF Owner");
    authMock.mockResolvedValue(owner.id);
    const payment = await createPayment({ userId: owner.id });
    const transaction = await createTransaction({ userId: owner.id });

    expect(
      (
        await linkInvestmentTaxPaymentTransaction(
          linkRequest(payment.id, transaction.id),
        )
      )?.status,
    ).toBe(201);

    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { amount: 12000 },
    });

    const items = await getInvestmentTaxPaymentReconciliationForUser(
      owner.id,
      2025,
    );
    expect(items[0]).toMatchObject({
      status: "REVIEW_REQUIRED",
      matchedTransaction: expect.objectContaining({
        id: transaction.id,
        amountCents: 12000,
      }),
    });
  });

  it("removes only the link when the linked transaction is deleted", async () => {
    const owner = await createUser("DARF Owner");
    authMock.mockResolvedValue(owner.id);
    const payment = await createPayment({ userId: owner.id });
    const transaction = await createTransaction({ userId: owner.id });

    await linkInvestmentTaxPaymentTransaction(
      linkRequest(payment.id, transaction.id),
    );
    await prisma.transaction.delete({ where: { id: transaction.id } });

    const preserved = await prisma.investmentTaxPayment.findUnique({
      where: { id: payment.id },
      select: { id: true, transactionId: true, amountCents: true },
    });
    expect(preserved).toEqual({
      id: payment.id,
      transactionId: null,
      amountCents: 12345,
    });
  });
});
