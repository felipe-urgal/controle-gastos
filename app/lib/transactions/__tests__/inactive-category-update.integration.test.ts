import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));
const rateLimitMocks = vi.hoisted(() => ({
  consumeTransactionMutationRateLimit: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));
vi.mock("@/app/lib/security/application-rate-limit", () => ({
  consumeTransactionMutationRateLimit:
    rateLimitMocks.consumeTransactionMutationRateLimit,
}));

import { prisma } from "@/app/lib/prisma";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";

const createdUserIds: string[] = [];

beforeEach(() => {
  rateLimitMocks.consumeTransactionMutationRateLimit.mockResolvedValue({
    limited: false,
    retryAfterSeconds: 0,
  });
});

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  rateLimitMocks.consumeTransactionMutationRateLimit.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function fixture() {
  const suffix = randomUUID();
  const user = await prisma.user.create({
    data: {
      name: "Inactive Category Owner",
      email: `inactive-category-${suffix}@example.com`,
      password: "test-hash",
    },
  });
  createdUserIds.push(user.id);
  authMocks.getAuthenticatedUserId.mockResolvedValue(user.id);

  const account = await prisma.account.create({
    data: {
      name: "Conta histórica",
      type: "CREDIT_DEBIT",
      currency: "BRL",
      userId: user.id,
    },
  });
  const [primary, secondary, otherInactive] = await Promise.all([
    prisma.category.create({
      data: { name: "Principal histórica", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: { name: "Secundária histórica", type: "EXPENSE", userId: user.id },
    }),
    prisma.category.create({
      data: {
        name: "Nova inativa",
        type: "EXPENSE",
        isActive: false,
        userId: user.id,
      },
    }),
  ]);

  const transaction = await prisma.transaction.create({
    data: {
      amount: 10_000,
      year: 2031,
      month: 5,
      day: 10,
      type: "EXPENSE",
      description: "Histórico",
      status: "COMPLETED",
      accountId: account.id,
      categoryId: primary.id,
      userId: user.id,
      allocations: {
        create: [
          { amount: 6_000, categoryId: primary.id, userId: user.id },
          { amount: 4_000, categoryId: secondary.id, userId: user.id },
        ],
      },
    },
  });

  await prisma.category.updateMany({
    where: { id: { in: [primary.id, secondary.id] } },
    data: { isActive: false },
  });

  return { transaction, primary, secondary, otherInactive };
}

function updateRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/transactions/${id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("historical inactive categories", () => {
  it("allows editing a transaction while keeping its inactive categories", async () => {
    const { transaction, primary, secondary } = await fixture();

    const response = await transactionCrud.update(
      updateRequest(transaction.id, {
        description: "Histórico atualizado",
        categoryId: primary.id,
        allocations: [
          { categoryId: primary.id, amount: 6_000 },
          { categoryId: secondary.id, amount: 4_000 },
        ],
      }),
      { params: Promise.resolve({ id: transaction.id }) },
    );

    expect(response.status).toBe(200);
    expect(
      await prisma.transaction.findUnique({ where: { id: transaction.id } }),
    ).toMatchObject({
      description: "Histórico atualizado",
      categoryId: primary.id,
    });
  });

  it("rejects assigning a different inactive category", async () => {
    const { transaction, otherInactive } = await fixture();

    const response = await transactionCrud.update(
      updateRequest(transaction.id, { categoryId: otherInactive.id }),
      { params: Promise.resolve({ id: transaction.id }) },
    );

    expect(response.status).toBe(400);
  });
});
