import { describe, expect, it } from "vitest";
import { shouldUseSecureAuthCookie } from "@/app/lib/auth-cookie";

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
