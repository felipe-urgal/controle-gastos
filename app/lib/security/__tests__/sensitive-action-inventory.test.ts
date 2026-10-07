import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  SENSITIVE_ACTIONS,
  SENSITIVE_ACTION_POLICIES,
} from "@/app/lib/security/sensitive-actions";

const inventory = [
  {
    path: "app/lib/users/user-crud.ts",
    actions: [
      SENSITIVE_ACTIONS.USER_EMAIL_CHANGE,
      SENSITIVE_ACTIONS.USER_PASSWORD_CHANGE,
    ],
    guard: "consumeStepUpRateLimit",
  },
  {
    path: "app/api/user/route.ts",
    actions: [SENSITIVE_ACTIONS.USER_DELETE],
    guard: "verifyStepUpAuth",
  },
  {
    path: "app/api/auth/mfa/enrollment/start/route.ts",
    actions: [SENSITIVE_ACTIONS.MFA_ENROLL_START],
    guard: "consumeStepUpRateLimit",
  },
  {
    path: "app/api/auth/mfa/enrollment/confirm/route.ts",
    actions: [SENSITIVE_ACTIONS.MFA_ENROLL_CONFIRM],
    guard: "consumeStepUpRateLimit",
  },
  {
    path: "app/api/auth/mfa/settings/route.ts",
    actions: [SENSITIVE_ACTIONS.MFA_DISABLE],
    guard: "consumeStepUpRateLimit",
  },
  {
    path: "app/lib/security/totp-recovery.ts",
    actions: [SENSITIVE_ACTIONS.MFA_RECOVERY_REGENERATE],
    guard: "verifyStepUpAuth",
  },
  {
    path: "app/api/mcp/tokens/route.ts",
    actions: [SENSITIVE_ACTIONS.MCP_TOKEN_CREATE],
    guard: "verifyStepUpAuth",
  },
] as const;

describe("sensitive action inventory", () => {
  it("keeps every declared sensitive action covered by an explicit guard", () => {
    const covered = inventory.flatMap((entry) => entry.actions).sort();
    const declared = Object.values(SENSITIVE_ACTIONS).sort();
    expect(covered).toEqual(declared);

    for (const entry of inventory) {
      const source = readFileSync(join(process.cwd(), entry.path), "utf8");
      expect(source).toContain(entry.guard);

      for (const action of entry.actions) {
        const key = Object.entries(SENSITIVE_ACTIONS).find(
          ([, value]) => value === action,
        )?.[0];
        expect(key).toBeTruthy();
        expect(source).toContain(`SENSITIVE_ACTIONS.${key}`);
      }
    }
  });

  it("uses the same rate-limit policy for every sensitive action", () => {
    expect(
      Object.values(SENSITIVE_ACTION_POLICIES).every(
        (policy) => policy.rateLimit === "STEP_UP",
      ),
    ).toBe(true);
  });

  it("keeps credential failures generic", () => {
    const sources = [
      "app/lib/users/user-crud.ts",
      "app/lib/security/step-up-auth.ts",
      "app/lib/security/totp-disable.ts",
      "app/lib/security/totp-enrollment.ts",
    ]
      .map((path) => readFileSync(join(process.cwd(), path), "utf8"))
      .join("\n");

    expect(sources).not.toMatch(
      /E-mail já está em uso|Senha atual inválida|Segundo fator inválido/,
    );
    expect(sources).toContain("Credencial de confirmação inválida");
  });
});
