import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("TOTP key rotation maintenance script", () => {
  it("loads under the supported Node runtime and exposes safe dry-run usage", () => {
    const result = spawnSync(
      process.execPath,
      [resolve("scripts/rotate-totp-encryption-key.mjs"), "--help"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          DATABASE_URL:
            process.env.DATABASE_URL ??
            "postgresql://postgres:postgres@localhost:5432/controle_gastos_test",
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("Sem --apply");
    expect(result.stdout).toContain("TOTP_ENCRYPTION_PREVIOUS_KEYS");
  });
});
