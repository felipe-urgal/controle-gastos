import { describe, expect, it } from "vitest";

import {
  AUTHENTICATED_HOME,
  resolvePostLoginPath,
  sanitizeNextPath,
} from "@/app/lib/auth/protected-routes";

describe("sanitizeNextPath", () => {
  it("keeps internal protected paths with their query", () => {
    expect(sanitizeNextPath("/patrimonio")).toBe("/patrimonio");
    expect(sanitizeNextPath("/transacoes?mes=2026-10")).toBe("/transacoes?mes=2026-10");
  });

  it.each([
    "https://evil.example/dashboard",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "/dashboard\n//evil",
    "/login",
    "/api/user",
    "dashboard",
    "",
  ])("rejects %j", (value) => {
    expect(sanitizeNextPath(value)).toBeNull();
  });

  it("falls back to the dashboard", () => {
    expect(resolvePostLoginPath("?next=https://evil.example")).toBe(AUTHENTICATED_HOME);
    expect(resolvePostLoginPath("")).toBe(AUTHENTICATED_HOME);
    expect(resolvePostLoginPath("?next=%2Fmetas")).toBe("/metas");
  });
});
