import bcrypt from "bcryptjs";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import {
  EMAIL_VERIFICATION_TTL_MS,
  signEmailVerificationToken,
} from "@/app/lib/auth/email-verification-token";
import { sendEmailVerification } from "@/app/lib/auth/auth-email";
import { hashPassword } from "@/app/lib/auth/password-policy";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { consumeStepUpRateLimit } from "@/app/lib/security/step-up-auth";
import { updateUserSchema } from "@/app/lib/users/user-schema";

const baseUserCrud = baseCrudHandler({
  model: (db) => db.user,
  entityName: "Usuário",
  createSchema: updateUserSchema,
  updateSchema: updateUserSchema,
  selfRoute: true,
  include: undefined,

  mapper: (user) => {
    const pendingEmailActive = Boolean(
      user.pendingEmail &&
        user.pendingEmailExpiresAt &&
        user.pendingEmailExpiresAt.getTime() > Date.now(),
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      pendingEmail: pendingEmailActive ? user.pendingEmail : null,
      pendingEmailRequestedAt: pendingEmailActive
        ? user.pendingEmailRequestedAt
        : null,
      pendingEmailExpiresAt: pendingEmailActive
        ? user.pendingEmailExpiresAt
        : null,
      showValues: user.showValues,
      periodicSummaryEnabled: user.periodicSummaryEnabled,
      periodicSummaryFrequency: user.periodicSummaryFrequency,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  },

  async beforeUpdate(data, existing, userId, request) {
    const updateData: Record<string, unknown> = { ...data };
    const changesSensitiveData = Boolean(data.email || data.newPassword);

    if (changesSensitiveData) {
      if (!request) {
        throw new HttpError("Requisição inválida", 400, "INVALID_REQUEST");
      }

      await consumeStepUpRateLimit({ request, userId });

      const passwordMatches = await bcrypt.compare(
        data.currentPassword!,
        existing.password,
      );

      if (!passwordMatches) {
        throw new HttpError(
          "Senha atual inválida",
          401,
          "INVALID_CURRENT_PASSWORD",
        );
      }
    }

    if (data.cancelPendingEmail) {
      updateData.pendingEmail = null;
      updateData.pendingEmailRequestedAt = null;
      updateData.pendingEmailExpiresAt = null;
      updateData.pendingEmailVersion = { increment: 1 };
    }
    delete updateData.cancelPendingEmail;

    if (data.email) {
      const formattedEmail = data.email.trim().toLowerCase();
      delete updateData.email;

      if (formattedEmail !== existing.email) {
        const emailExists = await prisma.user.findFirst({
          where: {
            email: formattedEmail,
            NOT: { id: userId },
          },
          select: { id: true },
        });

        if (emailExists) {
          throw new HttpError("E-mail já está em uso", 409, "EMAIL_IN_USE");
        }

        const now = new Date();
        const nextAuthVersion =
          Number(existing.authVersion ?? 0) + (data.newPassword ? 1 : 0);
        const nextPendingEmailVersion =
          Number(existing.pendingEmailVersion ?? 0) + 1;
        const token = signEmailVerificationToken({
          userId,
          email: formattedEmail,
          kind: "email-change",
          authVersion: nextAuthVersion,
          pendingEmailVersion: nextPendingEmailVersion,
        });

        try {
          await sendEmailVerification({
            to: formattedEmail,
            name: existing.name,
            token,
          });
        } catch {
          throw new HttpError(
            "Não foi possível enviar a confirmação do novo e-mail",
            503,
            "EMAIL_DELIVERY_FAILED",
          );
        }

        updateData.pendingEmail = formattedEmail;
        updateData.pendingEmailRequestedAt = now;
        updateData.pendingEmailExpiresAt = new Date(
          now.getTime() + EMAIL_VERIFICATION_TTL_MS,
        );
        updateData.pendingEmailVersion = { increment: 1 };
      }
    }

    if (data.newPassword) {
      updateData.password = await hashPassword(data.newPassword);
      updateData.authVersion = { increment: 1 };
    }

    delete updateData.currentPassword;
    delete updateData.newPassword;

    return updateData;
  },
});

export const userCrud = {
  getById: baseUserCrud.getById,
  update: baseUserCrud.update,
};
