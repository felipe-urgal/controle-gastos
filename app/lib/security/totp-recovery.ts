import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { generateRecoveryCodes, hashRecoveryCode } from "@/app/lib/security/totp-secrets";
import { verifyStepUpAuth } from "@/app/lib/security/step-up-auth";

export async function getRecoveryCodeStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpEnabled: true },
  });

  if (!user) {
    throw new HttpError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  }

  if (!user.totpEnabled) {
    return { enabled: false, remaining: 0 };
  }

  const remaining = await prisma.totpRecoveryCode.count({
    where: { userId, usedAt: null },
  });

  return { enabled: true, remaining };
}

export async function regenerateRecoveryCodes(args: {
  request: Request;
  userId: string;
  currentPassword: string;
  token?: string;
  recoveryCode?: string;
}) {
  const status = await getRecoveryCodeStatus(args.userId);
  if (!status.enabled) {
    throw new HttpError("2FA não está ativado", 409, "TOTP_NOT_ENABLED");
  }

  await verifyStepUpAuth(args);

  const recoveryCodes = generateRecoveryCodes();

  await prisma.$transaction(async (tx) => {
    const current = await tx.user.count({
      where: { id: args.userId, totpEnabled: true },
    });

    if (current !== 1) {
      throw new HttpError(
        "O estado do 2FA mudou. Tente novamente.",
        409,
        "TOTP_STATE_CHANGED",
      );
    }

    await tx.totpRecoveryCode.deleteMany({
      where: { userId: args.userId },
    });

    await tx.totpRecoveryCode.createMany({
      data: recoveryCodes.map((code) => ({
        userId: args.userId,
        codeHash: hashRecoveryCode(code),
      })),
    });
  });

  return {
    recoveryCodes,
    remaining: recoveryCodes.length,
  };
}
