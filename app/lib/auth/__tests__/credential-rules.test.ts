import { describe, expect, it } from "vitest";

import {
  getEmailError,
  getNameError,
  isValidEmail,
  normalizeEmail,
} from "@/app/lib/auth/credential-rules";

describe("credential rules", () => {
  it("normalizes e-mail with trim + lowercase", () => {
    expect(normalizeEmail("  Ana@Example.COM \n")).toBe("ana@example.com");
  });

  it("validates e-mail shape and length", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(getEmailError("sem-arroba")).toBe("E-mail inválido");
    expect(getEmailError("   ")).toBe("E-mail é obrigatório");
    expect(getEmailError(`${"a".repeat(120)}@x.com`)).toBe("E-mail é muito longo");
  });

  it("applies one name rule regardless of surrounding whitespace", () => {
    expect(getNameError("  A  ")).toMatch(/pelo menos 2/);
    expect(getNameError("Jo")).toBeNull();
    expect(getNameError("  Zé ")).toBeNull();
    expect(getNameError("é".repeat(101))).toMatch(/exceder 100/);
  });
});
