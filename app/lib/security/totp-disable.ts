import bcrypt from "bcryptjs";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import {
  decryptTotpSecret,
  hashRecoveryCode,
  parseTotpEncryptionKey,
} from "@/app/lib/security/totp-secrets";
import { verifyTotpToken } from "@/app/lib/security/totp";

class TotpDisableRejected extends Error {}
class TotpDisableInvalidFactor extends Error {}

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

export async function disableTotp(args: {
  userId: string;
  currentPassword: string;
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
      password: true,
      isActive: true,
      totpEnabled: true,
      totpSecretEncrypted: true,
      totpLastUsedStep: true,
    },
  });

  if (!user || !user.isActive) {
    throw new HttpError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  }

  if (!user.totpEnabled || !user.totpSecretEncrypted) {
    throw new HttpError("2FA não está ativo", 409, "TOTP_NOT_ENABLED");
  }

  const passwordMatches = await bcrypt.compare(args.currentPassword, user.password);
  if (!passwordMatches) {
    throw new HttpError(
      "Senha atual inválida",
      401,
      "INVALID_CURRENT_PASSWORD"
    );
  }

  let timeStep: bigint | undefined;
  let recoveryCodeHash: string | undefined;

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

    timeStep = verification.timeStep;
  } else {
    try {
      recoveryCodeHash = hashRecoveryCode(args.recoveryCode!);
    } catch {
      throw invalidMfa();
    }
  }

  const disabledAt = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      if (recoveryCodeHash) {
        const recoveryCode = await tx.totpRecoveryCode.updateMany({
          where: {
            userId: args.userId,
            codeHash: recoveryCodeHash,
            usedAt: null,
          },
          data: { usedAt: disabledAt },
        });

        if (recoveryCode.count !== 1) {
          throw new TotpDisableInvalidFactor();
        }
      }

      const disabled = await tx.user.updateMany({
        where: {
          id: args.userId,
          totpEnabled: true,
          totpSecretEncrypted: user.totpSecretEncrypted,
          ...(timeStep !== undefined
            ? {
                OR: [
                  { totpLastUsedStep: null },
                  { totpLastUsedStep: { lt: timeStep } },
                ],
              }
            : {}),
        },
        data: {
          totpEnabled: false,
          totpSecretEncrypted: null,
          totpActivatedAt: null,
          totpLastUsedStep: null,
        },
      });

      if (disabled.count !== 1) {
        throw new TotpDisableRejected();
      }

      await Promise.all([
        tx.totpRecoveryCode.deleteMany({ where: { userId: args.userId } }),
        tx.mfaLoginChallenge.deleteMany({ where: { userId: args.userId } }),
      ]);
    });
  } catch (error) {
    if (error instanceof TotpDisableInvalidFactor) {
      throw invalidMfa();
    }
    if (error instanceof TotpDisableRejected) {
      throw new HttpError(
        "2FA já foi desativado ou o estado mudou",
        409,
        "TOTP_DISABLE_CONFLICT"
      );
    }
    throw error;
  }

  return { disabledAt };
}
