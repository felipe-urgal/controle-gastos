// user.crud.ts
import bcrypt from "bcryptjs";
import { prisma } from "@/app/lib/prisma";
import { baseCrudHandler } from "@/app/lib/api/base-crud-handler";
import { updateUserSchema } from "@/app/schemas/user.schema";

const SALT_ROUNDS = 10;

export const userCrud = baseCrudHandler({
  model: (db) => db.user,
  entityName: "Usuário",

  // create não será usado, mas é obrigatório na tipagem
  createSchema: updateUserSchema,
  updateSchema: updateUserSchema,

  // 🔥 ESSENCIAL
  selfRoute: true,

  // 🔒 Nunca retornar senha
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
    const updateData: any = { ...data };

    // =========================
    // EMAIL
    // =========================
    if (data.email) {
      const formattedEmail = data.email.trim().toLowerCase();

      const emailExists = await prisma.user.findFirst({
        where: {
          email: formattedEmail,
          NOT: { id: userId },
        },
      });

      if (emailExists) {
        throw new Error("E-mail já está em uso");
      }

      updateData.email = formattedEmail;
    }

    // =========================
    // SENHA
    // =========================
    if (data.newPassword) {
      updateData.password = await bcrypt.hash(
        data.newPassword,
        SALT_ROUNDS
      );

      delete updateData.newPassword;
    }

    return updateData;
  },

  async beforeDelete(entity, userId) {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
      await tx.account.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });

      // 🔥 importante: deletar o usuário dentro da mesma transaction
      await tx.user.delete({ where: { id: userId } });
    });
  },
});