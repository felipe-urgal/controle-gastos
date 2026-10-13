import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getDeploymentInfo,
  getRequestId,
  logEvent,
  observeProviderCall,
} from "@/app/lib/observability";
import {
  normalizeClientErrorPath,
  parseClientErrorSurface,
} from "@/app/lib/observability-client-error";
import { resolveRequestId } from "@/app/lib/request-id";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("request ID contract (proxy e rotas compartilham a mesma regra)", () => {
  it("aceita IDs seguros e gera UUID para IDs ausentes ou inseguros", () => {
    expect(resolveRequestId("prod-smoke-abc123")).toBe("prod-smoke-abc123");
    for (const bad of [null, undefined, "", "curto", "tem espaço aqui!", "x".repeat(200), "a\nb-12345678"]) {
      expect(resolveRequestId(bad)).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it("getRequestId de rotas usa exatamente o helper compartilhado", () => {
    const request = new Request("http://localhost/", {
      headers: { "x-request-id": "correlation-12345" },
    });
    expect(getRequestId(request)).toBe(resolveRequestId("correlation-12345"));
  });
});

describe("redaction", () => {
  function logged(error: Error) {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    logEvent("error", "redaction_test", {}, error);
    return String(spy.mock.calls[0]?.[0]);
  }

  it("redige tokens MCP, bearer, JWT, Resend e conexão Postgres em stacks", () => {
    const error = new Error("boom");
    error.stack = [
      "Error: boom",
      "    at cgmcp_abcDEF123-_token (file.ts:1:1)",
      "    at Bearer abc.def.ghi (file.ts:2:2)",
      "    at re_abcdefghijklmnop (file.ts:3:3)",
      "    at postgresql://user:pass@host/db (file.ts:4:4)",
    ].join("\n");
    const line = logged(error);
    for (const secret of ["cgmcp_abcDEF123", "abc.def.ghi", "re_abcdefghijklmnop", "user:pass"]) {
      expect(line).not.toContain(secret);
    }
  });

  it("redige valores de CRON_SECRET e BRAPI_TOKEN configurados", () => {
    vi.stubEnv("CRON_SECRET", "cron-secret-value-123");
    vi.stubEnv("BRAPI_TOKEN", "brapi-token-value-456");
    const error = new Error("boom");
    error.stack = "Error: boom\n    at cron-secret-value-123 (a.ts:1:1)\n    at brapi-token-value-456 (b.ts:1:1)";
    const line = logged(error);
    expect(line).not.toContain("cron-secret-value-123");
    expect(line).not.toContain("brapi-token-value-456");
  });

  it("nunca loga a mensagem bruta do erro", () => {
    const line = logged(new Error("saldo 12345 de a@b.com"));
    expect(line).not.toContain("a@b.com");
    expect(line).not.toContain("12345");
  });
});

describe("versão/deployment controlados pelo servidor", () => {
  it("inclui commit e deployment nos logs quando disponíveis", () => {
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "0123456789abcdef0123");
    vi.stubEnv("VERCEL_DEPLOYMENT_ID", "dpl_test");
    expect(getDeploymentInfo()).toEqual({ version: "0123456789ab", deploymentId: "dpl_test" });
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logEvent("info", "deployment_test");
    expect(JSON.parse(String(spy.mock.calls[0]?.[0]))).toMatchObject({
      version: "0123456789ab",
      deploymentId: "dpl_test",
    });
  });
});

describe("telemetria de providers", () => {
  it("registra apenas provider, operation, outcome, retries e duração", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await observeProviderCall({ provider: "brapi", operation: "quote" }, async (meter) => {
      meter.retries = 1;
      return { symbol: "PETR4", price: 3500 };
    });
    const entry = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(entry).toMatchObject({
      event: "external_provider_call",
      provider: "brapi",
      operation: "quote",
      outcome: "success",
      retries: 1,
    });
    expect(typeof entry.durationMs).toBe("number");
    expect(JSON.stringify(entry)).not.toContain("PETR4");
    expect(JSON.stringify(entry)).not.toContain("3500");
  });

  it("distingue erro do usuário de indisponibilidade upstream e repassa o erro original", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const upstream = new Error("HTTP 503 para token abc");

    await expect(
      observeProviderCall(
        { provider: "bcb_ptax", operation: "exchange_rate" },
        async () => { throw upstream; },
        () => "upstream_unavailable",
      ),
    ).rejects.toBe(upstream);
    expect(JSON.parse(String(warn.mock.calls[0]?.[0]))).toMatchObject({
      outcome: "upstream_unavailable",
    });
    expect(String(warn.mock.calls[0]?.[0])).not.toContain("abc");

    await expect(
      observeProviderCall(
        { provider: "brapi", operation: "quote" },
        async () => { throw new Error("Ativo não encontrado"); },
        () => "user_error",
      ),
    ).rejects.toThrow();
    expect(JSON.parse(String(info.mock.calls[0]?.[0]))).toMatchObject({ outcome: "user_error" });
  });
});

describe("contexto seguro de client error", () => {
  it("normaliza pathname removendo query, hash e identificadores", () => {
    expect(normalizeClientErrorPath("/dashboard?x=1#a")).toBe("/dashboard");
    expect(normalizeClientErrorPath("/transacoes/show/cm9x7k2ab0001xyz9876543210")).toBe("/transacoes/show/:id");
    expect(normalizeClientErrorPath("/usuario/123e4567-e89b-12d3-a456-426614174000")).toBe("/usuario/:id");
    expect(normalizeClientErrorPath("https://evil.example/x")).toBeUndefined();
    expect(normalizeClientErrorPath("x".repeat(300))).toBeUndefined();
  });

  it("aceita apenas superfícies da allowlist", () => {
    expect(parseClientErrorSurface("route")).toBe("route");
    expect(parseClientErrorSurface("global")).toBe("global");
    expect(parseClientErrorSurface("dashboard")).toBeUndefined();
    expect(parseClientErrorSurface(42)).toBeUndefined();
  });
});
