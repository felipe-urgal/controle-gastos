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

  it("keeps accepting a small safe digest", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(
      new Request("http://localhost/api/observability/client-error", {
        method: "POST",
        body: JSON.stringify({ digest: "client.error:boundary" }),
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
});
