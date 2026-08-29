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

  it("does not log raw error messages or credentials", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = new Error(
      "failed with financial payload and re_secretvalue123"
    );
    error.stack = [
      "Error: failed with financial payload and re_secretvalue123",
      "    at postgresql://user:super-secret@db.example/app",
    ].join("\n");

    logEvent("error", "test_failure", { requestId: "request-12345678" }, error);

    const line = String(spy.mock.calls[0]?.[0]);
    expect(line).not.toContain("financial payload");
    expect(line).not.toContain("super-secret");
    expect(line).not.toContain("re_secretvalue123");
    expect(line).toContain("postgresql://[REDACTED]@");
  });
});
