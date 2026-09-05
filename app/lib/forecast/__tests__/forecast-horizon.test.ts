import { describe, expect, it } from "vitest";
import { buildForecast } from "@/app/lib/forecast/forecast-engine";

describe("forecast horizon contract", () => {
  it("uses exactly 30 logical dates including asOf", () => {
    const result = buildForecast({
      asOf: { year: 2026, month: 9, day: 5 },
      horizonDays: 30,
      accounts: [{ id: "account", name: "Conta", balance: 0 }],
      transactions: [
        {
          id: "last-included-day",
          accountId: "account",
          amount: 100,
          type: "INCOME",
          status: "PENDING",
          description: "Incluída",
          year: 2026,
          month: 10,
          day: 4,
        },
        {
          id: "first-excluded-day",
          accountId: "account",
          amount: 200,
          type: "INCOME",
          status: "PENDING",
          description: "Fora",
          year: 2026,
          month: 10,
          day: 5,
        },
      ],
    });

    expect(result.horizonEnd).toEqual({ year: 2026, month: 10, day: 4 });
    expect(result.accounts[0].pendingIncome).toBe(100);
    expect(result.accounts[0].projectedBalance).toBe(100);
  });
});
