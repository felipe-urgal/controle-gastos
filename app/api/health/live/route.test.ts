import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/health/live/route";

describe("GET /api/health/live", () => {
  it("returns a cheap application-only liveness response", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ status: "ok" });
  });
});
