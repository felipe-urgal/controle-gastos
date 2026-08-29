import { afterEach, describe, expect, it, vi } from "vitest";
import { getRequestId, logEvent } from "@/app/lib/observability";

describe("observability", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reuses a safe incoming request id", () => {
    const request = new Request("http://localhost/test", {
      headers: { "x-request-id": "request-12345678" },
    });

    expect(getRequestId(request)).toBe("request-12345678");
  });

  it("redacts credentials from error logs", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error(
      "failed postgresql://user:super-secret@db.example/app with Bearer abc.def.ghi and re_secretvalue123"
    );

    logEvent("error", "test_failure", { requestId: "request-12345678" }, error);

    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain("super-secret");
    expect(line).not.toContain("re_secretvalue123");
    expect(line).toContain("[REDACTED]");
  });
});
