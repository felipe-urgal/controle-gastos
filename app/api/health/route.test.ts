import { afterEach, describe, expect, it, vi } from "vitest";

const { queryRaw } = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    $queryRaw: queryRaw,
  },
}));

import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  afterEach(() => {
    queryRaw.mockReset();
    vi.restoreAllMocks();
  });

  it("returns 200 when the database is reachable", async () => {
    vi.spyOn(console, "info").mockImplementation(() => undefined);
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
});
