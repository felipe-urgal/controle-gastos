import crypto from "node:crypto";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import {
  MFA_CHALLENGE_TTL_SECONDS,
  signMfaChallenge,
  verifyMfaChallenge,
} from "@/app/lib/security/mfa-challenge";
import {
  consumeMfaLoginWithRecoveryCode,
  consumeMfaLoginWithTotp,
  persistMfaLoginChallenge,
} from "@/app/lib/security/mfa-persistence";
import {
  decryptTotpSecret,
  parseTotpEncryptionKey,
} from "@/app/lib/security/totp-secrets";
import { verifyTotpToken } from "@/app/lib/security/totp";

function invalidMfa() {
  return new HttpError("Segundo fator inválido", 401, "INVALID_MFA");
}

function getTotpEncryptionKey() {
  const rawKey = process.env.TOTP_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("TOTP_ENCRYPTION_KEY_NOT_CONFIGURED");
  }

  return parseTotpEncryptionKey(rawKey);
}

export async function createMfaLoginChallenge(userId: string) {
  if (!userId.trim()) {
    throw new Error("Usuário MFA inválido");
  }

  const challengeId = crypto.randomUUID();
  const challenge = signMfaChallenge(userId, challengeId);
  const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_SECONDS * 1000);

  await persistMfaLoginChallenge({ userId, challengeId, expiresAt });

  return {
    challenge,
    expiresInSeconds: MFA_CHALLENGE_TTL_SECONDS,
  };
}

export function parseMfaLoginChallenge(challenge: string) {
  try {
    return verifyMfaChallenge(challenge);
  } catch {
    throw new HttpError(
      "Challenge MFA inválido ou expirado",
      401,
      "INVALID_MFA_CHALLENGE"
    );
  }
}

export async function completeMfaLogin(args: {
  userId: string;
  challengeId: string;
  token?: string;
  recoveryCode?: string;
}) {
  const hasTotp = Boolean(args.token?.trim());
  const hasRecovery = Boolean(args.recoveryCode?.trim());

  if (hasTotp === hasRecovery) {
    throw new HttpError(
      "Informe TOTP ou recovery code",
      400,
      "MFA_FACTOR_REQUIRED"
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: {
      id: true,
      name: true,
      email: true,
      showValues: true,
      isActive: true,
      totpEnabled: true,
      totpSecretEncrypted: true,
      totpLastUsedStep: true,
    },
  });

  if (!user || !user.isActive || !user.totpEnabled || !user.totpSecretEncrypted) {
    throw invalidMfa();
  }

  let consumed = false;

  if (hasTotp) {
    let secret: string;
    try {
      secret = decryptTotpSecret(user.totpSecretEncrypted, getTotpEncryptionKey());
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "TOTP_ENCRYPTION_KEY_NOT_CONFIGURED"
      ) {
        throw error;
      }
      throw new Error("TOTP_SECRET_DECRYPTION_FAILED");
    }

    const verification = await verifyTotpToken({
      secret,
      token: args.token!,
      afterTimeStep: user.totpLastUsedStep,
    });

    if (!verification.valid) {
      throw invalidMfa();
    }

    consumed = await consumeMfaLoginWithTotp({
      userId: user.id,
      challengeId: args.challengeId,
      timeStep: verification.timeStep,
    });
  } else {
    try {
      consumed = await consumeMfaLoginWithRecoveryCode({
        userId: user.id,
        challengeId: args.challengeId,
        code: args.recoveryCode!,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "Recovery code inválido") {
        throw invalidMfa();
      }
      throw error;
    }
  }

  if (!consumed) {
    throw invalidMfa();
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    showValues: user.showValues,
    totpEnabled: true,
  };
}
