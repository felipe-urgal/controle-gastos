import { describe, expect, it } from "vitest";

import {
  matchMerchantAlias,
  merchantAliasMatches,
  normalizeMerchantAliasValue,
} from "@/app/lib/merchants/merchant-alias-matching";

describe("merchant alias matching", () => {
  it("normalizes accents, repeated whitespace and case only for comparison", () => {
    expect(normalizeMerchantAliasValue("  MERCÁDO   São João  ")).toBe("mercado sao joao");
  });

  it("supports equals, starts-with and contains without regex or fuzzy matching", () => {
    const value = "IFOOD SA PEDIDO 123";
    expect(merchantAliasMatches("EQUALS", "ifood sa pedido 123", value)).toBe(true);
    expect(merchantAliasMatches("STARTS_WITH", "ifood sa", value)).toBe(true);
    expect(merchantAliasMatches("CONTAINS", "pedido", value)).toBe(true);
    expect(merchantAliasMatches("EQUALS", "ifood", value)).toBe(false);
  });

  it("uses priority/id order supplied by the caller and exposes cross-merchant conflicts", () => {
    const aliases = [
      {
        id: "alias-a",
        merchantId: "merchant-a",
        merchantName: "iFood",
        operator: "CONTAINS" as const,
        normalizedPattern: "ifood",
        priority: 10,
      },
      {
        id: "alias-b",
        merchantId: "merchant-b",
        merchantName: "Mercado Pago",
        operator: "CONTAINS" as const,
        normalizedPattern: "mercadopago",
        priority: 20,
      },
    ];

    expect(matchMerchantAlias(aliases, "MERCADOPAGO*IFOOD 123")).toEqual({
      aliasId: "alias-a",
      merchantId: "merchant-a",
      merchantName: "iFood",
      priority: 10,
      conflict: true,
      matchingAliasIds: ["alias-a", "alias-b"],
    });
  });
});
