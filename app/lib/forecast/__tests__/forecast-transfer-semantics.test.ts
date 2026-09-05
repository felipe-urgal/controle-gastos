import { describe, expect, it } from "vitest";
import { buildForecast } from "@/app/lib/forecast/forecast-engine";

describe("forecast transfer semantics", () => {
  it("moves projected account balances without contaminating operational income and expense", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts: [
        { id: "source", name: "Origem", balance: 10_000 },
        { id: "destination", name: "Destino", balance: 2_000 },
      ],
      transactions: [
        {
          id: "transfer-source",
          accountId: "source",
          amount: 3_000,
          type: "EXPENSE",
          kind: "TRANSFER",
          status: "PENDING",
          description: "Transferência",
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          id: "transfer-destination",
          accountId: "destination",
          amount: 3_000,
          type: "INCOME",
          kind: "TRANSFER",
          status: "PENDING",
          description: "Transferência",
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          id: "external-expense",
          accountId: "source",
          amount: 500,
          type: "EXPENSE",
          kind: "NORMAL",
          status: "PENDING",
          description: "Conta externa",
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          id: "external-income",
          accountId: "destination",
          amount: 1_000,
          type: "INCOME",
          kind: "NORMAL",
          status: "PENDING",
          description: "Receita externa",
          year: 2026,
          month: 9,
          day: 10,
        },
      ],
    });

    const source = result.accounts.find((account) => account.id === "source")!;
    const destination = result.accounts.find(
      (account) => account.id === "destination"
    )!;

    expect(source.pendingIncome).toBe(0);
    expect(source.pendingExpense).toBe(500);
    expect(source.projectedBalance).toBe(6_500);
    expect(source.timeline).toEqual([
      {
        date: { year: 2026, month: 9, day: 10 },
        income: 0,
        expense: 500,
        transferDelta: -3_000,
        delta: -3_500,
        balance: 6_500,
      },
    ]);

    expect(destination.pendingIncome).toBe(1_000);
    expect(destination.pendingExpense).toBe(0);
    expect(destination.projectedBalance).toBe(6_000);
    expect(destination.timeline).toEqual([
      {
        date: { year: 2026, month: 9, day: 10 },
        income: 1_000,
        expense: 0,
        transferDelta: 3_000,
        delta: 4_000,
        balance: 6_000,
      },
    ]);

    expect(
      result.accounts.reduce((total, account) => total + account.projectedBalance, 0)
    ).toBe(12_500);
    expect(result.upcoming.map((item) => item.id)).toEqual([
      "external-expense",
      "external-income",
      "transfer-destination",
      "transfer-source",
    ]);
  });

  it("keeps legacy callers without kind equivalent to NORMAL", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts: [{ id: "account", name: "Conta", balance: 1_000 }],
      transactions: [
        {
          id: "legacy",
          accountId: "account",
          amount: 250,
          type: "EXPENSE",
          status: "PENDING",
          description: "Legado",
          year: 2026,
          month: 9,
          day: 6,
        },
      ],
    });

    expect(result.accounts[0].pendingExpense).toBe(250);
    expect(result.accounts[0].projectedBalance).toBe(750);
    expect(result.accounts[0].timeline[0]).not.toHaveProperty("transferDelta");
  });
});
