import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/observability/client-error/route";

describe("POST /api/observability/client-error", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects an actual body larger than 1 KB even without Content-Length", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request("http://localhost/api/observability/client-error", {
        method: "POST",
        body: JSON.stringify({
          digest: "client.error",
          padding: "x".repeat(1100),
        }),
      }),
    );

    expect(response.status).toBe(413);
  });

  it("rejects early when Content-Length exceeds 1 KB", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request("http://localhost/api/observability/client-error", {
        method: "POST",
        headers: { "content-length": "2048" },
        body: JSON.stringify({ digest: "client.error" }),
      }),
    );

    expect(response.status).toBe(413);
  });

  it("keeps accepting a small safe digest", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request("http://localhost/api/observability/client-error", {
        method: "POST",
        headers: { "x-forwarded-for": `safe-${randomUUID()}` },
        body: JSON.stringify({ digest: "client.error:boundary" }),
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("keeps malformed JSON payloads opaque and non-fatal", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request("http://localhost/api/observability/client-error", {
        method: "POST",
        headers: { "x-forwarded-for": `malformed-${randomUUID()}` },
        body: '{"digest":',
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  it("returns 204 but stops logging after the per-IP budget is exhausted", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const ip = `amplification-${randomUUID()}`;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const response = await POST(
        new Request("http://localhost/api/observability/client-error", {
          method: "POST",
          headers: { "x-forwarded-for": ip },
          body: JSON.stringify({ digest: "client.error:storm" }),
        }),
      );
      expect(response.status).toBe(204);
    }

    expect(errorSpy).toHaveBeenCalledTimes(10);
  });
});
