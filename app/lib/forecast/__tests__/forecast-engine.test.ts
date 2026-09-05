import { describe, expect, it } from "vitest";
import {
  addLogicalDays,
  buildForecast,
} from "@/app/lib/forecast/forecast-engine";

const accounts = [
  { id: "checking", name: "Conta", balance: 100_00 },
  { id: "savings", name: "Reserva", balance: 500_00 },
];

describe("forecast engine", () => {
  it("adds logical days across month, year and leap February without local timezone", () => {
    expect(addLogicalDays({ year: 2027, month: 12, day: 31 }, 1)).toEqual({
      year: 2028,
      month: 1,
      day: 1,
    });
    expect(addLogicalDays({ year: 2028, month: 2, day: 28 }, 1)).toEqual({
      year: 2028,
      month: 2,
      day: 29,
    });
  });

  it("projects only concrete pending items inside the inclusive horizon", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts,
      transactions: [
        {
          id: "income",
          accountId: "checking",
          amount: 50_00,
          type: "INCOME",
          status: "PENDING",
          description: "Receber",
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          id: "expense",
          accountId: "checking",
          amount: 120_00,
          type: "EXPENSE",
          status: "PENDING",
          description: "Pagar",
          year: 2026,
          month: 9,
          day: 15,
        },
        {
          id: "completed",
          accountId: "checking",
          amount: 999_00,
          type: "EXPENSE",
          status: "COMPLETED",
          description: "Já realizado",
          year: 2026,
          month: 9,
          day: 20,
        },
        {
          id: "cancelled",
          accountId: "checking",
          amount: 999_00,
          type: "EXPENSE",
          status: "CANCELLED",
          description: "Cancelado",
          year: 2026,
          month: 9,
          day: 20,
        },
        {
          id: "outside",
          accountId: "checking",
          amount: 999_00,
          type: "EXPENSE",
          status: "PENDING",
          description: "Fora",
          year: 2026,
          month: 10,
          day: 6,
        },
      ],
    });

    const checking = result.accounts[0];
    expect(checking.pendingIncome).toBe(50_00);
    expect(checking.pendingExpense).toBe(120_00);
    expect(checking.projectedBalance).toBe(30_00);
    expect(checking.lowestProjectedBalance).toBe(30_00);
    expect(checking.lowestProjectedBalanceDate).toEqual({
      year: 2026,
      month: 9,
      day: 15,
    });
    expect(checking.timeline).toHaveLength(2);
  });

  it("keeps overdue pending items separate and does not silently move or apply them", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts,
      transactions: [
        {
          id: "overdue",
          accountId: "checking",
          amount: 20_00,
          type: "EXPENSE",
          status: "PENDING",
          description: "Vencido",
          year: 2026,
          month: 9,
          day: 4,
        },
      ],
    });

    expect(result.overdue.map((item) => item.id)).toEqual(["overdue"]);
    expect(result.accounts[0].projectedBalance).toBe(100_00);
    expect(result.accounts[0].timeline).toEqual([]);
  });

  it("aggregates same-day movements before evaluating the daily minimum", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts: [{ id: "checking", name: "Conta", balance: 100_00 }],
      transactions: [
        {
          id: "a-income",
          accountId: "checking",
          amount: 100_00,
          type: "INCOME",
          status: "PENDING",
          description: "Entrada",
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          id: "b-expense",
          accountId: "checking",
          amount: 150_00,
          type: "EXPENSE",
          status: "PENDING",
          description: "Saída",
          year: 2026,
          month: 9,
          day: 10,
        },
      ],
    });

    expect(result.accounts[0].timeline).toEqual([
      {
        date: { year: 2026, month: 9, day: 10 },
        income: 100_00,
        expense: 150_00,
        delta: -50_00,
        balance: 50_00,
      },
    ]);
    expect(result.accounts[0].lowestProjectedBalance).toBe(50_00);
  });

  it("tracks each account independently", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts,
      transactions: [
        {
          id: "checking-expense",
          accountId: "checking",
          amount: 25_00,
          type: "EXPENSE",
          status: "PENDING",
          description: "Conta",
          year: 2026,
          month: 9,
          day: 6,
        },
        {
          id: "savings-income",
          accountId: "savings",
          amount: 10_00,
          type: "INCOME",
          status: "PENDING",
          description: "Reserva",
          year: 2026,
          month: 9,
          day: 6,
        },
      ],
    });

    expect(result.accounts.map((account) => account.projectedBalance)).toEqual([
      75_00,
      510_00,
    ]);
  });

  it("fails closed for transactions outside the supplied account scope", () => {
    expect(() =>
      buildForecast({
        asOf: { year: 2026, month: 9, day: 5 },
        horizonDays: 30,
        accounts,
        transactions: [
          {
            id: "foreign",
            accountId: "other-account",
            amount: 1,
            type: "INCOME",
            status: "PENDING",
            description: "Fora",
            year: 2026,
            month: 9,
            day: 6,
          },
        ],
      })
    ).toThrow("fora do escopo");
  });
});
