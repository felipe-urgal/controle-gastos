import bcrypt from "bcryptjs";

import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { sendEmailVerification } from "@/app/lib/auth/auth-email";
import { signEmailVerificationToken } from "@/app/lib/auth/email-verification-token";
import { hashPassword } from "@/app/lib/auth/password-policy";
import { HttpError } from "@/app/lib/http-error";
import { prisma } from "@/app/lib/prisma";
import { consumeStepUpRateLimit } from "@/app/lib/security/step-up-auth";
import { updateUserSchema } from "@/app/lib/users/user-schema";

export const userCrud = baseCrudHandler({
  model: (db) => db.user,
  entityName: "Usuário",
  createSchema: updateUserSchema,
  updateSchema: updateUserSchema,
  selfRoute: true,
  include: undefined,

  mapper: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerifiedAt: user.emailVerifiedAt,
    showValues: user.showValues,
    totpEnabled: user.totpEnabled,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }),

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

        const nextAuthVersion =
          Number(existing.authVersion ?? 0) + (data.newPassword ? 1 : 0);
        const token = signEmailVerificationToken({
          userId,
          email: formattedEmail,
          kind: "email-change",
          authVersion: nextAuthVersion,
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
