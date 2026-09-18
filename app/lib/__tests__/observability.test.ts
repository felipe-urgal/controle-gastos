import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getRequestId,
  logEvent,
  logServerOperation,
} from "@/app/lib/observability";

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

  it("logs terminal server operation timing with level derived from status", () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const nowSpy = vi.spyOn(performance, "now");

    nowSpy.mockReturnValueOnce(125.4);
    logServerOperation({
      event: "forecast",
      requestId: "request-12345678",
      route: "/api/forecast",
      status: 200,
      startedAt: 100,
      context: { accountCount: 2 },
    });

    nowSpy.mockReturnValueOnce(150.2);
    logServerOperation({
      event: "forecast",
      requestId: "request-12345678",
      route: "/api/forecast",
      status: 400,
      startedAt: 100,
    });

    nowSpy.mockReturnValueOnce(175.7);
    logServerOperation({
      event: "forecast",
      requestId: "request-12345678",
      route: "/api/forecast",
      status: 500,
      startedAt: 100,
      error: new Error("internal detail"),
    });

    expect(JSON.parse(String(infoSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: "info",
      event: "forecast",
      requestId: "request-12345678",
      route: "/api/forecast",
      status: 200,
      durationMs: 25,
      accountCount: 2,
    });
    expect(JSON.parse(String(warnSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: "warn",
      status: 400,
      durationMs: 50,
    });
    expect(JSON.parse(String(errorSpy.mock.calls[0]?.[0]))).toMatchObject({
      level: "error",
      status: 500,
      durationMs: 76,
      error: { name: "Error" },
    });
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
