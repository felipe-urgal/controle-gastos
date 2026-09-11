import crypto from "node:crypto";

import { prisma } from "@/app/lib/prisma";
import { hashRecoveryCode } from "@/app/lib/security/totp-secrets";

class MfaLoginConsumptionRejected extends Error {}

function assertIdentity(value: string, field: string) {
  if (!value.trim()) {
    throw new Error(`${field} inválido`);
  }
}

function assertInstant(value: Date) {
  if (Number.isNaN(value.getTime())) {
    throw new Error("Instante MFA inválido");
  }
}

function assertTotpTimeStep(value: bigint) {
  if (value < BigInt(0)) {
    throw new Error("Time-step TOTP inválido");
  }
}

export function hashMfaChallengeId(challengeId: string) {
  assertIdentity(challengeId, "Challenge MFA");

  return crypto
    .createHash("sha256")
    .update(challengeId, "utf8")
    .digest("hex");
}

export async function persistMfaLoginChallenge(args: {
  userId: string;
  challengeId: string;
  expiresAt: Date;
}) {
  assertIdentity(args.userId, "Usuário MFA");
  assertInstant(args.expiresAt);

  return prisma.mfaLoginChallenge.create({
    data: {
      userId: args.userId,
      jtiHash: hashMfaChallengeId(args.challengeId),
      expiresAt: args.expiresAt,
    },
  });
}

export async function consumeMfaLoginChallenge(args: {
  userId: string;
  challengeId: string;
  now?: Date;
}) {
  assertIdentity(args.userId, "Usuário MFA");
  const now = args.now ?? new Date();
  assertInstant(now);

  const result = await prisma.mfaLoginChallenge.updateMany({
    where: {
      userId: args.userId,
      jtiHash: hashMfaChallengeId(args.challengeId),
      consumedAt: null,
      expiresAt: { gt: now },
    },
    data: { consumedAt: now },
  });

  return result.count === 1;
}

export async function consumeTotpRecoveryCode(args: {
  userId: string;
  code: string;
  now?: Date;
}) {
  assertIdentity(args.userId, "Usuário MFA");
  const now = args.now ?? new Date();
  assertInstant(now);

  const result = await prisma.totpRecoveryCode.updateMany({
    where: {
      userId: args.userId,
      codeHash: hashRecoveryCode(args.code),
      usedAt: null,
    },
    data: { usedAt: now },
  });

  return result.count === 1;
}

export async function consumeTotpTimeStep(args: {
  userId: string;
  timeStep: bigint;
}) {
  assertIdentity(args.userId, "Usuário MFA");
  assertTotpTimeStep(args.timeStep);

  const result = await prisma.user.updateMany({
    where: {
      id: args.userId,
      totpEnabled: true,
      OR: [
        { totpLastUsedStep: null },
        { totpLastUsedStep: { lt: args.timeStep } },
      ],
    },
    data: { totpLastUsedStep: args.timeStep },
  });

  return result.count === 1;
}

export async function consumeMfaLoginWithTotp(args: {
  userId: string;
  challengeId: string;
  timeStep: bigint;
  now?: Date;
}) {
  assertIdentity(args.userId, "Usuário MFA");
  assertTotpTimeStep(args.timeStep);
  const now = args.now ?? new Date();
  assertInstant(now);
  const challengeHash = hashMfaChallengeId(args.challengeId);

  try {
    await prisma.$transaction(async (tx) => {
      const challenge = await tx.mfaLoginChallenge.updateMany({
        where: {
          userId: args.userId,
          jtiHash: challengeHash,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (challenge.count !== 1) {
        throw new MfaLoginConsumptionRejected();
      }

      const timeStep = await tx.user.updateMany({
        where: {
          id: args.userId,
          totpEnabled: true,
          OR: [
            { totpLastUsedStep: null },
            { totpLastUsedStep: { lt: args.timeStep } },
          ],
        },
        data: { totpLastUsedStep: args.timeStep },
      });

      if (timeStep.count !== 1) {
        throw new MfaLoginConsumptionRejected();
      }
    });

    return true;
  } catch (error) {
    if (error instanceof MfaLoginConsumptionRejected) {
      return false;
    }
    throw error;
  }
}

export async function consumeMfaLoginWithRecoveryCode(args: {
  userId: string;
  challengeId: string;
  code: string;
  now?: Date;
}) {
  assertIdentity(args.userId, "Usuário MFA");
  const now = args.now ?? new Date();
  assertInstant(now);
  const challengeHash = hashMfaChallengeId(args.challengeId);
  const recoveryCodeHash = hashRecoveryCode(args.code);

  try {
    await prisma.$transaction(async (tx) => {
      const challenge = await tx.mfaLoginChallenge.updateMany({
        where: {
          userId: args.userId,
          jtiHash: challengeHash,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (challenge.count !== 1) {
        throw new MfaLoginConsumptionRejected();
      }

      const recoveryCode = await tx.totpRecoveryCode.updateMany({
        where: {
          userId: args.userId,
          codeHash: recoveryCodeHash,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      if (recoveryCode.count !== 1) {
        throw new MfaLoginConsumptionRejected();
      }
    });

    return true;
  } catch (error) {
    if (error instanceof MfaLoginConsumptionRejected) {
      return false;
    }
    throw error;
  }
}
