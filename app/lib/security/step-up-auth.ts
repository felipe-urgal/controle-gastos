import bcrypt from "bcryptjs";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import {
  clearRateLimit,
  consumeRateLimit,
  getRequestIp,
} from "@/app/lib/security/rate-limit";
import {
  decryptTotpSecret,
  hashRecoveryCode,
  parseTotpEncryptionKey,
} from "@/app/lib/security/totp-secrets";
import { verifyTotpToken } from "@/app/lib/security/totp";

const FIFTEEN_MINUTES = 15 * 60 * 1000;

function invalidCredentials() {
  return new HttpError(
    "Credencial de confirmação inválida",
    401,
    "INVALID_STEP_UP_CREDENTIALS",
  );
}

function getTotpEncryptionKey() {
  const value = process.env.TOTP_ENCRYPTION_KEY;
  if (!value) throw new Error("TOTP_ENCRYPTION_KEY_NOT_CONFIGURED");
  return parseTotpEncryptionKey(value);
}

export async function consumeStepUpRateLimit(args: {
  request: Request;
  userId: string;
}) {
  const [ipLimit, userLimit] = await Promise.all([
    consumeRateLimit({
      action: "step-up-ip",
      identifier: getRequestIp(args.request),
      maxAttempts: 30,
      windowMs: FIFTEEN_MINUTES,
      blockMs: FIFTEEN_MINUTES,
    }),
    consumeRateLimit({
      action: "step-up-user",
      identifier: args.userId,
      maxAttempts: 5,
      windowMs: FIFTEEN_MINUTES,
      blockMs: FIFTEEN_MINUTES,
    }),
  ]);

  if (ipLimit.limited || userLimit.limited) {
    throw new HttpError(
      "Muitas tentativas de confirmação. Tente novamente mais tarde.",
      429,
      "STEP_UP_RATE_LIMITED",
    );
  }
}

export async function verifyStepUpAuth(args: {
  request: Request;
  userId: string;
  currentPassword: string;
  token?: string;
  recoveryCode?: string;
}) {
  await consumeStepUpRateLimit({ request: args.request, userId: args.userId });

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

  if (!(await bcrypt.compare(args.currentPassword, user.password))) {
    throw invalidCredentials();
  }

  if (user.totpEnabled) {
    const hasTotp = Boolean(args.token?.trim());
    const hasRecovery = Boolean(args.recoveryCode?.trim());

    if (hasTotp === hasRecovery) {
      throw new HttpError(
        "Informe exatamente um código TOTP ou recovery code",
        400,
        "MFA_FACTOR_REQUIRED",
      );
    }

    if (hasRecovery) {
      let codeHash: string;
      try {
        codeHash = hashRecoveryCode(args.recoveryCode!);
      } catch {
        throw invalidCredentials();
      }

      const consumed = await prisma.totpRecoveryCode.updateMany({
        where: {
          userId: args.userId,
          codeHash,
          usedAt: null,
        },
        data: { usedAt: new Date() },
      });

      if (consumed.count !== 1) throw invalidCredentials();
    } else {
      if (!user.totpSecretEncrypted) throw invalidCredentials();

      const secret = decryptTotpSecret(
        user.totpSecretEncrypted,
        getTotpEncryptionKey(),
      );
      const verification = await verifyTotpToken({
        secret,
        token: args.token!,
        afterTimeStep: user.totpLastUsedStep,
      });

      if (!verification.valid) throw invalidCredentials();

      const consumed = await prisma.user.updateMany({
        where: {
          id: args.userId,
          totpEnabled: true,
          OR: [
            { totpLastUsedStep: null },
            { totpLastUsedStep: { lt: verification.timeStep } },
          ],
        },
        data: { totpLastUsedStep: verification.timeStep },
      });

      if (consumed.count !== 1) throw invalidCredentials();
    }
  }

  await Promise.allSettled([
    clearRateLimit("step-up-user", args.userId),
  ]);
}
