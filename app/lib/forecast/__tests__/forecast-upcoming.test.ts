import { describe, expect, it } from "vitest";
import { buildForecast } from "@/app/lib/forecast/forecast-engine";

describe("forecast upcoming contract", () => {
  it("returns only pending items inside the horizon in deterministic order", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts: [{ id: "checking", name: "Conta", balance: 0 }],
      transactions: [
        {
          id: "b-same-day",
          accountId: "checking",
          amount: 200,
          type: "EXPENSE",
          status: "PENDING",
          description: "B",
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          id: "a-same-day",
          accountId: "checking",
          amount: 100,
          type: "INCOME",
          status: "PENDING",
          description: "A",
          year: 2026,
          month: 9,
          day: 10,
        },
        {
          id: "today",
          accountId: "checking",
          amount: 50,
          type: "EXPENSE",
          status: "PENDING",
          description: "Hoje",
          year: 2026,
          month: 9,
          day: 5,
        },
        {
          id: "overdue",
          accountId: "checking",
          amount: 50,
          type: "EXPENSE",
          status: "PENDING",
          description: "Vencido",
          year: 2026,
          month: 9,
          day: 4,
        },
        {
          id: "completed",
          accountId: "checking",
          amount: 50,
          type: "INCOME",
          status: "COMPLETED",
          description: "Realizado",
          year: 2026,
          month: 9,
          day: 6,
        },
        {
          id: "outside",
          accountId: "checking",
          amount: 50,
          type: "EXPENSE",
          status: "PENDING",
          description: "Fora do horizonte",
          year: 2026,
          month: 10,
          day: 5,
        },
      ],
    });

    expect(result.upcoming.map((item) => item.id)).toEqual([
      "today",
      "a-same-day",
      "b-same-day",
    ]);
    expect(result.overdue.map((item) => item.id)).toEqual(["overdue"]);
  });
});
