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

function updateTransactionRequest(id: string, body: Record<string, unknown>) {
  return new Request(`http://localhost/api/transactions/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

describe("transaction tags integration", () => {
  it("enforces tag ownership and filters transactions by an owned tag", async () => {
    const [owner, other] = await Promise.all([factory.user(), factory.user()]);
    const [account, category] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
    ]);
    const [ownedTag, foreignTag] = await Promise.all([
      prisma.tag.create({
        data: {
          userId: owner.id,
          name: "ferias",
          normalizedName: "ferias",
        },
      }),
      prisma.tag.create({
        data: {
          userId: other.id,
          name: "privada",
          normalizedName: "privada",
        },
      }),
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
    expect(createdBody.data.tags).toEqual([
      { id: ownedTag.id, name: "ferias", isActive: true },
    ]);

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

  it("archives tags in use, preserves history, reactivates them and blocks hard delete", async () => {
    const owner = await factory.user();
    const [account, category] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
    ]);
    const tag = await prisma.tag.create({
      data: {
        userId: owner.id,
        name: "reembolso",
        normalizedName: "reembolso",
      },
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

    const archived = await tagCrud.update(
      new Request(`http://localhost/api/tags/${tag.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: false }),
      }),
      { params: Promise.resolve({ id: tag.id }) },
    );
    const archivedBody = await archived.json();

    expect(archived.status).toBe(200);
    expect(archivedBody.data).toMatchObject({
      id: tag.id,
      isActive: false,
      transactionCount: 1,
    });

    const deniedDelete = await tagCrud.remove(
      new Request(`http://localhost/api/tags/${tag.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: tag.id }) },
    );
    const deniedDeleteBody = await deniedDelete.json();

    expect(deniedDelete.status).toBe(409);
    expect(deniedDeleteBody.error.code).toBe("TAG_IN_USE");
    expect(deniedDeleteBody.error.message).toContain("1 transação");
    expect(
      await prisma.transactionTag.count({ where: { transactionId: transaction.id } }),
    ).toBe(1);

    const reactivated = await tagCrud.update(
      new Request(`http://localhost/api/tags/${tag.id}`, {
        method: "PUT",
        body: JSON.stringify({ isActive: true }),
      }),
      { params: Promise.resolve({ id: tag.id }) },
    );
    const reactivatedBody = await reactivated.json();

    expect(reactivated.status).toBe(200);
    expect(reactivatedBody.data.isActive).toBe(true);
  });

  it("hard-deletes only an unused tag", async () => {
    const owner = await factory.user();
    const tag = await prisma.tag.create({
      data: {
        userId: owner.id,
        name: "temporaria",
        normalizedName: "temporaria",
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await tagCrud.remove(
      new Request(`http://localhost/api/tags/${tag.id}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: tag.id }) },
    );

    expect(response.status).toBe(200);
    expect(await prisma.tag.findUnique({ where: { id: tag.id } })).toBeNull();
  });

  it("blocks archived tags on new links but preserves them on the transaction that already had them", async () => {
    const owner = await factory.user();
    const [account, category] = await Promise.all([
      factory.account(owner.id),
      factory.category(owner.id),
    ]);
    const tag = await prisma.tag.create({
      data: {
        userId: owner.id,
        name: "historica",
        normalizedName: "historica",
      },
    });
    const withTag = await factory.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: { description: "Com tag antiga" },
    });
    const withoutTag = await factory.transaction({
      userId: owner.id,
      accountId: account.id,
      categoryId: category.id,
      overrides: { description: "Sem tag antiga" },
    });
    await prisma.transactionTag.create({
      data: { userId: owner.id, transactionId: withTag.id, tagId: tag.id },
    });
    await prisma.tag.update({
      where: { id: tag.id },
      data: { isActive: false },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const preserved = await transactionCrud.update(
      updateTransactionRequest(withTag.id, {
        description: "Atualizada",
        tagIds: [tag.id],
      }),
      { params: Promise.resolve({ id: withTag.id }) },
    );
    const preservedBody = await preserved.json();

    expect(preserved.status).toBe(200);
    expect(preservedBody.data.tags).toEqual([
      { id: tag.id, name: "historica", isActive: false },
    ]);

    const denied = await transactionCrud.update(
      updateTransactionRequest(withoutTag.id, { tagIds: [tag.id] }),
      { params: Promise.resolve({ id: withoutTag.id }) },
    );
    const deniedBody = await denied.json();

    expect(denied.status).toBe(409);
    expect(deniedBody.error.code).toBe("TAG_ARCHIVED");
  });
});
