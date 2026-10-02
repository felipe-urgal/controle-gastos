import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { PreviewInvestmentImportItem } from "@/app/lib/investments/import/investment-import-parser";
import {
  signInvestmentImportPreview,
  verifyInvestmentImportPreview,
} from "@/app/lib/investments/import/preview-token";

const originalSecret = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret-with-sufficient-length-for-preview-token";
});

afterEach(() => {
  if (originalSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalSecret;
});

describe("investment import preview token", () => {
  it("accepts the same preview when object properties arrive in a different order", () => {
    const item: PreviewInvestmentImportItem = {
      index: 0,
      source: "XLSX",
      kind: "INCOMES",
      date: "2026-09-15",
      symbol: "MXRF11",
      assetName: "MAXI RENDA FDO INV IMOB - FII",
      assetType: "FII",
      institution: "Nubank Investimentos",
      quantity: "2100",
      errors: [],
      incomeType: "INCOME",
      eventType: "Rendimento",
      unitValueCents: 10,
      netAmountCents: 21000,
      fingerprint:
        "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      duplicate: false,
    };

    const token = signInvestmentImportPreview({
      userId: "user-1",
      accountId: "account-1",
      items: [item],
    });

    const reordered = {
      duplicate: false,
      fingerprint: item.fingerprint,
      errors: [],
      quantity: "2100",
      institution: "Nubank Investimentos",
      assetType: "FII",
      assetName: "MAXI RENDA FDO INV IMOB - FII",
      symbol: "MXRF11",
      date: "2026-09-15",
      source: "XLSX",
      index: 0,
      kind: "INCOMES",
      netAmountCents: 21000,
      unitValueCents: 10,
      eventType: "Rendimento",
      incomeType: "INCOME",
    } as PreviewInvestmentImportItem;

    expect(() =>
      verifyInvestmentImportPreview({
        token,
        userId: "user-1",
        accountId: "account-1",
        items: [reordered],
      }),
    ).not.toThrow();
  });

  it("still rejects a modified preview", () => {
    const item: PreviewInvestmentImportItem = {
      index: 0,
      source: "XLSX",
      kind: "OPERATIONS",
      date: "2026-09-22",
      symbol: "MXRF11",
      assetName: "MAXI RENDA FDO INV IMOB - FII",
      assetType: "FII",
      institution: "Nubank Investimentos",
      quantity: "10",
      errors: [],
      operationType: "BUY",
      movement: "Transferência - Liquidação",
      unitPriceCents: 903,
      feesCents: 0,
      amountCents: 9030,
      rawUnitPrice: "9,03",
      fingerprint:
        "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
      duplicate: false,
    };

    const token = signInvestmentImportPreview({
      userId: "user-1",
      accountId: "account-1",
      items: [item],
    });

    expect(() =>
      verifyInvestmentImportPreview({
        token,
        userId: "user-1",
        accountId: "account-1",
        items: [{ ...item, quantity: "11" }],
      }),
    ).toThrow("INVALID_PREVIEW_TOKEN");
  });
});
