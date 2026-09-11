import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  transaction: vi.fn(),
  compare: vi.fn(),
  decryptTotpSecret: vi.fn(),
  hashRecoveryCode: vi.fn(() => "hash"),
  parseTotpEncryptionKey: vi.fn(),
  verifyTotpToken: vi.fn(),
  userUpdateMany: vi.fn(),
  recoveryUpdateMany: vi.fn(),
  recoveryDeleteMany: vi.fn(),
  challengeDeleteMany: vi.fn(),
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
  decryptTotpSecret: mocks.decryptTotpSecret,
  hashRecoveryCode: mocks.hashRecoveryCode,
  parseTotpEncryptionKey: mocks.parseTotpEncryptionKey,
}));

vi.mock("@/app/lib/security/totp", () => ({
  verifyTotpToken: mocks.verifyTotpToken,
}));

import { disableTotp } from "@/app/lib/security/totp-disable";

const previousTotpKey = process.env.TOTP_ENCRYPTION_KEY;

describe("security settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TOTP_ENCRYPTION_KEY = "test-key";
    mocks.findUnique.mockResolvedValue({
      password: "stored-hash",
      isActive: true,
      totpEnabled: true,
      totpSecretEncrypted: "encrypted",
      totpLastUsedStep: null,
    });
    mocks.compare.mockResolvedValue(true);
    mocks.decryptTotpSecret.mockReturnValue("totp-secret");
    mocks.parseTotpEncryptionKey.mockReturnValue(Buffer.alloc(32));
    mocks.verifyTotpToken.mockResolvedValue({
      valid: true,
      timeStep: BigInt(42),
    });
    mocks.userUpdateMany.mockResolvedValue({ count: 1 });
    mocks.recoveryUpdateMany.mockResolvedValue({ count: 1 });
    mocks.recoveryDeleteMany.mockResolvedValue({ count: 1 });
    mocks.challengeDeleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { updateMany: mocks.userUpdateMany },
        totpRecoveryCode: {
          updateMany: mocks.recoveryUpdateMany,
          deleteMany: mocks.recoveryDeleteMany,
        },
        mfaLoginChallenge: { deleteMany: mocks.challengeDeleteMany },
      })
    );
  });

  afterAll(() => {
    if (previousTotpKey === undefined) {
      delete process.env.TOTP_ENCRYPTION_KEY;
    } else {
      process.env.TOTP_ENCRYPTION_KEY = previousTotpKey;
    }
  });

  it("requires one verification factor", async () => {
    await expect(
      disableTotp({ userId: "user-1", currentPassword: "current" })
    ).rejects.toMatchObject({ status: 400, code: "MFA_FACTOR_REQUIRED" });
  });

  it("rejects two verification factors in the same request", async () => {
    await expect(
      disableTotp({
        userId: "user-1",
        currentPassword: "current",
        token: "one-time-code",
        recoveryCode: "recovery",
      })
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

  it("rejects accounts without active TOTP", async () => {
    mocks.findUnique.mockResolvedValue({
      password: "stored-hash",
      isActive: true,
      totpEnabled: false,
      totpSecretEncrypted: null,
      totpLastUsedStep: null,
    });

    await expect(
      disableTotp({
        userId: "user-1",
        currentPassword: "current",
        recoveryCode: "recovery",
      })
    ).rejects.toMatchObject({ status: 409, code: "TOTP_NOT_ENABLED" });

    expect(mocks.compare).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("accepts a valid TOTP and clears all MFA state transactionally", async () => {
    const result = await disableTotp({
      userId: "user-1",
      currentPassword: "current",
      token: "123456",
    });

    expect(result.disabledAt).toBeInstanceOf(Date);
    expect(mocks.verifyTotpToken).toHaveBeenCalledWith({
      secret: "totp-secret",
      token: "123456",
      afterTimeStep: null,
    });
    expect(mocks.userUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "user-1",
          totpEnabled: true,
          OR: [
            { totpLastUsedStep: null },
            { totpLastUsedStep: { lt: BigInt(42) } },
          ],
        }),
        data: {
          totpEnabled: false,
          totpSecretEncrypted: null,
          totpActivatedAt: null,
          totpLastUsedStep: null,
        },
      })
    );
    expect(mocks.recoveryDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(mocks.challengeDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
  });

  it("rejects an invalid TOTP before opening the transaction", async () => {
    mocks.verifyTotpToken.mockResolvedValue({ valid: false });

    await expect(
      disableTotp({
        userId: "user-1",
        currentPassword: "current",
        token: "000000",
      })
    ).rejects.toMatchObject({ status: 401, code: "INVALID_MFA" });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
