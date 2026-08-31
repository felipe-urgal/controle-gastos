import { randomUUID } from "node:crypto";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { prisma } from "@/app/lib/prisma";
import {
  confirmTransactionImport,
  previewTransactionImport,
} from "@/app/lib/transactions/import/transaction-import";

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

async function createFixture() {
  const suffix = randomUUID();
  const [owner, otherUser] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Import Owner",
        email: `import-owner-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
    prisma.user.create({
      data: {
        name: "Import Other",
        email: `import-other-${suffix}@example.com`,
        password: "test-hash",
      },
    }),
  ]);
  createdUserIds.push(owner.id, otherUser.id);

  const [account, otherAccount] = await Promise.all([
    prisma.account.create({
      data: { name: `Conta ${suffix}`, type: "CREDIT_DEBIT", currency: "BRL", userId: owner.id },
    }),
    prisma.account.create({
      data: { name: `Conta externa ${suffix}`, type: "CREDIT_DEBIT", currency: "BRL", userId: otherUser.id },
    }),
  ]);

  const [expenseCategory, incomeCategory, otherCategory] = await Promise.all([
    prisma.category.create({
      data: { name: `Despesa ${suffix}`.slice(0, 50), type: "EXPENSE", userId: owner.id },
    }),
    prisma.category.create({
      data: { name: `Receita ${suffix}`.slice(0, 50), type: "INCOME", userId: owner.id },
    }),
    prisma.category.create({
      data: { name: `Outra ${suffix}`.slice(0, 50), type: "EXPENSE", userId: otherUser.id },
    }),
  ]);

  return { owner, otherUser, account, otherAccount, expenseCategory, incomeCategory, otherCategory };
}

function previewRequest(accountId: string, content: string, name = "extrato.csv") {
  const formData = new FormData();
  formData.append("accountId", accountId);
  formData.append("file", new File([content], name, { type: name.endsWith(".ofx") ? "application/x-ofx" : "text/csv" }));
  return new Request("http://localhost/api/transactions/import/preview", {
    method: "POST",
    body: formData,
  });
}

async function getPreview(accountId: string) {
  const response = await previewTransactionImport(previewRequest(
    accountId,
    "data,descricao,valor\n2026-08-31,Café,-10.01\n2026-08-30,Salário,1234.56",
  ));
  const body = await response.json();
  return { response, body };
}

describe("transaction import integration", () => {
  it("generates preview without writes and confirms only selected items", async () => {
    const { owner, account, expenseCategory, incomeCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const { response, body } = await getPreview(account.id);
    expect(response.status).toBe(200);
    expect(body.data.summary).toEqual({ total: 2, valid: 2, invalid: 0, duplicates: 0 });
    expect(body.data.items.map((item: { amountCents: number }) => item.amountCents)).toEqual([1001, 123456]);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);

    const items = body.data.items.map((item: { index: number; type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: item.index === 0,
      categoryId: item.type === "EXPENSE" ? expenseCategory.id : incomeCategory.id,
    }));
    const confirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: body.data.previewToken, items }),
    }));
    const confirmBody = await confirm.json();

    expect(confirm.status).toBe(201);
    expect(confirmBody.data).toEqual({ selected: 1, created: 1, duplicates: 0 });
    const transactions = await prisma.transaction.findMany({ where: { userId: owner.id } });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toMatchObject({
      amount: 1001,
      type: "EXPENSE",
      categoryId: expenseCategory.id,
      accountId: account.id,
      status: "COMPLETED",
      importSource: "CSV",
    });
    expect(transactions[0].importFingerprint).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects accounts and categories from another user without partial writes", async () => {
    const { owner, account, otherAccount, expenseCategory, incomeCategory, otherCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const foreignAccount = await previewTransactionImport(previewRequest(
      otherAccount.id,
      "data,descricao,valor\n2026-08-31,Café,-10.01",
    ));
    expect(foreignAccount.status).toBe(400);

    const { body } = await getPreview(account.id);
    const items = body.data.items.map((item: { index: number; type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: true,
      categoryId: item.index === 0
        ? expenseCategory.id
        : item.type === "INCOME"
          ? otherCategory.id
          : incomeCategory.id,
    }));
    const confirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: body.data.previewToken, items }),
    }));

    expect(confirm.status).toBe(400);
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(0);
  });

  it("detects an identical reimport and remains idempotent", async () => {
    const { owner, account, expenseCategory, incomeCategory } = await createFixture();
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);

    const firstPreview = await getPreview(account.id);
    const firstItems = firstPreview.body.data.items.map((item: { type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: true,
      categoryId: item.type === "EXPENSE" ? expenseCategory.id : incomeCategory.id,
    }));
    const firstConfirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: firstPreview.body.data.previewToken, items: firstItems }),
    }));
    expect(firstConfirm.status).toBe(201);

    const secondPreview = await getPreview(account.id);
    expect(secondPreview.body.data.summary).toEqual({ total: 2, valid: 0, invalid: 0, duplicates: 2 });
    const duplicateItems = secondPreview.body.data.items.map((item: { type: "INCOME" | "EXPENSE" }) => ({
      ...item,
      selected: true,
      categoryId: item.type === "EXPENSE" ? expenseCategory.id : incomeCategory.id,
    }));
    const secondConfirm = await confirmTransactionImport(new Request("http://localhost/api/transactions/import/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accountId: account.id, previewToken: secondPreview.body.data.previewToken, items: duplicateItems }),
    }));
    const secondBody = await secondConfirm.json();

    expect(secondConfirm.status).toBe(201);
    expect(secondBody.data).toEqual({ selected: 2, created: 0, duplicates: 2 });
    expect(await prisma.transaction.count({ where: { userId: owner.id } })).toBe(2);
  });
});
