import { describe, expect, it } from "vitest";

import { investmentFiscalEventSemantics } from "@/app/lib/investments/investment-fiscal-domain";

describe("investment fiscal event semantics", () => {
  it("treats custody transfers as quantity movement without cost or realized result", () => {
    expect(investmentFiscalEventSemantics("CUSTODY_TRANSFER_IN")).toEqual({
      quantityDirection: 1,
      changesCostBasis: false,
      realizesResult: false,
    });
    expect(investmentFiscalEventSemantics("CUSTODY_TRANSFER_OUT")).toEqual({
      quantityDirection: -1,
      changesCostBasis: false,
      realizesResult: false,
    });
  });

  it("keeps buy and sell semantics explicit", () => {
    expect(investmentFiscalEventSemantics("BUY")).toEqual({
      quantityDirection: 1,
      changesCostBasis: true,
      realizesResult: false,
    });
    expect(investmentFiscalEventSemantics("SELL")).toEqual({
      quantityDirection: -1,
      changesCostBasis: true,
      realizesResult: true,
    });
  });

  it("does not realize result for corporate events", () => {
    for (const type of ["BONUS", "SPLIT", "REVERSE_SPLIT"] as const) {
      expect(investmentFiscalEventSemantics(type).realizesResult).toBe(false);
    }
  });
});
