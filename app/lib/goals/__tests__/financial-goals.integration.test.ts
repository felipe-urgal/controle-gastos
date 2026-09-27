import { afterAll, afterEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { withDerivedAccountBalance } from "@/app/lib/accounts/account-balance";
import { createFinancialGoalEntryForUser } from "@/app/lib/goals/financial-goal-entries";
import {
  createFinancialGoal,
  getFinancialGoal,
  removeFinancialGoal,
  updateFinancialGoal,
} from "@/app/lib/goals/financial-goals";
import { prisma } from "@/app/lib/prisma";
import { FinancialTestFactory } from "@/tests/support/financial-test-factory";

const fixtures = new FinancialTestFactory();

afterEach(async () => {
  authMocks.getAuthenticatedUserId.mockReset();
  await fixtures.cleanup();
});

afterAll(async () => {
  await prisma.$disconnect();
});

async function createGoalFixture() {
  const [owner, other] = await Promise.all([
    fixtures.user({ name: "Goal Owner" }),
    fixtures.user({ name: "Goal Other" }),
  ]);
  const [brlAccount, usdAccount, foreignAccount] = await Promise.all([
    fixtures.account(owner.id, {
      name: "Goal BRL",
      currency: "BRL",
    }),
    fixtures.account(owner.id, {
      name: "Goal USD",
      currency: "USD",
    }),
    fixtures.account(other.id, {
      name: "Goal Foreign",
      currency: "BRL",
    }),
  ]);

  return { owner, other, brlAccount, usdAccount, foreignAccount };
}

async function createGoalThroughApi(
  ownerId: string,
  body: Record<string, unknown>,
) {
  authMocks.getAuthenticatedUserId.mockResolvedValue(ownerId);
  return createFinancialGoal(
    new Request("http://localhost/api/goals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("financial goals integration", () => {
  it("creates a virtual goal linked only to an owned account in the same currency", async () => {
    const { owner, brlAccount } = await createGoalFixture();

    const response = await createGoalThroughApi(owner.id, {
      name: "Reserva",
      targetAmount: 100_000,
      currency: "BRL",
      targetDate: "2027-12-31",
      accountId: brlAccount.id,
      description: "Reserva de emergência",
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toMatchObject({
      name: "Reserva",
      targetAmount: 100_000,
      currentAmount: 0,
      remainingAmount: 100_000,
      percentage: 0,
      status: "ACTIVE",
      targetDate: "2027-12-31",
      account: {
        id: brlAccount.id,
        currency: "BRL",
      },
    });
    expect(
      await prisma.transaction.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("rejects foreign and incompatible-currency account links without revealing ownership", async () => {
    const { owner, usdAccount, foreignAccount } = await createGoalFixture();

    for (const accountId of [usdAccount.id, foreignAccount.id]) {
      const response = await createGoalThroughApi(owner.id, {
        name: "Viagem",
        targetAmount: 50_000,
        currency: "BRL",
        accountId,
      });

      expect(response.status).toBe(400);
    }

    expect(
      await prisma.financialGoal.count({ where: { userId: owner.id } }),
    ).toBe(0);
  });

  it("derives progress from history and completes/reopens deterministically", async () => {
    const { owner, brlAccount } = await createGoalFixture();
    const createdResponse = await createGoalThroughApi(owner.id, {
      name: "Notebook",
      targetAmount: 20_000,
      currency: "BRL",
      accountId: brlAccount.id,
    });
    const created = (await createdResponse.json()).data;

    const first = await createFinancialGoalEntryForUser(owner.id, created.id, {
      type: "CONTRIBUTION",
      amount: 12_000,
      description: "Primeiro aporte",
    });
    expect(first.goal).toMatchObject({
      currentAmount: 12_000,
      remainingAmount: 8_000,
      percentage: 60,
      status: "ACTIVE",
    });

    const completed = await createFinancialGoalEntryForUser(owner.id, created.id, {
      type: "CONTRIBUTION",
      amount: 8_000,
      description: "Completar meta",
    });
    expect(completed.goal).toMatchObject({
      currentAmount: 20_000,
      remainingAmount: 0,
      percentage: 100,
      status: "COMPLETED",
    });

    const withdrawn = await createFinancialGoalEntryForUser(owner.id, created.id, {
      type: "WITHDRAWAL",
      amount: 5_000,
      description: "Uso parcial",
    });
    expect(withdrawn.goal).toMatchObject({
      currentAmount: 15_000,
      remainingAmount: 5_000,
      percentage: 75,
      status: "ACTIVE",
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const getResponse = await getFinancialGoal(
      new Request(`http://localhost/api/goals/${created.id}`),
      { params: Promise.resolve({ id: created.id }) },
    );
    const goal = (await getResponse.json()).data;

    expect(goal.entries).toHaveLength(3);
    expect(goal).toMatchObject({
      contributions: 20_000,
      withdrawals: 5_000,
      currentAmount: 15_000,
    });
  });

  it("reducing the target below progress completes the goal without changing history", async () => {
    const { owner } = await createGoalFixture();
    const createdResponse = await createGoalThroughApi(owner.id, {
      name: "Curso",
      targetAmount: 30_000,
      currency: "BRL",
    });
    const created = (await createdResponse.json()).data;

    await createFinancialGoalEntryForUser(owner.id, created.id, {
      type: "CONTRIBUTION",
      amount: 18_000,
      description: null,
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await updateFinancialGoal(
      new Request(`http://localhost/api/goals/${created.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ targetAmount: 15_000 }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject({
      targetAmount: 15_000,
      currentAmount: 18_000,
      remainingAmount: 0,
      percentage: 120,
      status: "COMPLETED",
    });
    expect(
      await prisma.financialGoalEntry.count({ where: { goalId: created.id } }),
    ).toBe(1);
  });

  it("locks currency after history and protects historical goals from deletion", async () => {
    const { owner } = await createGoalFixture();
    const createdResponse = await createGoalThroughApi(owner.id, {
      name: "Mudança",
      targetAmount: 10_000,
      currency: "BRL",
    });
    const created = (await createdResponse.json()).data;

    await createFinancialGoalEntryForUser(owner.id, created.id, {
      type: "CONTRIBUTION",
      amount: 1_000,
      description: null,
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const updateResponse = await updateFinancialGoal(
      new Request(`http://localhost/api/goals/${created.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currency: "USD" }),
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(updateResponse.status).toBe(409);

    const deleteResponse = await removeFinancialGoal(
      new Request(`http://localhost/api/goals/${created.id}`, {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: created.id }) },
    );
    expect(deleteResponse.status).toBe(409);
  });

  it("never allows concurrent withdrawals to make progress negative", async () => {
    const { owner } = await createGoalFixture();
    const goal = await prisma.financialGoal.create({
      data: {
        name: "Concorrência",
        targetAmount: 50_000,
        currency: "BRL",
        userId: owner.id,
      },
    });
    await createFinancialGoalEntryForUser(owner.id, goal.id, {
      type: "CONTRIBUTION",
      amount: 10_000,
      description: null,
    });

    const results = await Promise.allSettled([
      createFinancialGoalEntryForUser(owner.id, goal.id, {
        type: "WITHDRAWAL",
        amount: 7_000,
        description: "A",
      }),
      createFinancialGoalEntryForUser(owner.id, goal.id, {
        type: "WITHDRAWAL",
        amount: 7_000,
        description: "B",
      }),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const rows = await prisma.financialGoalEntry.groupBy({
      by: ["type"],
      where: { userId: owner.id, goalId: goal.id },
      _sum: { amount: true },
    });
    const contributions =
      rows.find((row) => row.type === "CONTRIBUTION")?._sum.amount ?? 0;
    const withdrawals =
      rows.find((row) => row.type === "WITHDRAWAL")?._sum.amount ?? 0;
    expect(contributions - withdrawals).toBe(3_000);
  });

  it("goal contributions do not create financial transactions or mutate account balance", async () => {
    const { owner, brlAccount } = await createGoalFixture();
    const category = await fixtures.category(owner.id, { type: "INCOME" });
    await fixtures.transaction({
      userId: owner.id,
      accountId: brlAccount.id,
      categoryId: category.id,
      overrides: {
        type: "INCOME",
        amount: 40_000,
      },
    });
    const before = await withDerivedAccountBalance(brlAccount, owner.id);
    const transactionCount = await prisma.transaction.count({
      where: { userId: owner.id },
    });

    const goal = await prisma.financialGoal.create({
      data: {
        name: "Virtual",
        targetAmount: 50_000,
        currency: "BRL",
        userId: owner.id,
        accountId: brlAccount.id,
      },
    });
    await createFinancialGoalEntryForUser(owner.id, goal.id, {
      type: "CONTRIBUTION",
      amount: 10_000,
      description: null,
    });

    expect(
      await prisma.transaction.count({ where: { userId: owner.id } }),
    ).toBe(transactionCount);
    await expect(
      withDerivedAccountBalance(brlAccount, owner.id),
    ).resolves.toMatchObject({ balance: before.balance });
  });

  it("does not expose another user's goal", async () => {
    const { owner, other } = await createGoalFixture();
    const foreignGoal = await prisma.financialGoal.create({
      data: {
        name: "Segredo",
        targetAmount: 10_000,
        currency: "BRL",
        userId: other.id,
      },
    });

    authMocks.getAuthenticatedUserId.mockResolvedValue(owner.id);
    const response = await getFinancialGoal(
      new Request(`http://localhost/api/goals/${foreignGoal.id}`),
      { params: Promise.resolve({ id: foreignGoal.id }) },
    );

    expect(response.status).toBe(404);
  });
});
