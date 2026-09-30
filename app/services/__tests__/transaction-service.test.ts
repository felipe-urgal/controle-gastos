import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/app/services/api-client";
import { transactionService } from "@/app/services/transaction-service";

vi.mock("@/app/services/api-client", () => ({
  apiClient: vi.fn(),
}));

const input = {
  amount: 12_345,
  type: "EXPENSE" as const,
  description: "Mercado offline",
  categoryId: "11111111-1111-4111-8111-111111111111",
  accountId: "22222222-2222-4222-8222-222222222222",
  day: 30,
  month: 9,
  year: 2026,
  status: "COMPLETED" as const,
};

describe("transactionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envia a mesma chave idempotente informada pela fila local", async () => {
    await transactionService.createIdempotent(input, "attempt-123");

    expect(apiClient).toHaveBeenCalledWith("/api/transactions", {
      method: "POST",
      body: input,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "attempt-123",
      },
    });
  });
});
