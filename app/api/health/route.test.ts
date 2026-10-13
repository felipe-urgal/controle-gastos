import { afterEach, describe, expect, it, vi } from "vitest";

const { queryRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    $queryRaw: queryRaw,
  },
}));

import { GET, HEALTH_DB_TIMEOUT_MS } from "@/app/api/health/route";

describe("GET /api/health", () => {
  afterEach(() => {
    queryRaw.mockReset();
    vi.restoreAllMocks();
  });

  it("returns 200 quietly when the database is reachable", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    queryRaw.mockResolvedValue([{ value: 1 }]);

    const response = await GET(
      new Request("http://localhost/api/health", {
        headers: { "x-request-id": "health-request-123" },
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("health-request-123");
    expect(await response.json()).toMatchObject({
      status: "ok",
      checks: { application: "ok", database: "ok" },
      requestId: "health-request-123",
    });
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it("returns 503 without exposing database errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    queryRaw.mockRejectedValue(new Error("database connection failed"));

    const response = await GET(
      new Request("http://localhost/api/health", {
        headers: { "x-request-id": "health-request-456" },
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      status: "degraded",
      checks: { application: "ok", database: "unavailable" },
      requestId: "health-request-456",
    });
    expect(JSON.stringify(body)).not.toContain("database connection failed");
  });

  it("fails fast with 503 when the database query hangs", async () => {
    vi.useFakeTimers();
    try {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
      queryRaw.mockReturnValue(new Promise(() => undefined));

      const pending = GET(
        new Request("http://localhost/api/health", {
          headers: { "x-request-id": "health-request-timeout" },
        })
      );
      await vi.advanceTimersByTimeAsync(HEALTH_DB_TIMEOUT_MS + 1);
      const response = await pending;
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body).toMatchObject({
        status: "degraded",
        checks: { application: "ok", database: "unavailable" },
      });
      expect(JSON.stringify(body)).not.toContain("TIMEOUT");
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('"reason":"timeout"'));
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps the public contract minimal", async () => {
    queryRaw.mockResolvedValue([{ value: 1 }]);
    const body = await (await GET(new Request("http://localhost/api/health"))).json();
    expect(Object.keys(body).sort()).toEqual(["checks", "requestId", "status", "timestamp"]);
  });
});
