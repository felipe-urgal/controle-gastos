import { describe, expect, it } from "vitest";
import { calculateAccountBalanceMap } from "@/app/lib/accounts/account-balance";

describe("calculateAccountBalanceMap", () => {
  it("nets income and expense values per account", () => {
    const balances = calculateAccountBalanceMap(
      ["account-a", "account-b"],
      [
        {
          accountId: "account-a",
          type: "INCOME",
          _sum: { amount: 10_000 },
        },
        {
          accountId: "account-a",
          type: "EXPENSE",
          _sum: { amount: 2_500 },
        },
        {
          accountId: "account-b",
          type: "EXPENSE",
          _sum: { amount: 1_200 },
        },
      ]
    );

    expect(balances.get("account-a")).toBe(7_500);
    expect(balances.get("account-b")).toBe(-1_200);
  });

  it("returns zero for accounts without completed transactions", () => {
    const balances = calculateAccountBalanceMap(["empty-account"], []);

    expect(balances.get("empty-account")).toBe(0);
  });

  it("treats null aggregates as zero", () => {
    const balances = calculateAccountBalanceMap(
      ["account-a"],
      [
        {
          accountId: "account-a",
          type: "INCOME",
          _sum: { amount: null },
        },
      ]
    );

    expect(balances.get("account-a")).toBe(0);
  });
});
