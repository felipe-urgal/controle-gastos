import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/app/services/api-client";
import { transferService } from "@/app/services/transfer-service";
import type { CreateTransferInput } from "@/app/types/transfer";

vi.mock("@/app/services/api-client", () => ({
  apiClient: vi.fn(),
}));

const input: CreateTransferInput = {
  sourceAccountId: "11111111-1111-4111-8111-111111111111",
  destinationAccountId: "22222222-2222-4222-8222-222222222222",
  amountCents: 12500,
  year: 2026,
  month: 9,
  day: 10,
  description: "Reserva mensal",
  status: "COMPLETED",
};

describe("transferService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envia a chave idempotente no endpoint dedicado", async () => {
    await transferService.create(input, "attempt-123");

    expect(apiClient).toHaveBeenCalledWith("/api/transfers", {
      method: "POST",
      body: input,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": "attempt-123",
      },
    });
  });
});
