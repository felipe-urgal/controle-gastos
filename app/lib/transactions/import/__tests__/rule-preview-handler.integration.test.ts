import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

const observabilityMocks = vi.hoisted(() => ({
  logServerOperation: vi.fn(),
}));

vi.mock("@/app/lib/observability", () => ({
  getRequestId: (request: Request) =>
    request.headers.get("x-request-id") ?? "test-request-12345678",
  withRequestId: (response: Response, requestId: string) => {
    response.headers.set("x-request-id", requestId);
    return response;
  },
  logServerOperation: observabilityMocks.logServerOperation,
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import { previewTransactionImportWithRules } from "@/app/lib/transactions/import/rule-preview-handler";

const createdUserIds: string[] = [];

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

function previewRequest(accountId: string) {
  const formData = new FormData();
  formData.append("accountId", accountId);
  formData.append(
    "file",
    new File(["data,descricao,valor\n2026-08-31,Café,-10.01"], "extrato.csv", {
      type: "text/csv",
    }),
  );

  return new Request("http://localhost/api/transactions/import/preview", {
    method: "POST",
    headers: { "x-request-id": "import-preview-test" },
    body: formData,
  });
}

describe("import rule preview ownership", () => {
  it("applies only owned rules and never exposes a matching rule from another user", async () => {
    const suffix = randomUUID();
    const [owner, otherUser] = await Promise.all([
      prisma.user.create({
        data: {
          name: "Preview Rule Owner",
          email: `preview-rule-owner-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
      prisma.user.create({
        data: {
          name: "Preview Rule Other",
          email: `preview-rule-other-${suffix}@example.com`,
          password: "test-hash",
        },
      }),
    ]);
    createdUserIds.push(owner.id, otherUser.id);

    const account = await prisma.account.create({
      data: {
        name: `Conta ${suffix}`,
        type: "CREDIT_DEBIT",
        currency: "BRL",
        userId: owner.id,
      },
    });

    const [ownerCategory, foreignCategory] = await Promise.all([
      prisma.category.create({
        data: {
          name: `Café próprio ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: owner.id,
        },
      }),
      prisma.category.create({
        data: {
          name: `Café externo ${suffix}`.slice(0, 50),
          type: "EXPENSE",
          userId: otherUser.id,
        },
      }),
    ]);

    const [foreignRule, ownerRule] = await Promise.all([
      prisma.transactionImportRule.create({
        data: {
          userId: otherUser.id,
          name: "Regra externa",
          isActive: true,
          priority: 1,
          accountId: null,
          transactionType: "EXPENSE",
          descriptionOperator: "CONTAINS",
          descriptionPattern: "café",
          categoryId: foreignCategory.id,
          normalizedDescription: "Descrição externa",
        },
      }),
      prisma.transactionImportRule.create({
        data: {
          userId: owner.id,
          name: "Regra própria",
          isActive: true,
          priority: 20,
          accountId: account.id,
          transactionType: "EXPENSE",
          descriptionOperator: "CONTAINS",
          descriptionPattern: "café",
          categoryId: ownerCategory.id,
          normalizedDescription: "Café próprio",
        },
      }),
    ]);

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const transactionCountBefore = await prisma.transaction.count({
      where: { userId: owner.id },
    });

    const response = await previewTransactionImportWithRules(previewRequest(account.id));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.data.items).toHaveLength(1);
    expect(body.data.items[0]).toMatchObject({
      matchedRuleId: ownerRule.id,
      matchedRuleName: "Regra própria",
      suggestedCategoryId: ownerCategory.id,
      suggestedDescription: "Café próprio",
    });
    expect(serialized).not.toContain(foreignRule.id);
    expect(serialized).not.toContain(foreignCategory.id);
    expect(serialized).not.toContain("Regra externa");
    expect(serialized).not.toContain("Descrição externa");
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } }),
    ).toBe(transactionCountBefore);
    expect(observabilityMocks.logServerOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "transaction_import_preview",
        requestId: "import-preview-test",
        route: "/api/transactions/import/preview",
        status: 200,
        startedAt: expect.any(Number),
        context: {
          result: "success",
          itemCount: 1,
          ruleCount: 1,
          validCount: 1,
          invalidCount: 0,
          duplicateCount: 0,
        },
      }),
    );
  });
});
