import crypto from "node:crypto";

import { prisma } from "@/app/lib/prisma";
import { hashRecoveryCode } from "@/app/lib/security/totp-secrets";

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
