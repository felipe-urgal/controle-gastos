import { afterEach, describe, expect, it, vi } from "vitest";

import { getRequestIp } from "@/app/lib/security/rate-limit";

afterEach(() => {
  vi.unstubAllEnvs();
});

function requestWithHeaders(headers: Record<string, string>) {
  return new Request("http://localhost/api/test", { headers });
}

describe("getRequestIp", () => {
  it("trusts Vercel x-forwarded-for and uses the first address", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");

    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "198.51.100.20",
    });

    expect(getRequestIp(request)).toBe("203.0.113.10");
  });

  it("does not trust client-supplied proxy headers outside a trusted proxy", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUST_PROXY_HEADERS", "");

    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.11",
      "x-real-ip": "198.51.100.21",
    });

    expect(getRequestIp(request)).toBe("unknown");
  });

  it("supports an explicitly configured trusted proxy outside Vercel", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUST_PROXY_HEADERS", "true");

    const request = requestWithHeaders({
      "x-forwarded-for": "203.0.113.12, 10.0.0.2",
    });

    expect(getRequestIp(request)).toBe("203.0.113.12");
  });

  it("falls back to x-real-ip when the trusted proxy omits x-forwarded-for", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "1");

    const request = requestWithHeaders({
      "x-real-ip": "198.51.100.22",
    });

    expect(getRequestIp(request)).toBe("198.51.100.22");
  });

  it("keeps proxy-header based identifiers available in tests", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("TRUST_PROXY_HEADERS", "");

    const request = requestWithHeaders({
      "x-forwarded-for": "test-client-a",
    });

    expect(getRequestIp(request)).toBe("test-client-a");
  });
});
