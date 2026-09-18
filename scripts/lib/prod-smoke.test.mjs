import { describe, expect, it, vi } from "vitest";

import { runProdSmoke } from "./prod-smoke.mjs";

function response(status, { headers = {}, json } = {}) {
  return new Response(json === undefined ? null : JSON.stringify(json), {
    status,
    headers: {
      ...(json === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
  });
}

function createFetch(handler) {
  return vi.fn(async (url, init) => handler(new URL(url), init));
}

describe("prod smoke", () => {
  it("validates required checks without credentials and never follows the protected redirect", async () => {
    const logs = [];
    let requestSequence = 0;
    const fetchImpl = createFetch((url, init) => {
      const requestId = new Headers(init.headers).get("x-request-id");

      if (url.pathname === "/api/health") {
        return response(200, {
          headers: { "x-request-id": requestId },
          json: {
            status: "ok",
            checks: { application: "ok", database: "ok" },
          },
        });
      }
      if (url.pathname === "/login") {
        return response(200, { headers: { "x-request-id": requestId } });
      }
      if (url.pathname === "/dashboard") {
        expect(init.redirect).toBe("manual");
        return response(307, {
          headers: {
            "x-request-id": requestId,
            location: "https://example.test/login",
          },
        });
      }
      if (url.pathname === "/api/accounts") {
        return response(401);
      }

      throw new Error(`unexpected request ${url.pathname}`);
    });

    const result = await runProdSmoke({
      baseUrl: "https://example.test",
      fetchImpl,
      requestIdFactory: () => `request-${++requestSequence}`,
      log: (message) => logs.push(message),
    });

    expect(result).toEqual({ authenticated: false });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(logs).toContain(
      "[skip] authenticated-read credencial de smoke não configurada",
    );
  });

  it("performs only login plus authenticated GET reads when dedicated credentials are configured", async () => {
    const logs = [];
    const secretEmail = "smoke@example.test";
    const secretPassword = "SenhaSmoke123";
    const sessionSecret = "super-secret-session";
    const seenMethods = [];

    const fetchImpl = createFetch((url, init) => {
      seenMethods.push([url.pathname, init.method ?? "GET"]);
      const requestId = new Headers(init.headers).get("x-request-id");

      if (url.pathname === "/api/health") {
        return response(200, {
          headers: { "x-request-id": requestId },
          json: {
            status: "ok",
            checks: { application: "ok", database: "ok" },
          },
        });
      }
      if (url.pathname === "/login") {
        return response(200, { headers: { "x-request-id": requestId } });
      }
      if (url.pathname === "/dashboard") {
        return response(307, {
          headers: {
            "x-request-id": requestId,
            location: "https://example.test/login",
          },
        });
      }
      if (url.pathname === "/api/auth/login") {
        expect(init.body).toBe(
          JSON.stringify({ email: secretEmail, password: secretPassword }),
        );
        return response(200, {
          headers: {
            "x-request-id": requestId,
            "set-cookie": `token=${sessionSecret}; Path=/; HttpOnly`,
          },
          json: { success: true, totpEnabled: false },
        });
      }
      if (url.pathname === "/api/accounts") {
        if (new Headers(init.headers).get("cookie")) {
          return response(200, { json: { success: true, data: [] } });
        }
        return response(401);
      }
      if (url.pathname === "/api/transactions") {
        expect(new Headers(init.headers).get("cookie")).toBe(
          `token=${sessionSecret}`,
        );
        return response(200, { json: { success: true, data: [] } });
      }

      throw new Error(`unexpected request ${url.pathname}`);
    });

    const result = await runProdSmoke({
      baseUrl: "https://example.test",
      email: secretEmail,
      password: secretPassword,
      fetchImpl,
      requestIdFactory: () => "request-12345678",
      log: (message) => logs.push(message),
    });

    expect(result).toEqual({ authenticated: true });
    expect(seenMethods).toEqual([
      ["/api/health", "GET"],
      ["/login", "GET"],
      ["/dashboard", "GET"],
      ["/api/accounts", "GET"],
      ["/api/auth/login", "POST"],
      ["/api/accounts", "GET"],
      ["/api/transactions", "GET"],
    ]);
    expect(logs.join("\n")).not.toContain(secretEmail);
    expect(logs.join("\n")).not.toContain(secretPassword);
    expect(logs.join("\n")).not.toContain(sessionSecret);
  });

  it("fails safely when only one credential is configured or the smoke account requires MFA", async () => {
    await expect(
      runProdSmoke({
        baseUrl: "https://example.test",
        email: "smoke@example.test",
        fetchImpl: vi.fn(),
      }),
    ).rejects.toThrow(
      "PROD_SMOKE_EMAIL e PROD_SMOKE_PASSWORD devem ser informados juntos",
    );

    const fetchImpl = createFetch((url, init) => {
      const requestId = new Headers(init.headers).get("x-request-id");
      if (url.pathname === "/api/health") {
        return response(200, {
          headers: { "x-request-id": requestId },
          json: {
            status: "ok",
            checks: { application: "ok", database: "ok" },
          },
        });
      }
      if (url.pathname === "/login") {
        return response(200, { headers: { "x-request-id": requestId } });
      }
      if (url.pathname === "/dashboard") {
        return response(307, {
          headers: {
            "x-request-id": requestId,
            location: "https://example.test/login",
          },
        });
      }
      if (url.pathname === "/api/accounts") return response(401);
      if (url.pathname === "/api/auth/login") {
        return response(200, {
          headers: { "x-request-id": requestId },
          json: { success: true, mfaRequired: true },
        });
      }
      throw new Error("unexpected request");
    });

    await expect(
      runProdSmoke({
        baseUrl: "https://example.test",
        email: "smoke@example.test",
        password: "SenhaSmoke123",
        fetchImpl,
        requestIdFactory: () => "request-12345678",
        log: () => undefined,
      }),
    ).rejects.toThrow("conta de smoke exige MFA");
  });
});
