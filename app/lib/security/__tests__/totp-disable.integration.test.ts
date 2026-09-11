import { randomUUID } from "node:crypto";

import bcrypt from "bcryptjs";
import { afterAll, afterEach, describe, expect, it } from "vitest";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { disableTotp } from "@/app/lib/security/totp-disable";
import { hashRecoveryCode } from "@/app/lib/security/totp-secrets";

const CURRENT_PASSWORD = "senha-atual";
const RECOVERY_CODE = "ABCD-EF01-2345-6789-ABCD";
const createdUserIds: string[] = [];

async function createMfaUser(label: string) {
  const user = await prisma.user.create({
    data: {
      name: `Disable ${label}`,
      email: `disable-${label}-${randomUUID()}@example.com`,
      password: await bcrypt.hash(CURRENT_PASSWORD, 10),
      totpEnabled: true,
      totpSecretEncrypted: "opaque-test-envelope",
      totpActivatedAt: new Date(),
      totpLastUsedStep: BigInt(1),
    },
  });
  createdUserIds.push(user.id);

  await prisma.totpRecoveryCode.create({
    data: {
      userId: user.id,
      codeHash: hashRecoveryCode(RECOVERY_CODE),
    },
  });

  await prisma.mfaLoginChallenge.create({
    data: {
      userId: user.id,
      jtiHash: randomUUID().replaceAll("-", ""),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  return user;
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

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds.splice(0) } },
    });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("TOTP disable integration", () => {
  it("disables 2FA atomically with a valid recovery code and clears MFA material", async () => {
    const user = await createMfaUser("success");

    const result = await disableTotp({
      userId: user.id,
      currentPassword: CURRENT_PASSWORD,
      recoveryCode: RECOVERY_CODE,
    });

    expect(result.disabledAt).toBeInstanceOf(Date);

    const persisted = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        totpEnabled: true,
        totpSecretEncrypted: true,
        totpActivatedAt: true,
        totpLastUsedStep: true,
      },
    });

    expect(persisted).toEqual({
      totpEnabled: false,
      totpSecretEncrypted: null,
      totpActivatedAt: null,
      totpLastUsedStep: null,
    });

    expect(
      await prisma.totpRecoveryCode.count({ where: { userId: user.id } })
    ).toBe(0);
    expect(
      await prisma.mfaLoginChallenge.count({ where: { userId: user.id } })
    ).toBe(0);
  });

  it("keeps MFA state unchanged when the recovery code is invalid", async () => {
    const user = await createMfaUser("invalid-recovery");

    await expectHttpError(
      disableTotp({
        userId: user.id,
        currentPassword: CURRENT_PASSWORD,
        recoveryCode: "FFFF-FFFF-FFFF-FFFF-FFFF",
      }),
      { status: 401, code: "INVALID_MFA" }
    );

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
    expect(persisted.totpSecretEncrypted).toBe("opaque-test-envelope");
    expect(persisted.totpActivatedAt).not.toBeNull();
    expect(persisted.totpLastUsedStep).toBe(BigInt(1));
    expect(
      await prisma.totpRecoveryCode.count({ where: { userId: user.id } })
    ).toBe(1);
    expect(
      await prisma.mfaLoginChallenge.count({ where: { userId: user.id } })
    ).toBe(1);
  });
});
