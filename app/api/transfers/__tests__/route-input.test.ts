import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
  createTransferForUser: vi.fn(),
  listTransfersForUser: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: mocks.getAuthenticatedUserId,
}));

vi.mock("@/app/lib/transfers/create-transfer", () => ({
  createTransferForUser: mocks.createTransferForUser,
}));

vi.mock("@/app/lib/transfers/read-transfer", () => ({
  listTransfersForUser: mocks.listTransfersForUser,
}));

import { POST } from "@/app/api/transfers/route";

describe("POST /api/transfers input boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuthenticatedUserId.mockResolvedValue("user-1");
  });

  it("returns 400 for malformed JSON before entering the transfer domain", async () => {
    const response = await POST(
      new Request("http://localhost/api/transfers", {
        method: "POST",
        headers: { "Idempotency-Key": "test-key" },
        body: '{"sourceAccountId":',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.createTransferForUser).not.toHaveBeenCalled();
  });
});
