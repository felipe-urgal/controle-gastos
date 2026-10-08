import { describe, expect, it } from "vitest";
import { shouldUseSecureAuthCookie } from "@/app/lib/auth/auth-cookie";

describe("auth cookie transport security", () => {
  it("uses Secure for a direct HTTPS request", () => {
    const request = new Request("https://controle-gastos.example/api/auth/login");

    expect(shouldUseSecureAuthCookie(request)).toBe(true);
  });

  it("uses Secure when HTTPS is terminated by a trusted proxy", () => {
    const request = new Request("http://internal:5100/api/auth/login", {
      headers: { "x-forwarded-proto": "https" },
    });

    expect(shouldUseSecureAuthCookie(request)).toBe(true);
  });

  it("does not mark the cookie Secure for a direct HTTP request", () => {
    const request = new Request("http://127.0.0.1:5100/api/auth/login");

    expect(shouldUseSecureAuthCookie(request)).toBe(false);
  });

  it("never downgrades a direct HTTPS request because of a forwarded header", () => {
    const request = new Request("https://controle-gastos.example/api/auth/login", {
      headers: { "x-forwarded-proto": "http" },
    });

    expect(shouldUseSecureAuthCookie(request)).toBe(true);
  });
});

describe("auth cookie naming and lifecycle", () => {
  it("issues a __Host- cookie over HTTPS without Domain and clears the legacy name", async () => {
    const { NextResponse } = await import("next/server");
    const { setAuthCookie } = await import("@/app/lib/auth/auth-cookie");
    const response = NextResponse.json({});

    setAuthCookie(response, new Request("https://app.example/api/auth/login"), "jwt");

    const host = response.cookies.get("__Host-token");
    expect(host).toMatchObject({
      value: "jwt",
      httpOnly: true,
      secure: true,
      path: "/",
      sameSite: "lax",
    });
    expect(host).not.toHaveProperty("domain");
    expect(response.cookies.get("token")).toMatchObject({ value: "", maxAge: 0 });
  });

  it("keeps the plain cookie name over HTTP so local development works", async () => {
    const { NextResponse } = await import("next/server");
    const { setAuthCookie } = await import("@/app/lib/auth/auth-cookie");
    const response = NextResponse.json({});

    setAuthCookie(response, new Request("http://127.0.0.1:5100/api/auth/login"), "jwt");

    expect(response.cookies.get("token")).toMatchObject({ value: "jwt", secure: false });
    expect(response.cookies.get("__Host-token")).toBeUndefined();
  });

  it("clears both names on logout, with Secure on the __Host- one", async () => {
    const { NextResponse } = await import("next/server");
    const { clearAuthCookies } = await import("@/app/lib/auth/auth-cookie");
    const response = NextResponse.json({});

    clearAuthCookies(response, false);

    expect(response.cookies.get("token")).toMatchObject({ maxAge: 0 });
    expect(response.cookies.get("__Host-token")).toMatchObject({ maxAge: 0, secure: true, path: "/" });
  });

  it("reads __Host- first and falls back to sessions issued with the legacy name", async () => {
    const { readAuthCookie } = await import("@/app/lib/auth/auth-cookie");
    const store = (values: Record<string, string>) => ({
      get: (name: string) => (name in values ? { value: values[name] } : undefined),
    });

    expect(readAuthCookie(store({ "__Host-token": "new", token: "old" }))).toBe("new");
    expect(readAuthCookie(store({ token: "old" }))).toBe("old");
    expect(readAuthCookie(store({}))).toBeUndefined();
  });
});
