import { describe, expect, it } from "vitest";

import type { ForecastResult } from "@/app/lib/forecast/forecast-engine";
import { buildSafeToSpend } from "@/app/lib/forecast/safe-to-spend";

function forecast(overrides: Partial<ForecastResult> = {}): ForecastResult {
  return {
    asOf: { year: 2026, month: 10, day: 1 },
    horizonDays: 30,
    horizonEnd: { year: 2026, month: 10, day: 30 },
    accounts: [
      {
        id: "cash-a",
        name: "Conta A",
        realizedBalance: 100_00,
        pendingIncome: 0,
        pendingExpense: 0,
        projectedBalance: 100_00,
        lowestProjectedBalance: 100_00,
        lowestProjectedBalanceDate: { year: 2026, month: 10, day: 1 },
        timeline: [],
      },
      {
        id: "cash-b",
        name: "Conta B",
        realizedBalance: 50_00,
        pendingIncome: 0,
        pendingExpense: 0,
        projectedBalance: 50_00,
        lowestProjectedBalance: 50_00,
        lowestProjectedBalanceDate: { year: 2026, month: 10, day: 1 },
        timeline: [],
      },
      {
        id: "investment",
        name: "Investimentos",
        realizedBalance: 1_000_00,
        pendingIncome: 0,
        pendingExpense: 0,
        projectedBalance: 1_000_00,
        lowestProjectedBalance: 1_000_00,
        lowestProjectedBalanceDate: { year: 2026, month: 10, day: 1 },
        timeline: [],
      },
    ],
    overdue: [],
    upcoming: [],
    ...overrides,
  };
}

describe("safe-to-spend", () => {
  it("uses only spendable accounts and concrete pending obligations", () => {
    const result = buildSafeToSpend({
      forecast: forecast({
        overdue: [
          {
            id: "overdue-expense",
            accountId: "cash-a",
            amount: 10_00,
            type: "EXPENSE",
            kind: "NORMAL",
            status: "PENDING",
            description: "Vencida",
            year: 2026,
            month: 9,
            day: 30,
          },
        ],
        upcoming: [
          {
            id: "future-expense",
            accountId: "cash-a",
            amount: 20_00,
            type: "EXPENSE",
            kind: "NORMAL",
            status: "PENDING",
            description: "Conta",
            year: 2026,
            month: 10,
            day: 5,
          },
          {
            id: "future-income",
            accountId: "cash-a",
            amount: 80_00,
            type: "INCOME",
            kind: "NORMAL",
            status: "PENDING",
            description: "Receita futura",
            year: 2026,
            month: 10,
            day: 6,
          },
          {
            id: "cash-transfer-out",
            accountId: "cash-a",
            amount: 15_00,
            type: "EXPENSE",
            kind: "TRANSFER",
            status: "PENDING",
            description: "Transferência",
            year: 2026,
            month: 10,
            day: 7,
          },
          {
            id: "cash-transfer-in",
            accountId: "cash-b",
            amount: 15_00,
            type: "INCOME",
            kind: "TRANSFER",
            status: "PENDING",
            description: "Transferência",
            year: 2026,
            month: 10,
            day: 7,
          },
          {
            id: "investment-transfer-out",
            accountId: "cash-b",
            amount: 5_00,
            type: "EXPENSE",
            kind: "TRANSFER",
            status: "PENDING",
            description: "Aporte",
            year: 2026,
            month: 10,
            day: 8,
          },
          {
            id: "investment-transfer-in",
            accountId: "investment",
            amount: 5_00,
            type: "INCOME",
            kind: "TRANSFER",
            status: "PENDING",
            description: "Aporte",
            year: 2026,
            month: 10,
            day: 8,
          },
          {
            id: "card-payment",
            accountId: "cash-a",
            amount: 99_00,
            type: "EXPENSE",
            kind: "CARD_PAYMENT",
            status: "PENDING",
            description: "Pagamento futuro",
            year: 2026,
            month: 10,
            day: 9,
          },
        ],
      }),
      accountTypes: new Map([
        ["cash-a", "CREDIT_DEBIT"],
        ["cash-b", "CREDIT_DEBIT"],
        ["investment", "INVESTMENT"],
      ]),
      cardCommitments: [{ amount: 30_00 }],
    });

    expect(result).toMatchObject({
      realizedBalance: 150_00,
      pendingExpenses: 30_00,
      cardCommitments: 30_00,
      transferNet: -5_00,
      safeToSpend: 85_00,
    });
    expect(result.accounts).toEqual([
      expect.objectContaining({
        id: "cash-a",
        pendingExpenses: 30_00,
        transferNet: -15_00,
        safeToSpend: 55_00,
      }),
      expect.objectContaining({
        id: "cash-b",
        pendingExpenses: 0,
        transferNet: 10_00,
        safeToSpend: 60_00,
      }),
    ]);
  });

  it("ignores non-pending items defensively and keeps negative values visible", () => {
    const result = buildSafeToSpend({
      forecast: forecast({
        accounts: [
          {
            id: "cash-a",
            name: "Conta A",
            realizedBalance: 20_00,
            pendingIncome: 0,
            pendingExpense: 0,
            projectedBalance: 20_00,
            lowestProjectedBalance: 20_00,
            lowestProjectedBalanceDate: { year: 2026, month: 10, day: 1 },
            timeline: [],
          },
        ],
        upcoming: [
          {
            id: "pending",
            accountId: "cash-a",
            amount: 25_00,
            type: "EXPENSE",
            kind: "NORMAL",
            status: "PENDING",
            description: "Pendente",
            year: 2026,
            month: 10,
            day: 10,
          },
          {
            id: "cancelled",
            accountId: "cash-a",
            amount: 90_00,
            type: "EXPENSE",
            kind: "NORMAL",
            status: "CANCELLED",
            description: "Cancelada",
            year: 2026,
            month: 10,
            day: 11,
          },
        ],
      }),
      accountTypes: new Map([["cash-a", "CREDIT_DEBIT"]]),
      cardCommitments: [{ amount: 10_00 }],
    });

    expect(result.safeToSpend).toBe(-15_00);
  });

  it("returns zero without eligible cash accounts", () => {
    const result = buildSafeToSpend({
      forecast: forecast({
        accounts: [
          {
            id: "investment",
            name: "Investimentos",
            realizedBalance: 1_000_00,
            pendingIncome: 0,
            pendingExpense: 0,
            projectedBalance: 1_000_00,
            lowestProjectedBalance: 1_000_00,
            lowestProjectedBalanceDate: { year: 2026, month: 10, day: 1 },
            timeline: [],
          },
        ],
      }),
      accountTypes: new Map([["investment", "INVESTMENT"]]),
      cardCommitments: [],
    });

    expect(result).toEqual({
      realizedBalance: 0,
      pendingExpenses: 0,
      cardCommitments: 0,
      transferNet: 0,
      safeToSpend: 0,
      accounts: [],
    });
  });
});
