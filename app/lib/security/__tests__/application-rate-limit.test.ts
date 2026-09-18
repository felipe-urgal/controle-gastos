import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  consumeRateLimit: vi.fn(),
}));

vi.mock("@/app/lib/security/rate-limit", () => ({
  consumeRateLimit: mocks.consumeRateLimit,
}));

import {
  consumeDataExportRateLimit,
  consumeImportRateLimit,
  consumeTransactionMutationRateLimit,
} from "@/app/lib/security/application-rate-limit";

describe("application rate limit policies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.consumeRateLimit.mockResolvedValue({
      limited: false,
      retryAfterSeconds: 0,
    });
  });

  it("uses a dedicated per-user bucket for full data export", async () => {
    await consumeDataExportRateLimit("user-export");

    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      action: "user-data-export-user",
      identifier: "user-export",
      maxAttempts: 10,
      windowMs: 3_600_000,
      blockMs: 3_600_000,
    });
  });

  it("uses a shared per-user bucket for expensive import operations", async () => {
    await consumeImportRateLimit("user-1");

    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      action: "transaction-import-user",
      identifier: "user-1",
      maxAttempts: 30,
      windowMs: 900_000,
      blockMs: 900_000,
    });
  });

  it("uses a shared per-user bucket for financial transaction mutations", async () => {
    await consumeTransactionMutationRateLimit("user-2");

    expect(mocks.consumeRateLimit).toHaveBeenCalledWith({
      action: "transaction-mutation-user",
      identifier: "user-2",
      maxAttempts: 120,
      windowMs: 60_000,
      blockMs: 60_000,
    });
  });
});
