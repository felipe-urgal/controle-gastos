import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAuthenticatedUserId: vi.fn(),
}));

vi.mock("@/app/lib/auth", () => ({
  getAuthenticatedUserId: authMocks.getAuthenticatedUserId,
}));

import { IMPORT_MAX_FILE_BYTES } from "@/app/lib/transactions/import/parser";
import { previewTransactionImport } from "@/app/lib/transactions/import/transaction-import";

beforeEach(() => {
  authMocks.getAuthenticatedUserId.mockReset();
  authMocks.getAuthenticatedUserId.mockResolvedValue(randomUUID());
});

describe("transaction import limits", () => {
  it("rejects a file above the server-side size limit before parsing", async () => {
    const formData = new FormData();
    formData.append("accountId", randomUUID());
    formData.append("file", new File(["x".repeat(IMPORT_MAX_FILE_BYTES + 1)], "large.csv", { type: "text/csv" }));

    const response = await previewTransactionImport(new Request("http://localhost/api/transactions/import/preview", {
      method: "POST",
      body: formData,
    }));
    const body = await response.json();

    expect(response.status).toBe(413);
    expect(body.error.message).toBe("Arquivo excede o limite de 2 MB");
  });
});
