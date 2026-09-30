import { afterEach, describe, expect, it, vi } from "vitest";

import {
  ApiClientError,
  apiClient,
} from "@/app/services/api-client";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiClient errors", () => {
  it("preserves HTTP status and application error code", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "IDEMPOTENCY_PAYLOAD_CONFLICT",
              message: "Chave já utilizada",
            },
          }),
          {
            status: 409,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const error = await apiClient("/api/transactions", {
      method: "POST",
      body: { amount: 100 },
    }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      message: "Chave já utilizada",
      status: 409,
      code: "IDEMPOTENCY_PAYLOAD_CONFLICT",
    });
  });

  it("keeps the HTTP status when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("unauthorized", {
          status: 401,
          statusText: "Unauthorized",
          headers: { "Content-Type": "text/plain" },
        }),
      ),
    );

    const error = await apiClient("/api/user").catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 401,
      message: "Erro 401: Unauthorized",
    });
  });
});
