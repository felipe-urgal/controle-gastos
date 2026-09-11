import bcrypt from "bcryptjs";

import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import {
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  hashRecoveryCode,
  parseTotpEncryptionKey,
} from "@/app/lib/security/totp-secrets";
import {
  signTotpEnrollmentToken,
  TOTP_ENROLLMENT_TTL_SECONDS,
  verifyTotpEnrollmentToken,
} from "@/app/lib/security/totp-enrollment-token";
import {
  generateTotpProvisioningUri,
  generateTotpSecret,
  verifyTotpToken,
} from "@/app/lib/security/totp";

const RECOVERY_CODE_COUNT = 10;

function getTotpEncryptionKey() {
  const rawKey = process.env.TOTP_ENCRYPTION_KEY;
  if (!rawKey) {
    throw new Error("TOTP_ENCRYPTION_KEY_NOT_CONFIGURED");
  }

  return parseTotpEncryptionKey(rawKey);
}

export async function startTotpEnrollment(args: {
  userId: string;
  currentPassword: string;
}) {
  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: {
      email: true,
      password: true,
      totpEnabled: true,
    },
  });

  if (!user) {
    throw new HttpError("Usuário não encontrado", 404, "USER_NOT_FOUND");
  }

  if (user.totpEnabled) {
    throw new HttpError("2FA já está ativado", 409, "TOTP_ALREADY_ENABLED");
  }

  const passwordMatches = await bcrypt.compare(args.currentPassword, user.password);
  if (!passwordMatches) {
    throw new HttpError(
      "Senha atual inválida",
      401,
      "INVALID_CURRENT_PASSWORD"
    );
  }

  const secret = generateTotpSecret();
  const secretEnvelope = encryptTotpSecret(secret, getTotpEncryptionKey());

  return {
    enrollmentToken: signTotpEnrollmentToken({
      userId: args.userId,
      secretEnvelope,
    }),
    expiresInSeconds: TOTP_ENROLLMENT_TTL_SECONDS,
    provisioningUri: generateTotpProvisioningUri({
      secret,
      label: user.email,
    }),
    secret,
  };
}

export async function confirmTotpEnrollment(args: {
  userId: string;
  enrollmentToken: string;
  token: string;
}) {
  let enrollment: ReturnType<typeof verifyTotpEnrollmentToken>;
  try {
    enrollment = verifyTotpEnrollmentToken(args.enrollmentToken);
  } catch {
    throw new HttpError(
      "Enrollment TOTP inválido ou expirado",
      400,
      "INVALID_TOTP_ENROLLMENT"
    );
  }

  if (enrollment.userId !== args.userId) {
    throw new HttpError(
      "Enrollment TOTP inválido ou expirado",
      400,
      "INVALID_TOTP_ENROLLMENT"
    );
  }

  let secret: string;
  try {
    secret = decryptTotpSecret(enrollment.secretEnvelope, getTotpEncryptionKey());
  } catch {
    throw new HttpError(
      "Enrollment TOTP inválido ou expirado",
      400,
      "INVALID_TOTP_ENROLLMENT"
    );
  }

  const verification = await verifyTotpToken({
    secret,
    token: args.token,
  });
  if (!verification.valid) {
    throw new HttpError("Código TOTP inválido", 400, "INVALID_TOTP");
  }

  const recoveryCodes = generateRecoveryCodes(RECOVERY_CODE_COUNT);
  const activatedAt = new Date();

  await prisma.$transaction(async (tx) => {
    const activation = await tx.user.updateMany({
      where: {
        id: args.userId,
        totpEnabled: false,
        totpSecretEncrypted: null,
        totpActivatedAt: null,
        totpLastUsedStep: null,
      },
      data: {
        totpEnabled: true,
        totpSecretEncrypted: enrollment.secretEnvelope,
        totpActivatedAt: activatedAt,
        totpLastUsedStep: verification.timeStep,
      },
    });

    if (activation.count !== 1) {
      throw new HttpError(
        "2FA já foi ativado ou o estado mudou",
        409,
        "TOTP_ENROLLMENT_CONFLICT"
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
    activatedAt,
    recoveryCodes,
  };
}
