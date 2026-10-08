import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";

import { hashPassword, validatePassword } from "@/app/lib/auth/password-policy";
import { PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH } from "@/app/lib/auth/password-rules";

describe("password policy", () => {
  it("accepts passphrases from the minimum length up to 72 bytes", () => {
    expect(validatePassword("a".repeat(PASSWORD_MIN_LENGTH))).toBeNull();
    expect(validatePassword("a".repeat(PASSWORD_MAX_BYTES))).toBeNull();
  });

  it("rejects passwords below the minimum", () => {
    expect(validatePassword("Abc12345")).toMatch(/pelo menos/);
  });

  it("rejects ASCII passwords above 72 bytes", () => {
    expect(validatePassword("a".repeat(PASSWORD_MAX_BYTES + 1))).toMatch(/72 bytes/);
  });

  it("rejects Unicode passwords that exceed 72 bytes before 72 characters", () => {
    const password = "ção".repeat(20); // 60 caracteres, 80 bytes
    expect(password.length).toBeLessThan(PASSWORD_MAX_BYTES);
    expect(bcrypt.truncates(password)).toBe(true);
    expect(validatePassword(password)).toMatch(/72 bytes/);
  });

  it("never hashes a password that bcrypt would truncate", () => {
    expect(() => hashPassword("a".repeat(PASSWORD_MAX_BYTES + 1))).toThrow();
  });

  it("keeps verifying legacy short hashes at login", async () => {
    const legacy = await bcrypt.hash("Abc123", 4);
    expect(await bcrypt.compare("Abc123", legacy)).toBe(true);
  });
});
