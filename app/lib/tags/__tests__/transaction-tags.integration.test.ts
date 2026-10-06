import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { tagCrud } from "@/app/lib/tags/tag-crud";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const factory = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await factory.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("transaction tags integration", () => {
  it("enforces tag ownership and filters transactions by an owned tag", async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    const [account, category] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
    ]);
    const [ownedTag, foreignTag] = await Promise.all([
      prisma.tag.create({ data: { userId: owner.id, name: "ferias", normalizedName: "ferias" } }),
      prisma.tag.create({ data: { userId: other.id, name: "privada", normalizedName: "privada" } }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const denied = await transactionCrud.create(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: 3500,
          description: "Viagem",
          year: 2026,
          month: 9,
          day: 30,
          accountId: account.id,
          categoryId: category.id,
          type: "EXPENSE",
          tagIds: [foreignTag.id],
        }),
      }),
    );
    expect(denied.status).toBe(400);

    const created = await transactionCrud.create(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          amount: 3500,
          description: "Viagem",
          year: 2026,
          month: 9,
          day: 30,
          accountId: account.id,
          categoryId: category.id,
          type: "EXPENSE",
          tagIds: [ownedTag.id],
        }),
      }),
    );
    expect(created.status).toBe(201);
    const createdBody = await created.json();
    expect(createdBody.data.tags).toEqual([{ id: ownedTag.id, name: "ferias" }]);

    await factory.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: { description: "Sem tag", year: 2026, month: 9, day: 29 },
    });

    const filtered = await transactionCrud.list(
      new Request(
        `http://localhost/api/transactions?year=2026&month=9&tagId=${ownedTag.id}`,
      ),
    );
    const filteredBody = await filtered.json();

    expect(filtered.status).toBe(200);
    expect(filteredBody.data.items.map((item: { id: string }) => item.id)).toEqual([
      createdBody.data.id,
    ]);
  });

  it("deleting a tag preserves its transactions and removes only associations", async () => {
    const owner = await factory.user();
    const [account, category] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
    ]);
    const tag = await prisma.tag.create({
      data: { userId: owner.id, name: "reembolso", normalizedName: "reembolso" },
    });
    const transaction = await factory.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
    });
    await prisma.transactionTag.create({
      data: { userId: owner.id, transactionId: transaction.id, tagId: tag.id },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await tagCrud.remove(
      new Request(`http://localhost/api/tags/${tag.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: tag.id }) },
    );

    expect(response.status).toBe(200);
    expect(await prisma.transaction.findUnique({ where: { id: transaction.id } })).not.toBeNull();
    expect(
      await prisma.transactionTag.count({ where: { transactionId: transaction.id } }),
    ).toBe(0);
  });
});
