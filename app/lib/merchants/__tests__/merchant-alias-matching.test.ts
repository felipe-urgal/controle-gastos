import { describe, expect, it } from "vitest";

import {
  matchMerchantAlias,
  merchantAliasMatches,
  normalizeMerchantAliasValue,
} from "@/app/lib/merchants/merchant-alias-matching";

describe("merchant alias matching", () => {
  it("normalizes accents, repeated whitespace and case only for comparison", () => {
    expect(normalizeMerchantAliasValue("  MERCÁDO   São João  ")).toBe(
      "mercado sao joao",
    );
  });

  it("supports equals, starts-with and contains without regex or fuzzy matching", () => {
    const value = "IFOOD SA PEDIDO 123";
    expect(merchantAliasMatches("EQUALS", "ifood sa pedido 123", value)).toBe(true);
    expect(merchantAliasMatches("STARTS_WITH", "ifood sa", value)).toBe(true);
    expect(merchantAliasMatches("CONTAINS", "pedido", value)).toBe(true);
    expect(merchantAliasMatches("EQUALS", "ifood", value)).toBe(false);
  });

  it("ranks aliases canonically but keeps cross-merchant ambiguity conservative", () => {
    const aliases = [
      {
        id: "contains",
        merchantId: "merchant-a",
        merchantName: "Genérico",
        operator: "CONTAINS" as const,
        normalizedPattern: "ifood",
        priority: 1,
      },
      {
        id: "equals",
        merchantId: "merchant-b",
        merchantName: "iFood",
        operator: "EQUALS" as const,
        normalizedPattern: "mercadopago*ifood 123",
        priority: 100,
      },
      {
        id: "starts",
        merchantId: "merchant-b",
        merchantName: "iFood",
        operator: "STARTS_WITH" as const,
        normalizedPattern: "mercadopago",
        priority: 10,
      },
    ];

    expect(matchMerchantAlias(aliases, "MERCADOPAGO*IFOOD 123")).toEqual({
      aliasId: "equals",
      merchantId: "merchant-b",
      merchantName: "iFood",
      priority: 100,
      conflict: true,
      matchingAliasIds: ["equals", "starts", "contains"],
    });
  });

  it("does not flag multiple matching aliases of the same merchant as conflict", () => {
    const aliases = [
      {
        id: "short",
        merchantId: "merchant-a",
        merchantName: "iFood",
        operator: "CONTAINS" as const,
        normalizedPattern: "ifood",
        priority: 10,
      },
      {
        id: "long",
        merchantId: "merchant-a",
        merchantName: "iFood",
        operator: "CONTAINS" as const,
        normalizedPattern: "ifood pedido",
        priority: 100,
      },
    ];

    expect(matchMerchantAlias(aliases, "IFOOD PEDIDO 123")).toMatchObject({
      aliasId: "long",
      merchantId: "merchant-a",
      conflict: false,
      matchingAliasIds: ["long", "short"],
    });
  });
});
