import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { importRuleCrud } from "@/app/lib/transactions/import/import-rule-crud";
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

    const equivalentResponse = await importRuleCrud.create(
      new Request("http://localhost/api/import-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validInput,
          name: "Mercado duplicado",
          descriptionPattern: "  MERCADO  ",
        }),
      })
    );
    const equivalentBody = await equivalentResponse.json();
    expect(equivalentResponse.status).toBe(409);
    expect(equivalentBody.error?.code).toBe("IMPORT_RULE_EQUIVALENT");

    const broadPatternResponse = await importRuleCrud.create(
      new Request("http://localhost/api/import-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validInput,
          name: "Regra ampla",
          descriptionOperator: "CONTAINS",
          descriptionPattern: "a",
        }),
      })
    );
    const broadPatternBody = await broadPatternResponse.json();
    expect(broadPatternResponse.status).toBe(400);
    expect(broadPatternBody.error?.code).toBe("IMPORT_RULE_PATTERN_TOO_BROAD");

    const alternateCategory = await prisma.category.create({
      data: {
        name: `Outra despesa ${suffix}`.slice(0, 50),
        type: "EXPENSE",
        userId: owner.id,
      },
    });
    const legitimateOverlapResponse = await importRuleCrud.create(
      new Request("http://localhost/api/import-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validInput,
          name: "Mercado exato com prioridade menor",
          priority: 20,
          descriptionOperator: "EQUALS",
          descriptionPattern: "mercado central",
          categoryId: alternateCategory.id,
        }),
      })
    );
    const legitimateOverlapBody = await legitimateOverlapResponse.json();
    expect(legitimateOverlapResponse.status).toBe(201);
    await prisma.transactionImportRule.delete({
      where: { id: legitimateOverlapBody.data.id as string },
    });

    const conflictResponse = await importRuleCrud.create(
      new Request("http://localhost/api/import-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...validInput,
          name: "Mercado conflitante",
          categoryId: alternateCategory.id,
        }),
      })
    );
    const conflictBody = await conflictResponse.json();
    expect(conflictResponse.status).toBe(409);
    expect(conflictBody.error?.code).toBe("IMPORT_RULE_CONFLICT");

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
  it("does not create administrative duplicates for equivalent concurrent creates", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Concurrent Rule Owner",
        email: `rule-concurrent-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [account, category] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta concorrente ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria concorrente ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
    ]);

    const input = {
      name: "Mercado concorrente",
      isActive: true,
      priority: 10,
      accountId: account.id,
      transactionType: "EXPENSE" as const,
      descriptionOperator: "CONTAINS" as const,
      descriptionPattern: "mercado concorrente",
      minAmountCents: null,
      maxAmountCents: null,
      categoryId: category.id,
      normalizedDescription: null,
    };

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const create = () =>
      importRuleCrud.create(
        new Request("http://localhost/api/import-rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
      );

    const responses = await Promise.all([create(), create()]);
    expect(responses.map((response) => response.status).sort()).toEqual([
      201,
      409,
    ]);
    expect(
      await prisma.transactionImportRule.count({
        where: { userId: owner.id },
      }),
    ).toBe(1);
  });

  it("returns 409 when concurrent creates target the same matcher with different outcomes", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Concurrent Conflict Owner",
        email: `rule-conflict-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [account, firstCategory, secondCategory] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta conflito ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria A ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria B ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
    ]);

    const baseInput = {
      name: "Matcher concorrente",
      isActive: true,
      priority: 10,
      accountId: account.id,
      transactionType: "EXPENSE" as const,
      descriptionOperator: "EQUALS" as const,
      descriptionPattern: "uber concorrente",
      minAmountCents: null,
      maxAmountCents: null,
      normalizedDescription: null,
    };

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const requestFor = (categoryId: string) =>
      importRuleCrud.create(
        new Request("http://localhost/api/import-rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ ...baseInput, categoryId }),
        }),
      );

    const responses = await Promise.all([
      requestFor(firstCategory.id),
      requestFor(secondCategory.id),
    ]);
    const statuses = responses.map((response) => response.status).sort();
    expect(statuses).toEqual([201, 409]);

    const conflictResponse = responses.find((response) => response.status === 409);
    expect(conflictResponse).toBeDefined();
    expect((await conflictResponse!.json()).error?.code).toBe("IMPORT_RULE_CONFLICT");
    expect(
      await prisma.transactionImportRule.count({
        where: { userId: owner.id },
      }),
    ).toBe(1);
  });

  it("serializes update/create races for the same matcher", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Update Create Owner",
        email: `rule-update-create-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [account, category] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta update/create ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria update/create ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
    ]);

    const existing = await prisma.transactionImportRule.create({
      data: {
        name: "Regra original",
        isActive: true,
        priority: 10,
        accountId: account.id,
        transactionType: "EXPENSE",
        descriptionOperator: "EQUALS",
        descriptionPattern: "matcher original",
        minAmountCents: null,
        maxAmountCents: null,
        categoryId: category.id,
        normalizedDescription: null,
        userId: owner.id,
      },
    });

    const targetInput = {
      name: "Regra alvo",
      isActive: true,
      priority: 10,
      accountId: account.id,
      transactionType: "EXPENSE" as const,
      descriptionOperator: "EQUALS" as const,
      descriptionPattern: "matcher alvo",
      minAmountCents: null,
      maxAmountCents: null,
      categoryId: category.id,
      normalizedDescription: null,
    };

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const [updateResponse, createResponse] = await Promise.all([
      importRuleCrud.update(
        new Request(`http://localhost/api/import-rules/${existing.id}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(targetInput),
        }),
        { params: Promise.resolve({ id: existing.id }) },
      ),
      importRuleCrud.create(
        new Request("http://localhost/api/import-rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(targetInput),
        }),
      ),
    ]);

    const statuses = [updateResponse.status, createResponse.status];
    expect(statuses.filter((status) => status === 409)).toHaveLength(1);
    expect(statuses.filter((status) => status === 200 || status === 201)).toHaveLength(1);

    const stored = await prisma.transactionImportRule.findMany({
      where: { userId: owner.id },
      select: { descriptionPattern: true },
    });
    expect(
      stored.filter(
        (rule) => rule.descriptionPattern.trim().toLowerCase() === "matcher alvo",
      ),
    ).toHaveLength(1);
  });

  it.each(["BRL", "USD", "EUR"] as const)(
    "scopes monetary ranges to a specific %s account without currency conversion",
    async (currency) => {
      const suffix = randomUUID();
      const owner = await prisma.user.create({
        data: {
          name: `Currency Rule Owner ${currency}`,
          email: `rule-currency-${currency.toLowerCase()}-${suffix}@example.com`,
          password: "test-hash",
        },
      });
      createdUserIds.push(owner.id);

      const [account, category] = await Promise.all([
        prisma.account.create({
          data: {
            name: `Conta ${currency} ${suffix}`,
            type: "CREDIT_DEBIT",
            currency,
            userId: owner.id,
          },
        }),
        prisma.category.create({
          data: {
            name: `Categoria ${currency} ${suffix}`.slice(0, 50),
            type: "EXPENSE",
            userId: owner.id,
          },
        }),
      ]);

      const input = {
        name: `Faixa ${currency}`,
        isActive: true,
        priority: 10,
        accountId: account.id,
        transactionType: "EXPENSE" as const,
        descriptionOperator: "EQUALS" as const,
        descriptionPattern: `range ${currency.toLowerCase()}`,
        minAmountCents: 10_000,
        maxAmountCents: 20_000,
        categoryId: category.id,
        normalizedDescription: null,
      };

      authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
      const scopedResponse = await importRuleCrud.create(
        new Request("http://localhost/api/import-rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(input),
        }),
      );
      expect(scopedResponse.status).toBe(201);

      const stored = await prisma.transactionImportRule.findFirstOrThrow({
        where: { userId: owner.id, accountId: account.id },
      });
      expect(stored.minAmountCents).toBe(10_000);
      expect(stored.maxAmountCents).toBe(20_000);

      const globalResponse = await importRuleCrud.create(
        new Request("http://localhost/api/import-rules", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            ...input,
            name: `Faixa global ${currency}`,
            accountId: null,
            descriptionPattern: `global range ${currency.toLowerCase()}`,
          }),
        }),
      );
      expect(globalResponse.status).toBe(400);
    },
  );

  it("returns 400 for out-of-domain rule fields before persistence", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Rule Domain Owner",
        email: `rule-domain-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [account, category] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta domínio ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria domínio ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await importRuleCrud.create(
      new Request("http://localhost/api/import-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Overflow priority",
          isActive: true,
          priority: 2_147_483_648,
          accountId: account.id,
          transactionType: "EXPENSE",
          descriptionOperator: "EQUALS",
          descriptionPattern: "overflow priority",
          minAmountCents: null,
          maxAmountCents: null,
          categoryId: category.id,
          normalizedDescription: null,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(
      await prisma.transactionImportRule.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("never turns numeric overflow into a 500 response", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Rule Overflow Owner",
        email: `rule-overflow-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [account, category] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta overflow ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria overflow ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await importRuleCrud.create(
      new Request("http://localhost/api/import-rules", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Overflow amount",
          isActive: true,
          priority: 0,
          accountId: account.id,
          transactionType: "EXPENSE",
          descriptionOperator: "EQUALS",
          descriptionPattern: "overflow amount",
          minAmountCents: null,
          maxAmountCents: 2_147_483_648,
          categoryId: category.id,
          normalizedDescription: null,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);
  });

});
