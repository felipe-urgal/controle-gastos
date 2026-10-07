import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PreviewImportItem } from "@/app/lib/transactions/import/parser";
import {
  IMPORT_PREVIEW_TTL_SECONDS,
  ImportPreviewTokenExpiredError,
  signImportPreviewToken,
  verifyImportPreviewToken,
} from "@/app/lib/transactions/import/preview-token";

const item: PreviewImportItem = {
  index: 0,
  source: "CSV",
  date: "2026-10-07",
  amountCents: 1000,
  type: "EXPENSE",
  description: "Teste",
  errors: [],
  fingerprint: "a".repeat(64),
  duplicate: false,
};

describe("import preview token", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "preview-token-test-secret";
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-07T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts a valid preview and rejects it after the configured TTL", () => {
    const token = signImportPreviewToken({
      userId: "user-1",
      accountId: "account-1",
      items: [item],
    });

    expect(() =>
      verifyImportPreviewToken({
        token,
        userId: "user-1",
        accountId: "account-1",
        items: [item],
      }),
    ).not.toThrow();

    vi.advanceTimersByTime((IMPORT_PREVIEW_TTL_SECONDS + 1) * 1000);

    expect(() =>
      verifyImportPreviewToken({
        token,
        userId: "user-1",
        accountId: "account-1",
        items: [item],
      }),
    ).toThrow(ImportPreviewTokenExpiredError);
  });
});
