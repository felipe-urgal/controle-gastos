import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { importRuleCrud } from "@/app/lib/crud/import-rule.crud";
import { prisma } from "@/app/lib/prisma";

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("import rule CRUD", () => {
  it("keeps rules tenant-scoped and validates account/category semantics", async () => {
    const suffix = randomUUID();
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Rule Owner",
          email: `rule-owner-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
      prisma.user.create({
        data: {
          name: "Rule Other",
          email: `rule-other-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
    ]);
    createdUserIds.push(owner.id, otherUser.id);

    const [account, foreignAccount, category, foreignCategory] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.account.create({
        data: {
          name: `Conta externa ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: otherUser.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Despesa ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Despesa externa ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: otherUser.id,
        },
      }),
    ]);

    const validInput = {
      name: "Mercado",
      isActive: true,
      priority: 10,
      accountId: account.id,
      transactionType: "EXPENSE" as const,
      descriptionOperator: "CONTAINS" as const,
      descriptionPattern: "mercado",
      minAmountCents: 100,
      maxAmountCents: 50_000,
      categoryId: category.id,
      normalizedDescription: "Supermercado",
    };

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const createResponse = await importRuleCrud.create(
      new Request("http://localhost/api/import-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(validInput),
      })
    );
    const createBody = await createResponse.json();

    expect(createResponse.status).toBe(201);
    expect(createBody.data).toMatchObject({
      name: "Mercado",
      priority: 10,
      accountId: account.id,
      categoryId: category.id,
    });
    expect(createBody.data).not.toHaveProperty("userId");

    for (const invalidInput of [
      { ...validInput, accountId: foreignAccount.id },
      { ...validInput, categoryId: foreignCategory.id },
      { ...validInput, transactionType: "INCOME" as const },
    ]) {
      const response = await importRuleCrud.create(
        new Request("http://localhost/api/import-rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(invalidInput),
        })
      );
      expect(response.status).toBe(400);
    }

    const ruleId = createBody.data.id as string;
    const listResponse = await importRuleCrud.list(
      new Request("http://localhost/api/import-rules")
    );
    const listBody = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listBody.data.items.map((rule: { id: string }) => rule.id)).toEqual([
      ruleId,
    ]);

    const mismatchedUpdate = await importRuleCrud.update(
      new Request(`http://localhost/api/import-rules/${ruleId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...validInput, transactionType: "INCOME" }),
      }),
      { params: Promise.resolve({ id: ruleId }) }
    );
    expect(mismatchedUpdate.status).toBe(400);

    authMocks.getAuthenticatedUserId.mockResolvedValue(otherUser.id);
    const deniedRead = await importRuleCrud.getById(
      new Request(`http://localhost/api/import-rules/${ruleId}`),
      { params: Promise.resolve({ id: ruleId }) }
    );
    const deniedDelete = await importRuleCrud.remove(
      new Request(`http://localhost/api/import-rules/${ruleId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: ruleId }) }
    );
    expect(deniedRead.status).toBe(404);
    expect(deniedDelete.status).toBe(404);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const deleteResponse = await importRuleCrud.remove(
      new Request(`http://localhost/api/import-rules/${ruleId}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: ruleId }) }
    );
    expect(deleteResponse.status).toBe(200);
    expect(
      await prisma.transactionImportRule.findUnique({ where: { id: ruleId } })
    ).toBeNull();
  });
});
