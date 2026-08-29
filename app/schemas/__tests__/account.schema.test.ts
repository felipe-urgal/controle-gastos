import { describe, expect, it } from "vitest";
import { createAccountSchema, updateAccountSchema } from "../account.schema";

describe("account schemas", () => {
  it("applies safe defaults when creating an account", () => {
    const result = createAccountSchema.parse({
      name: "Conta principal",
      type: "CREDIT_DEBIT",
      description: null,
    });

    expect(result.currency).toBe("BRL");
    expect(result.isActive).toBe(true);
  });

  it("rejects invalid account colors", () => {
    const result = createAccountSchema.safeParse({
      name: "Investimentos",
      type: "INVESTMENT",
      description: null,
      color: "blue",
    });

    expect(result.success).toBe(false);
  });

  it("accepts partial account updates", () => {
    const result = updateAccountSchema.parse({ isActive: false });

    expect(result).toEqual({ isActive: false });
  });
});
