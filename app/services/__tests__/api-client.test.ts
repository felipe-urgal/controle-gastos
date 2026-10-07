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

  it("exposes Retry-After for callers that need actionable throttling UX", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "IMPORT_PREVIEW_RATE_LIMITED",
              message: "Muitas operações",
            },
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "42",
            },
          },
        ),
      ),
    );

    const error = await apiClient("/api/transactions/import/preview", {
      method: "POST",
      body: new FormData(),
    }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({
      status: 429,
      code: "IMPORT_PREVIEW_RATE_LIMITED",
      retryAfterSeconds: 42,
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
