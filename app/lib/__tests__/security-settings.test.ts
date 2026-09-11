import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
  compare: vi.fn(),
}));

vi.mock("@/app/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    $transaction: mocks.transaction,
  },
}));

vi.mock("bcryptjs", () => ({
  default: { compare: mocks.compare },
}));

vi.mock("@/app/lib/security/totp-secrets", () => ({
  decryptTotpSecret: vi.fn(),
  hashRecoveryCode: vi.fn(() => "hash"),
  parseTotpEncryptionKey: vi.fn(),
}));

vi.mock("@/app/lib/security/totp", () => ({
  verifyTotpToken: vi.fn(),
}));

import { disableTotp } from "@/app/lib/security/totp-disable";

describe("security settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findUnique.mockResolvedValue({
      password: "stored-hash",
      isActive: true,
      totpEnabled: true,
      totpSecretEncrypted: "encrypted",
      totpLastUsedStep: null,
    });
    mocks.compare.mockResolvedValue(true);
  });

  it("requires one verification factor", async () => {
    await expect(
      disableTotp({ userId: "user-1", currentPassword: "current" })
    ).rejects.toMatchObject({ status: 400, code: "MFA_FACTOR_REQUIRED" });
  });

  it("revalidates the current password before persistence", async () => {
    mocks.compare.mockResolvedValue(false);

    await expect(
      disableTotp({
        userId: "user-1",
        currentPassword: "current",
        recoveryCode: "recovery",
      })
    ).rejects.toMatchObject({ status: 401, code: "INVALID_CURRENT_PASSWORD" });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
