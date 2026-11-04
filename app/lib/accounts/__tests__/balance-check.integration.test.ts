import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({ getAuthenticatedUserId: vi.fn() }));
vi.mock("@/app/lib/auth", () => ({ getAuthenticatedUserId: authMocks.getAuthenticatedUserId }));

import { buildAdjustmentPayload, evaluateBalanceCheck } from "@/app/lib/accounts/balance-check";
import { prisma } from "@/app/lib/prisma";
import { getAccountReconciliationPreview } from "@/app/lib/transactions/reconciliation-preview";
import { transactionCrud } from "@/app/lib/transactions/transaction-crud";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function realizedBalance(accountId: string, statementBalance: number, cutoff: { year: number; month: number; day: number }) {
  const query = new URLSearchParams({
    year: String(cutoff.year),
    month: String(cutoff.month),
    day: String(cutoff.day),
    statementBalance: String(statementBalance),
  });
  const response = await getAccountReconciliationPreview(
    new Request(`http://localhost/api/accounts/${accountId}/reconciliation?${query}`),
    { params: Promise.resolve({ id: accountId }) },
  );
  expect(response.status).toBe(200);
  return (await response.json()).data.realizedBalance as number;
}

describe("conferência de saldo + ajuste", () => {
  it("o ajuste calculado leva o saldo do app ao do extrato; pendentes e lançamentos depois da data ficam de fora", async () => {
    const owner = await fixtures.user({ name: "Balance Check Owner" });
    const account = await fixtures.account(owner.id, { name: "Conta conferida", currency: "BRL" });
    const [income, expense] = await Promise.all([
      fixtures.category(owner.id, { name: "Receitas", type: "INCOME" }),
      fixtures.category(owner.id, { name: "Despesas", type: "EXPENSE" }),
    ]);
    const base = { userId: owner.id, accountId: account.id, year: 2031, month: 5 };
    await prisma.transaction.createMany({
      data: [
        { ...base, day: 2, type: "INCOME", status: "COMPLETED", amount: 100_000, description: "Salário", categoryId: income.id },
        { ...base, day: 5, type: "EXPENSE", status: "COMPLETED", amount: 30_000, description: "Mercado", categoryId: expense.id },
        // Fora da conta: pendente e posterior à data de corte.
        { ...base, day: 8, type: "EXPENSE", status: "PENDING", amount: 9_999, description: "Pendente", categoryId: expense.id },
        { ...base, day: 20, type: "EXPENSE", status: "COMPLETED", amount: 5_000, description: "Depois", categoryId: expense.id },
      ],
    });
    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const cutoff = { year: 2031, month: 5, day: 10 };

    const statement = 72_500;
    const check = evaluateBalanceCheck(statement, await realizedBalance(account.id, statement, cutoff));
    expect(check.appBalance).toBe(70_000);
    expect(check.difference).toBe(2_500);
    expect(check.adjustment).toEqual({ type: "INCOME", amount: 2_500 });

    const payload = buildAdjustmentPayload({ check, accountId: account.id, categoryId: income.id, date: cutoff })!;
    const created = await transactionCrud.create(
      new Request("http://localhost/api/transactions", { method: "POST", body: JSON.stringify(payload) }),
    );
    expect(created.status).toBe(201);

    const after = evaluateBalanceCheck(statement, await realizedBalance(account.id, statement, cutoff));
    expect(after.matches).toBe(true);
    expect(after.adjustment).toBeNull();
  });

  it("não deixa consultar a conta de outro usuário", async () => {
    const owner = await fixtures.user({ name: "Balance Owner" });
    const intruder = await fixtures.user({ name: "Balance Intruder" });
    const account = await fixtures.account(owner.id, { name: "Conta privada", currency: "BRL" });
    authMocks.getAuthenticatedUserId.mockResolvedValue(intruder.id);

    const response = await getAccountReconciliationPreview(
      new Request(`http://localhost/api/accounts/${account.id}/reconciliation?year=2031&month=5&day=10&statementBalance=0`),
      { params: Promise.resolve({ id: account.id }) },
    );
    expect(response.status).toBe(404);
  });
});
