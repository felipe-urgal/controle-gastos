import { randomUUID } from "node:crypto";

import { afterAll, afterEach, describe, expect, it } from "vitest";

import { prisma } from "@/app/lib/prisma";
import {
  consumeMfaLoginWithRecoveryCode,
  consumeMfaLoginWithTotp,
  persistMfaLoginChallenge,
} from "@/app/lib/security/mfa-persistence";
import { hashRecoveryCode } from "@/app/lib/security/totp-secrets";

const createdUserIds: string[] = [];

async function createEnabledUser(label: string, lastStep = BigInt(100)) {
  const user = await prisma.user.create({
    data: {
      name: `MFA ${label}`,
      email: `mfa-login-${label}-${randomUUID()}@example.com`,
      password: "test-hash",
      totpEnabled: true,
      totpSecretEncrypted: "v1.test.test.test",
      totpActivatedAt: new Date(),
      totpLastUsedStep: lastStep,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

async function createChallenge(userId: string) {
  const challengeId = randomUUID();
  const challenge = await persistMfaLoginChallenge({
    userId,
    challengeId,
    expiresAt: new Date(Date.now() + 60_000),
  });
  return { challenge, challengeId };
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

describe("atomic MFA login consumption", () => {
  it("rolls back challenge consumption when the TOTP time-step cannot advance", async () => {
    const user = await createEnabledUser("totp");
    const { challenge, challengeId } = await createChallenge(user.id);

    expect(
      await consumeMfaLoginWithTotp({
        userId: user.id,
        challengeId,
        timeStep: BigInt(100),
      })
    ).toBe(false);

    const afterRejected = await prisma.mfaLoginChallenge.findUniqueOrThrow({
      where: { id: challenge.id },
      select: { consumedAt: true },
    });
    expect(afterRejected.consumedAt).toBeNull();

    expect(
      await consumeMfaLoginWithTotp({
        userId: user.id,
        challengeId,
        timeStep: BigInt(101),
      })
    ).toBe(true);

    const [afterSuccess, persistedUser] = await Promise.all([
      prisma.mfaLoginChallenge.findUniqueOrThrow({
        where: { id: challenge.id },
        select: { consumedAt: true },
      }),
      prisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { totpLastUsedStep: true },
      }),
    ]);
    expect(afterSuccess.consumedAt).not.toBeNull();
    expect(persistedUser.totpLastUsedStep).toBe(BigInt(101));
  });

  it("keeps the challenge reusable after a wrong recovery code and consumes both on success", async () => {
    const user = await createEnabledUser("recovery");
    const recoveryCode = "A1B2-C3D4-E5F6-0123-4567";
    const wrongCode = "FFFF-FFFF-FFFF-FFFF-FFFF";
    const recovery = await prisma.totpRecoveryCode.create({
      data: {
        userId: user.id,
        codeHash: hashRecoveryCode(recoveryCode),
      },
    });
    const { challenge, challengeId } = await createChallenge(user.id);

    expect(
      await consumeMfaLoginWithRecoveryCode({
        userId: user.id,
        challengeId,
        code: wrongCode,
      })
    ).toBe(false);

    const afterWrongCode = await prisma.mfaLoginChallenge.findUniqueOrThrow({
      where: { id: challenge.id },
      select: { consumedAt: true },
    });
    expect(afterWrongCode.consumedAt).toBeNull();

    expect(
      await consumeMfaLoginWithRecoveryCode({
        userId: user.id,
        challengeId,
        code: recoveryCode,
      })
    ).toBe(true);

    const [usedChallenge, usedRecovery] = await Promise.all([
      prisma.mfaLoginChallenge.findUniqueOrThrow({
        where: { id: challenge.id },
        select: { consumedAt: true },
      }),
      prisma.totpRecoveryCode.findUniqueOrThrow({
        where: { id: recovery.id },
        select: { usedAt: true },
      }),
    ]);
    expect(usedChallenge.consumedAt).not.toBeNull();
    expect(usedRecovery.usedAt).not.toBeNull();

    const fresh = await createChallenge(user.id);
    expect(
      await consumeMfaLoginWithRecoveryCode({
        userId: user.id,
        challengeId: fresh.challengeId,
        code: recoveryCode,
      })
    ).toBe(false);

    const freshAfterReplay = await prisma.mfaLoginChallenge.findUniqueOrThrow({
      where: { id: fresh.challenge.id },
      select: { consumedAt: true },
    });
    expect(freshAfterReplay.consumedAt).toBeNull();
  });
});
