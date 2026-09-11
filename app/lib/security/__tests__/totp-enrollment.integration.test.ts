import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { generate } from "otplib";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import {
  confirmTotpEnrollment,
  startTotpEnrollment,
} from "@/app/lib/security/totp-enrollment";
import {
  decryptTotpSecret,
  hashRecoveryCode,
  parseTotpEncryptionKey,
} from "@/app/lib/security/totp-secrets";

const CURRENT_PASSWORD = "senha-atual";
const TEST_JWT_SECRET = "test-jwt-secret-with-enough-length-for-mfa-enrollment";
const TEST_TOTP_KEY = "11".repeat(32);
const createdUserIds: string[] = [];

const previousJwtSecret = process.env.JWT_SECRET;
const previousTotpKey = process.env.TOTP_ENCRYPTION_KEY;

beforeEach(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.TOTP_ENCRYPTION_KEY = TEST_TOTP_KEY;
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  if (previousJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = previousJwtSecret;
  }

  if (previousTotpKey === undefined) {
    delete process.env.TOTP_ENCRYPTION_KEY;
  } else {
    process.env.TOTP_ENCRYPTION_KEY = previousTotpKey;
  }

  await prisma.$disconnect();
});

async function createUser(label: string) {
  const user = await prisma.user.create({
    data: {
      name: `TOTP ${label}`,
      email: `totp-${label}-${randomUUID()}@example.com`,
      password: await bcrypt.hash(CURRENT_PASSWORD, 10),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function generateCurrentToken(secret: string) {
  return generate({
    strategy: "totp",
    secret,
    algorithm: "sha1",
    digits: 6,
    period: 30,
  });
}

async function expectHttpError(
  promise: Promise<unknown>,
  expected: { status: number; code: string }
) {
  try {
    await promise;
    throw new Error("Era esperado HttpError");
  } catch (error) {
    expect(error).toBeInstanceOf(HttpError);
    expect((error as HttpError).status).toBe(expected.status);
    expect((error as HttpError).code).toBe(expected.code);
  }
}

describe("TOTP enrollment integration", () => {
  it("requires the current password and does not persist abandoned enrollment", async () => {
    const user = await createUser("abandoned");

    await expectHttpError(
      startTotpEnrollment({
        userId: user.id,
        currentPassword: "senha-incorreta",
      }),
      { status: 401, code: "INVALID_CURRENT_PASSWORD" }
    );

    const enrollment = await startTotpEnrollment({
      userId: user.id,
      currentPassword: CURRENT_PASSWORD,
    });

    expect(enrollment.secret).toMatch(/^[A-Z2-7]+$/);
    expect(enrollment.provisioningUri).toContain("otpauth://totp/");
    expect(enrollment.enrollmentToken).toBeTruthy();
    expect(enrollment.expiresInSeconds).toBe(600);

    const persisted = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        totpEnabled: true,
        totpSecretEncrypted: true,
        totpActivatedAt: true,
        totpLastUsedStep: true,
        _count: { select: { totpRecoveryCodes: true } },
      },
    });

    expect(persisted).toEqual({
      totpEnabled: false,
      totpSecretEncrypted: null,
      totpActivatedAt: null,
      totpLastUsedStep: null,
      _count: { totpRecoveryCodes: 0 },
    });
  });

  it("rejects another user's enrollment token without changing MFA state", async () => {
    const owner = await createUser("owner");
    const other = await createUser("other");
    const enrollment = await startTotpEnrollment({
      userId: owner.id,
      currentPassword: CURRENT_PASSWORD,
    });

    await expectHttpError(
      confirmTotpEnrollment({
        userId: other.id,
        enrollmentToken: enrollment.enrollmentToken,
        token: await generateCurrentToken(enrollment.secret),
      }),
      { status: 400, code: "INVALID_TOTP_ENROLLMENT" }
    );

    const states = await prisma.user.findMany({
      where: { id: { in: [owner.id, other.id] } },
      select: { totpEnabled: true, totpSecretEncrypted: true },
    });
    expect(states.every((state) => !state.totpEnabled && !state.totpSecretEncrypted)).toBe(true);
  });

  it("activates only after a valid first TOTP and stores recovery codes only as hashes", async () => {
    const user = await createUser("activate");
    const enrollment = await startTotpEnrollment({
      userId: user.id,
      currentPassword: CURRENT_PASSWORD,
    });

    await expectHttpError(
      confirmTotpEnrollment({
        userId: user.id,
        enrollmentToken: enrollment.enrollmentToken,
        token: "ABC123",
      }),
      { status: 400, code: "INVALID_TOTP" }
    );

    const beforeActivation = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { totpEnabled: true, totpSecretEncrypted: true },
    });
    expect(beforeActivation.totpEnabled).toBe(false);
    expect(beforeActivation.totpSecretEncrypted).toBeNull();

    const activation = await confirmTotpEnrollment({
      userId: user.id,
      enrollmentToken: enrollment.enrollmentToken,
      token: await generateCurrentToken(enrollment.secret),
    });

    expect(activation.recoveryCodes).toHaveLength(10);
    expect(new Set(activation.recoveryCodes).size).toBe(10);

    const persisted = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        totpEnabled: true,
        totpSecretEncrypted: true,
        totpActivatedAt: true,
        totpLastUsedStep: true,
      },
    });

    expect(persisted.totpEnabled).toBe(true);
    expect(persisted.totpActivatedAt).not.toBeNull();
    expect(persisted.totpLastUsedStep).not.toBeNull();
    expect(persisted.totpSecretEncrypted).toBeTruthy();
    expect(
      decryptTotpSecret(
        persisted.totpSecretEncrypted!,
        parseTotpEncryptionKey(TEST_TOTP_KEY)
      )
    ).toBe(enrollment.secret);

    const storedRecoveryCodes = await prisma.totpRecoveryCode.findMany({
      where: { userId: user.id },
      select: { codeHash: true, usedAt: true },
    });
    expect(storedRecoveryCodes).toHaveLength(10);
    expect(storedRecoveryCodes.every((code) => code.usedAt === null)).toBe(true);

    const storedHashes = new Set(storedRecoveryCodes.map((code) => code.codeHash));
    for (const recoveryCode of activation.recoveryCodes) {
      expect(storedHashes.has(hashRecoveryCode(recoveryCode))).toBe(true);
      expect(storedHashes.has(recoveryCode)).toBe(false);
    }
  });

  it("does not allow the same enrollment to activate twice", async () => {
    const user = await createUser("replay");
    const enrollment = await startTotpEnrollment({
      userId: user.id,
      currentPassword: CURRENT_PASSWORD,
    });
    const token = await generateCurrentToken(enrollment.secret);

    const firstActivation = await confirmTotpEnrollment({
      userId: user.id,
      enrollmentToken: enrollment.enrollmentToken,
      token,
    });

    await expectHttpError(
      confirmTotpEnrollment({
        userId: user.id,
        enrollmentToken: enrollment.enrollmentToken,
        token,
      }),
      { status: 409, code: "TOTP_ENROLLMENT_CONFLICT" }
    );

    const storedRecoveryCodes = await prisma.totpRecoveryCode.count({
      where: { userId: user.id },
    });
    expect(storedRecoveryCodes).toBe(firstActivation.recoveryCodes.length);
  });
});
