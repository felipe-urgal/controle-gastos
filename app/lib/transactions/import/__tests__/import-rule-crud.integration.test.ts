import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { importRuleCrud, renumberImportRules } from "@/app/lib/transactions/import/import-rule-crud";
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
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);
  });


  it("exposes effective dependency state and allows pausing a broken rule without reactivating dependencies", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Broken Rule Owner",
        email: `rule-broken-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [account, category, secondCategory] = await Promise.all([
      prisma.account.create({
        data: {
          name: `Conta quebrada ${suffix}`,
          type: "CREDIT_DEBIT",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria quebrada ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Categoria conta quebrada ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
    ]);

    const firstRule = await prisma.transactionImportRule.create({
      data: {
        name: "Regra categoria quebrada",
        isActive: true,
        priority: 10,
        accountId: account.id,
        transactionType: "EXPENSE",
        descriptionOperator: "EQUALS",
        descriptionPattern: "categoria quebrada",
        categoryId: category.id,
        userId: owner.id,
      },
    });
    const secondRule = await prisma.transactionImportRule.create({
      data: {
        name: "Regra conta quebrada",
        isActive: true,
        priority: 20,
        accountId: account.id,
        transactionType: "EXPENSE",
        descriptionOperator: "EQUALS",
        descriptionPattern: "conta quebrada",
        categoryId: secondCategory.id,
        userId: owner.id,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    await prisma.category.update({
      where: { id: category.id },
      data: { isActive: false },
    });

    const categoryBrokenResponse = await importRuleCrud.list(
      new Request("http://localhost/api/import-rules?page=1&pageSize=20"),
    );
    const categoryBrokenBody = await categoryBrokenResponse.json();
    const categoryBroken = categoryBrokenBody.data.items.find(
      (rule: { id: string }) => rule.id === firstRule.id,
    );
    expect(categoryBroken?.effectiveState).toBe("BROKEN_CATEGORY");

    const pauseResponse = await importRuleCrud.update(
      new Request(`http://localhost/api/import-rules/${firstRule.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: firstRule.name,
          isActive: false,
          priority: firstRule.priority,
          accountId: firstRule.accountId,
          transactionType: firstRule.transactionType,
          descriptionOperator: firstRule.descriptionOperator,
          descriptionPattern: firstRule.descriptionPattern,
          minAmountCents: firstRule.minAmountCents,
          maxAmountCents: firstRule.maxAmountCents,
          categoryId: firstRule.categoryId,
        }),
      }),
      { params: Promise.resolve({ id: firstRule.id }) },
    );
    const pauseBody = await pauseResponse.json();
    expect(pauseResponse.status).toBe(200);
    expect(pauseBody.data.effectiveState).toBe("PAUSED");
    expect(
      await prisma.category.findUniqueOrThrow({
        where: { id: category.id },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: false });

    await prisma.account.update({
      where: { id: account.id },
      data: { isActive: false },
    });
    const accountBrokenResponse = await importRuleCrud.getById(
      new Request(`http://localhost/api/import-rules/${secondRule.id}`),
      { params: Promise.resolve({ id: secondRule.id }) },
    );
    const accountBrokenBody = await accountBrokenResponse.json();
    expect(accountBrokenBody.data.effectiveState).toBe("BROKEN_ACCOUNT");
    expect(
      await prisma.account.findUniqueOrThrow({
        where: { id: account.id },
        select: { isActive: true },
      }),
    ).toEqual({ isActive: false });
  });

  it("paginates, searches, filters and renumbers rules without loading the full list", async () => {
    const suffix = randomUUID();
    const owner = await prisma.user.create({
      data: {
        name: "Paged Rule Owner",
        email: `rule-paged-${suffix}@example.com`,
        password: "test-hash",
      },
    });
    createdUserIds.push(owner.id);

    const [expenseAccount, incomeAccount, expenseCategory, incomeCategory] =
      await Promise.all([
        prisma.account.create({
          data: {
            name: `Conta despesas ${suffix}`,
            type: "CREDIT_DEBIT",
            userId: owner.id,
          },
        }),
        prisma.account.create({
          data: {
            name: `Conta receitas ${suffix}`,
            type: "CREDIT_DEBIT",
            userId: owner.id,
          },
        }),
        prisma.category.create({
          data: {
            name: `Despesa paginação ${suffix}`.slice(0, 50),
            type: "EXPENSE",
            userId: owner.id,
          },
        }),
        prisma.category.create({
          data: {
            name: `Receita paginação ${suffix}`.slice(0, 50),
            type: "INCOME",
            userId: owner.id,
          },
        }),
      ]);

    await prisma.transactionImportRule.createMany({
      data: Array.from({ length: 25 }, (_, index) => {
        const expense = index < 13;
        return {
          name: `Regra paginada ${String(index).padStart(2, "0")}`,
          isActive: index % 2 === 0,
          priority: 1_000 - index * 7,
          accountId: expense ? expenseAccount.id : incomeAccount.id,
          transactionType: expense ? ("EXPENSE" as const) : ("INCOME" as const),
          descriptionOperator: "EQUALS" as const,
          descriptionPattern: `padrão paginado ${String(index).padStart(2, "0")}`,
          categoryId: expense ? expenseCategory.id : incomeCategory.id,
          userId: owner.id,
        };
      }),
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const pageResponse = await importRuleCrud.list(
      new Request("http://localhost/api/import-rules?page=2&pageSize=10"),
    );
    const pageBody = await pageResponse.json();
    expect(pageResponse.status).toBe(200);
    expect(pageBody.data.items).toHaveLength(10);
    expect(pageBody.data.total).toBe(25);
    expect(pageBody.data.page).toBe(2);
    expect(pageBody.data.pageSize).toBe(10);
    expect(pageBody.data.totalPages).toBe(3);
    expect(pageBody.data.summary.nextPriority).toBe(1_010);

    const searchResponse = await importRuleCrud.list(
      new Request(
        "http://localhost/api/import-rules?page=1&pageSize=20&search=paginada%2024",
      ),
    );
    const searchBody = await searchResponse.json();
    expect(searchBody.data.items).toHaveLength(1);
    expect(searchBody.data.items[0].name).toBe("Regra paginada 24");

    const filterResponse = await importRuleCrud.list(
      new Request(
        `http://localhost/api/import-rules?page=1&pageSize=20&isActive=true&accountId=${expenseAccount.id}&transactionType=EXPENSE`,
      ),
    );
    const filterBody = await filterResponse.json();
    expect(filterBody.data.items.length).toBeGreaterThan(0);
    expect(
      filterBody.data.items.every(
        (rule: {
          isActive: boolean;
          accountId: string | null;
          transactionType: string;
        }) =>
          rule.isActive &&
          rule.accountId === expenseAccount.id &&
          rule.transactionType === "EXPENSE",
      ),
    ).toBe(true);

    const renumberResponse = await renumberImportRules();
    const renumberBody = await renumberResponse.json();
    expect(renumberResponse.status).toBe(200);
    expect(renumberBody.data).toEqual({
      updated: 25,
      nextPriority: 250,
    });

    const priorities = await prisma.transactionImportRule.findMany({
      where: { userId: owner.id },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      select: { priority: true },
    });
    expect(priorities.map((rule) => rule.priority)).toEqual(
      Array.from({ length: 25 }, (_, index) => index * 10),
    );
  });

});
