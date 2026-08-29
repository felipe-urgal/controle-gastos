import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { updateUserSchema } from "@/app/schemas/user.schema";
import { HttpError } from "@/app/lib/http-error";

const SALT_ROUNDS = 10;

export const userCrud = baseCrudHandler({
  model: (db) => db.user,
  entityName: "Usuário",

  // create não será usado, mas é obrigatório na tipagem
  createSchema: updateUserSchema,
  updateSchema: updateUserSchema,

  // A rota /api/user sempre opera sobre o próprio usuário autenticado.
  selfRoute: true,

  // Nunca retornar senha.
  include: undefined,

  mapper: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    showValues: user.showValues,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }),

  async beforeUpdate(data, existing, userId) {
    const updateData: Record<string, unknown> = { ...data };
    const changesSensitiveData = Boolean(data.email || data.newPassword);

    if (changesSensitiveData) {
      const passwordMatches = await bcrypt.compare(
        data.currentPassword!,
        existing.password
      );

      if (!passwordMatches) {
        throw new HttpError(
          "Senha atual inválida",
          401,
          "INVALID_CURRENT_PASSWORD"
        );
      }
    }

    if (data.email) {
      const formattedEmail = data.email.trim().toLowerCase();

      const emailExists = await prisma.user.findFirst({
        where: {
          email: formattedEmail,
          NOT: { id: userId },
        },
      });

      if (emailExists) {
        throw new HttpError("E-mail já está em uso", 409, "EMAIL_IN_USE");
      }

      updateData.email = formattedEmail;
    }

    if (data.newPassword) {
      updateData.password = await bcrypt.hash(data.newPassword, SALT_ROUNDS);
    }

    delete updateData.currentPassword;
    delete updateData.newPassword;

    return updateData;
  },

  // A remoção fica a cargo exclusivamente do baseCrudHandler. As relações
  // pertencentes ao usuário possuem `onDelete: Cascade` no schema do Prisma,
  // evitando o double-delete que fazia uma exclusão concluída terminar em 500.
});
