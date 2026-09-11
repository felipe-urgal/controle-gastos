import { describe, expect, it } from "vitest";
import { disableTotp } from "@/app/lib/security/totp-disable";

describe("security settings", () => {
  it("exposes the TOTP settings operation", () => {
    expect(disableTotp).toBeTypeOf("function");
  });
});
